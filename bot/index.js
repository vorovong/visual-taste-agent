import 'dotenv/config';
import { Bot } from 'grammy';
import { registerCollectHandlers } from './handlers/collect.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN이 .env에 설정되지 않았습니다.');
  process.exit(1);
}

const bot = new Bot(token);

// /start 명령
bot.command('start', (ctx) =>
  ctx.reply(
    'Visual Taste Agent\n\n' +
      'URL, 이미지, 파일을 보내주세요.\n' +
      '매체 → 용도 → 판정(좋다/싫다) 순으로 태깅 후 저장합니다.'
  )
);

// /status 명령
bot.command('status', async (ctx) => {
  const { getRefCount } = await import('./lib/reference.js');
  const count = await getRefCount();
  const level = count >= 5 ? 'Lv.1' : 'Lv.0';
  await ctx.reply(`레퍼런스: ${count}개\n레벨: ${level}`);
});

// 수집 핸들러 등록
registerCollectHandlers(bot);

// 에러 핸들링
bot.catch((err) => {
  console.error('Bot error:', err.message);
});

// 시작
bot.start({
  onStart: () => console.log('Visual Taste Bot 시작됨'),
});
