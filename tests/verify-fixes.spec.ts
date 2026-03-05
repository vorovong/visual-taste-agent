import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("수정사항 검증", () => {
  test("메인 갤러리 - 카드 렌더링 + 필터 전환 깜빡임 없음", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // 카드가 보여야 함
    const cards = page.locator("a[href^='/ref/']");
    await expect(cards).toHaveCount(2);

    // 필터 전환 - "미평가" 클릭
    const filterBar = page.locator("div").filter({ has: page.locator("button", { hasText: "전체" }) }).first();
    const pendingBtn = filterBar.locator("button", { hasText: "미평가" });
    await pendingBtn.click();
    await page.waitForURL(/verdict=pending/);

    // "로딩 중..." 텍스트가 안 보여야 함 (이전 데이터 유지)
    await page.waitForTimeout(500);
    const loadingText = page.locator("text=로딩 중...");
    expect(await loadingText.count()).toBe(0);

    await page.screenshot({ path: "tests/screenshots/fix-filter-pending.png", fullPage: true });

    // "좋아요" 필터 - 필터바 안의 좋아요 버튼만 클릭
    const likeBtn = filterBar.locator("button", { hasText: "좋아요" });
    await likeBtn.click();
    await page.waitForURL(/verdict=like/);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "tests/screenshots/fix-filter-like.png", fullPage: true });
  });

  test("상세 페이지 - 삭제 버튼 존재", async ({ page }) => {
    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");

    // 좋아요, 싫어요, 삭제 3개 버튼 확인
    const verdictSection = page.locator("div").filter({ hasText: /^평가$/ }).first();
    const likeBtn = page.locator("button", { hasText: "좋아요" });
    const dislikeBtn = page.locator("button", { hasText: "싫어요" });
    const deleteBtn = page.locator("button", { hasText: "삭제" });

    expect(await likeBtn.count()).toBeGreaterThan(0);
    expect(await dislikeBtn.count()).toBeGreaterThan(0);
    expect(await deleteBtn.count()).toBeGreaterThan(0);

    await page.screenshot({ path: "tests/screenshots/fix-detail-verdict.png", fullPage: true });
  });

  test("상세 페이지 모바일 - 헤더 오버플로우 없음", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");

    // 헤더가 넘치지 않는지 확인
    const header = page.locator("header");
    const headerBox = await header.boundingBox();
    expect(headerBox!.width).toBeLessThanOrEqual(375);

    await page.screenshot({ path: "tests/screenshots/fix-detail-mobile-header.png", fullPage: true });
    await ctx.close();
  });

  test("상세 페이지 모바일 - 뷰포트 탭 모두 보임", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");

    const desktopTab = page.locator("button", { hasText: "Desktop" });
    const tabletTab = page.locator("button", { hasText: "Tablet" });
    const mobileTab = page.locator("button", { hasText: "Mobile" });

    expect(await desktopTab.isVisible()).toBe(true);
    expect(await tabletTab.isVisible()).toBe(true);
    expect(await mobileTab.isVisible()).toBe(true);

    await ctx.close();
  });

  test("verdict 토글 동작", async ({ page }) => {
    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");

    // 현재 like 상태 -> 클릭하면 null로
    const likeBtn = page.locator("button", { hasText: "좋아요" }).first();
    // like 버튼이 활성 상태인지 확인 (emerald 배경)
    await expect(likeBtn).toHaveClass(/bg-emerald-600/);

    // 클릭해서 해제
    await likeBtn.click();
    await page.waitForTimeout(300);
    await expect(likeBtn).not.toHaveClass(/bg-emerald-600/);

    // 다시 클릭해서 활성화
    await likeBtn.click();
    await page.waitForTimeout(300);
    await expect(likeBtn).toHaveClass(/bg-emerald-600/);
  });

  test("해시태그 추가/삭제 동작", async ({ page }) => {
    await page.goto(`${BASE}/ref/2`);
    await page.waitForLoadState("networkidle");

    // 태그 입력
    const tagInput = page.locator("input[placeholder*='태그']");
    await tagInput.fill("볼드");
    await tagInput.press("Enter");
    await page.waitForTimeout(500);

    // 태그가 추가되었는지 확인
    const addedTag = page.locator("text=#볼드");
    await expect(addedTag).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/fix-hashtag-added.png", fullPage: true });

    // 태그 삭제
    const removeBtn = page.locator("span").filter({ hasText: "#볼드" }).locator("button");
    await removeBtn.click();
    await page.waitForTimeout(500);

    // 태그가 사라졌는지 확인
    expect(await page.locator("span").filter({ hasText: "#볼드" }).count()).toBe(0);
  });

  test("카드 quick verdict 동작 (미평가 카드에서)", async ({ page }) => {
    // ref 1을 미평가로 만들기
    await fetch(`${BASE}/api/references/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: null }),
    });

    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // 미평가 카드에 hover
    const card = page.locator("a[href='/ref/1']");
    await card.hover();
    await page.waitForTimeout(300);

    await page.screenshot({ path: "tests/screenshots/fix-card-hover.png", fullPage: true });

    // 좋아요 버튼 클릭 (카드 내부의 것)
    const quickLike = card.locator("button", { hasText: "좋아요" });
    if (await quickLike.isVisible()) {
      await quickLike.click();
      await page.waitForTimeout(500);
    }

    // verdict 복원
    await fetch(`${BASE}/api/references/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: "like" }),
    });
  });
});
