import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("전체 페이지 E2E 점검", () => {
  test("로그인 페이지", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator("h1")).toContainText("Visual Taste Agent");
    await expect(page.locator("button")).toContainText("Google로 로그인");
    const errors = await page.evaluate(() =>
      (window as any).__NEXT_DATA__?.err || null
    );
    console.log("Login page errors:", errors);
    await page.screenshot({ path: "tests/screenshots/login.png", fullPage: true });
  });

  test("메인 갤러리 페이지", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // 콘솔 에러 수집
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // 기본 구조 확인
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/main.png", fullPage: true });

    // 대시보드 존재 확인
    const dashboard = page.locator("text=대시보드");
    const hasDashboard = await dashboard.count();
    console.log("Dashboard visible:", hasDashboard > 0);

    // 필터바 확인
    const filterButtons = page.locator("button", { hasText: /전체|미평가|좋아요|싫어요/ });
    const filterCount = await filterButtons.count();
    console.log("Filter buttons:", filterCount);

    // 카드 확인
    const cards = page.locator("a[href^='/ref/']");
    const cardCount = await cards.count();
    console.log("Reference cards:", cardCount);

    // 에러 출력
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
  });

  test("메인 갤러리 - 필터 동작", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // 미평가 필터
    const pendingBtn = page.locator("button", { hasText: "미평가" });
    if (await pendingBtn.count() > 0) {
      await pendingBtn.click();
      await page.waitForURL(/verdict=pending/);
      await page.screenshot({ path: "tests/screenshots/filter-pending.png", fullPage: true });
      console.log("Pending filter URL:", page.url());
    }

    // 좋아요 필터
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    const likeBtn = page.locator("button", { hasText: "좋아요" });
    if (await likeBtn.count() > 0) {
      await likeBtn.click();
      await page.waitForURL(/verdict=like/);
      await page.screenshot({ path: "tests/screenshots/filter-like.png", fullPage: true });
      console.log("Like filter URL:", page.url());
    }
  });

  test("상세 페이지 - ref 1", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/detail-1.png", fullPage: true });

    // 기본 구조
    const backLink = page.locator("a", { hasText: "갤러리" });
    console.log("Back link:", await backLink.count() > 0);

    // 뷰포트 탭
    const viewportTabs = page.locator("button", { hasText: /Desktop|Tablet|Mobile/ });
    const tabCount = await viewportTabs.count();
    console.log("Viewport tabs:", tabCount);

    // 스크린샷 이미지
    const img = page.locator("img[src*='screenshots']");
    const imgCount = await img.count();
    console.log("Screenshot images:", imgCount);
    if (imgCount > 0) {
      const src = await img.first().getAttribute("src");
      console.log("First image src:", src);
    }

    // 평가 버튼
    const verdictBtns = page.locator("button", { hasText: /좋아요|싫어요/ });
    console.log("Verdict buttons:", await verdictBtns.count());

    // 태그 입력
    const tagInput = page.locator("input[placeholder*='태그']");
    console.log("Tag input:", await tagInput.count() > 0);

    // 뷰포트 전환 테스트
    const tabletTab = page.locator("button", { hasText: "Tablet" });
    if (await tabletTab.count() > 0) {
      await tabletTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/detail-1-tablet.png", fullPage: true });
    }

    const mobileTab = page.locator("button", { hasText: "Mobile" });
    if (await mobileTab.count() > 0) {
      await mobileTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/detail-1-mobile.png", fullPage: true });
    }

    if (consoleErrors.length > 0) {
      console.log("Console errors on detail:", consoleErrors);
    }
  });

  test("상세 페이지 - ref 2", async ({ page }) => {
    await page.goto(`${BASE}/ref/2`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/detail-2.png", fullPage: true });

    const title = await page.locator("header span.text-sm.font-medium").textContent();
    console.log("Detail 2 title:", title);
  });

  test("존재하지 않는 ref", async ({ page }) => {
    const response = await page.goto(`${BASE}/ref/999`);
    console.log("404 page status:", response?.status());
    await page.screenshot({ path: "tests/screenshots/404.png", fullPage: true });
  });

  test("API - references", async ({ request }) => {
    const res = await request.get(`${BASE}/api/references`);
    console.log("API /references status:", res.status());
    const data = await res.json();
    console.log("API /references count:", data.length);
    console.log("API /references[0]:", JSON.stringify(data[0], null, 2));
  });

  test("API - references with filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/references?verdict=like`);
    const data = await res.json();
    console.log("API liked refs:", data.length);

    const resPending = await request.get(`${BASE}/api/references?verdict=pending`);
    const dataPending = await resPending.json();
    console.log("API pending refs:", dataPending.length);
  });

  test("API - single reference", async ({ request }) => {
    const res = await request.get(`${BASE}/api/references/1`);
    console.log("API /references/1 status:", res.status());
    const data = await res.json();
    console.log("API ref 1:", JSON.stringify(data, null, 2));
  });

  test("API - stats", async ({ request }) => {
    const res = await request.get(`${BASE}/api/stats`);
    console.log("API /stats status:", res.status());
    const data = await res.json();
    console.log("API stats:", JSON.stringify(data, null, 2));
  });

  test("API - hashtags", async ({ request }) => {
    const res = await request.get(`${BASE}/api/hashtags`);
    console.log("API /hashtags status:", res.status());
    const data = await res.json();
    console.log("API hashtags:", data);
  });

  test("API - add hashtag to ref 1", async ({ request }) => {
    const res = await request.post(`${BASE}/api/references/1/hashtags`, {
      data: { name: "미니멀" },
    });
    console.log("Add hashtag status:", res.status());
    const data = await res.json();
    console.log("Added hashtag:", data);

    // Verify
    const refRes = await request.get(`${BASE}/api/references/1`);
    const refData = await refRes.json();
    console.log("Ref 1 hashtags after add:", refData.hashtags);
  });

  test("API - update verdict", async ({ request }) => {
    // Create a temp reference to test verdict update
    const refRes = await request.get(`${BASE}/api/references/1`);
    const refData = await refRes.json();
    console.log("Ref 1 current verdict:", refData.verdict);

    // Toggle to dislike
    const patchRes = await request.patch(`${BASE}/api/references/1`, {
      data: { verdict: "dislike" },
    });
    console.log("Patch verdict status:", patchRes.status());
    const patched = await patchRes.json();
    console.log("Patched verdict:", patched.verdict);

    // Restore original
    await request.patch(`${BASE}/api/references/1`, {
      data: { verdict: refData.verdict },
    });
  });

  test("스크린샷 정적 파일 접근", async ({ request }) => {
    const res = await request.get(`${BASE}/screenshots/1/desktop.png`);
    console.log("Screenshot 1/desktop.png status:", res.status());
    console.log("Screenshot content-type:", res.headers()["content-type"]);

    const res2 = await request.get(`${BASE}/screenshots/2/mobile.png`);
    console.log("Screenshot 2/mobile.png status:", res2.status());
  });

  test("모바일 뷰포트 메인 페이지", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/main-mobile.png", fullPage: true });
    await context.close();
  });

  test("모바일 뷰포트 상세 페이지", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/ref/1`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/detail-1-viewport-mobile.png", fullPage: true });
    await context.close();
  });
});
