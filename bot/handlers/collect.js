import { InlineKeyboard } from 'grammy';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  getNextRefId,
  getRefCount,
  checkDuplicateUrl,
  saveReference,
  updateRefScreenshots,
} from '../lib/reference.js';
import { captureUrl } from '../../scripts/capture.js';

// 진행 중인 수집 세션 (userId -> state)
const sessions = new Map();

const MEDIA = ['웹앱', 'PPT', '문서', '기타'];
const PURPOSES = ['대시보드', '랜딩페이지', '발표', '보고서', '기타'];

function mediumKeyboard() {
  const kb = new InlineKeyboard();
  MEDIA.forEach(m => kb.text(m, `medium:${m}`));
  return kb;
}

function purposeKeyboard() {
  const kb = new InlineKeyboard();
  PURPOSES.forEach(p => kb.text(p, `purpose:${p}`));
  return kb;
}

function verdictKeyboard() {
  return new InlineKeyboard()
    .text('👍 좋다', 'verdict:like')
    .text('👎 싫다', 'verdict:dislike');
}

// URL 감지
const URL_REGEX = /https?:\/\/[^\s]+/;

export function registerCollectHandlers(bot) {
  // 텍스트 메시지 (URL 포함 여부 확인)
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const urlMatch = text.match(URL_REGEX);

    if (!urlMatch) {
      await ctx.reply('URL 또는 이미지를 보내주세요.');
      return;
    }

    const url = urlMatch[0];

    // 중복 체크
    const dup = await checkDuplicateUrl(url);
    if (dup) {
      await ctx.reply(`이미 저장된 URL입니다 (${dup}). 새 URL을 보내주세요.`);
      return;
    }

    sessions.set(ctx.from.id, { url, type: 'url' });
    await ctx.reply('매체를 선택하세요:', { reply_markup: mediumKeyboard() });
  });

  // 이미지 수신
  bot.on('message:photo', async (ctx) => {
    const photo = ctx.message.photo;
    const largest = photo[photo.length - 1]; // 가장 큰 해상도
    const file = await ctx.api.getFile(largest.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    sessions.set(ctx.from.id, { imageFileUrl: fileUrl, type: 'image' });
    await ctx.reply('매체를 선택하세요:', { reply_markup: mediumKeyboard() });
  });

  // 문서/파일 수신
  bot.on('message:document', async (ctx) => {
    const doc = ctx.message.document;
    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    sessions.set(ctx.from.id, {
      imageFileUrl: fileUrl,
      type: 'file',
      fileName: doc.file_name,
    });
    await ctx.reply('매체를 선택하세요:', { reply_markup: mediumKeyboard() });
  });

  // 콜백 쿼리 처리
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const session = sessions.get(userId);

    if (!session) {
      await ctx.answerCallbackQuery({ text: '세션이 만료되었습니다. 다시 보내주세요.' });
      return;
    }

    // 매체 선택
    if (data.startsWith('medium:')) {
      session.medium = data.replace('medium:', '');
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(`매체: ${session.medium}\n용도를 선택하세요:`, {
        reply_markup: purposeKeyboard(),
      });
      return;
    }

    // 용도 선택
    if (data.startsWith('purpose:')) {
      session.purpose = data.replace('purpose:', '');
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `매체: ${session.medium} | 용도: ${session.purpose}\n판정을 선택하세요:`,
        { reply_markup: verdictKeyboard() }
      );
      return;
    }

    // 판정
    if (data.startsWith('verdict:')) {
      const verdict = data.replace('verdict:', '');
      await ctx.answerCallbackQuery();

      const id = `ref-${await getNextRefId()}`;

      await ctx.editMessageText(
        `매체: ${session.medium} | 용도: ${session.purpose} | 판정: ${verdict === 'like' ? '👍' : '👎'}\n저장 중...`
      );

      // 레퍼런스 저장
      const refDir = await saveReference({
        id,
        url: session.url,
        imagePath: session.imageFileUrl,
        verdict,
        context: { medium: session.medium, purpose: session.purpose },
      });

      // URL이면 Puppeteer 캡쳐
      let captureResult = { files: [] };
      if (session.type === 'url' && session.url) {
        const screenshotsDir = join(refDir, 'screenshots');
        captureResult = await captureUrl(session.url, screenshotsDir);
        if (captureResult.files.length > 0) {
          await updateRefScreenshots(id, captureResult.files);
        }
      }

      // 이미지/파일이면 다운로드 저장
      if (session.imageFileUrl) {
        try {
          const res = await fetch(session.imageFileUrl);
          const buffer = Buffer.from(await res.arrayBuffer());
          const ext = session.fileName
            ? session.fileName.split('.').pop()
            : 'png';
          const filename = `original.${ext}`;
          const screenshotsDir = join(refDir, 'screenshots');
          await mkdir(screenshotsDir, { recursive: true });
          await writeFile(join(screenshotsDir, filename), buffer);
          await updateRefScreenshots(id, [filename]);
        } catch (e) {
          // 다운로드 실패 시 무시
        }
      }

      const count = await getRefCount();
      const level = count >= 5 ? 'Lv.1' : 'Lv.0';
      const captureNote =
        captureResult.files.length > 0
          ? ` (${captureResult.files.length}종 캡쳐)`
          : session.type !== 'url'
            ? ' (원본 저장)'
            : ' (캡쳐 실패 - 직접 스크린샷을 보내주세요)';

      await ctx.editMessageText(
        `저장 완료 ✓ ${id}${captureNote}\n현재 레퍼런스 ${count}개, ${level}`
      );

      sessions.delete(userId);
    }
  });
}
