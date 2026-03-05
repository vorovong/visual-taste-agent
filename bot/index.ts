import "dotenv/config";
import { Bot } from "grammy";
import { count, isNull } from "drizzle-orm";
import { registerCollectHandlers } from "./handlers/collect";
import { runMigrations } from "../lib/db/migrate";
import { db, schema } from "../lib/db/index";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN이 .env에 설정되지 않았습니다.");
  process.exit(1);
}

// DB 초기화
runMigrations();

const bot = new Bot(token);

const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;

// chat_id 화이트리스트
if (ALLOWED_CHAT_ID) {
  bot.use(async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    if (chatId !== ALLOWED_CHAT_ID) {
      return;
    }
    await next();
  });
}

// /start 명령
bot.command("start", (ctx) =>
  ctx.reply(
    "Visual Taste Agent v2\n\n" +
      "URL을 보내주세요. 자동 캡쳐 후 저장됩니다.\n" +
      "평가는 웹앱에서 나중에 하면 됩니다."
  )
);

// /status 명령
bot.command("status", async (ctx) => {
  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.references);

  const [pendingResult] = await db
    .select({ total: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict));

  const total = totalResult.total;
  const level = total >= 20 ? "Lv.2" : total >= 5 ? "Lv.1" : "Lv.0";
  await ctx.reply(
    `레퍼런스: ${total}개 (미평가: ${pendingResult.total}개)\n레벨: ${level}`
  );
});

// 수집 핸들러 등록
registerCollectHandlers(bot);

// 에러 핸들링
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// 시작
bot.start({
  onStart: () => console.log("Visual Taste Bot v2 시작됨"),
});
