import type { Page } from "@playwright/test";
import { test, expect, routes } from "./redesign-fixtures";

async function usableControls(page: Page) {
  // Wait for finite entrance/exit animations, not indefinite loading pulses.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // Measure controls themselves: an overflow-hidden shell must not conceal clipping.
  const controls = page.getByRole("button").or(page.getByRole("textbox"))
    .or(page.getByRole("combobox")).or(page.getByRole("spinbutton"));
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    const description = `${page.url()}: ${await control.getAttribute("aria-label") || await control.textContent()}`;
    expect(box!.x, description).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width, description).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(box!.width).toBeGreaterThan(0);
  }
}

const screens: [string, RegExp][] = [
  ["/app", /Today's Target/i], ["/app/maps/add", /Add a Map/i],
  ["/app/teams", /My Teams|Your Teams/i], ["/app/profile", /Fixture Bea/],
  ["/app/journey/map-101", /Fixture Coastal Route/], ["/app/log", /Log a Run/i],
  ["/app/competition", /Teams Race/i], ["/app/planner", /Route Planner/i],
  ["/app/passport", /^Passport$/i], ["/app/stats", /Lifetime Stats/i],
  ["/app/activity", /Activity Profile/i],
  ["/app/completion?miles=3&moon=1237&route=Fixture&emoji=🌙", /Stamp added/i],
];

for (const width of [320, 390, 1280]) {
  test(`primary screens and forms remain usable at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await usableControls(page);
      await page.screenshot({ path: testInfo.outputPath(`${path.split("?")[0].replaceAll("/", "-") || "home"}.png`), fullPage: true });
    }
    await page.goto("/app/teams");
    for (const name of ["Create Team", "Join with Code"]) {
      await page.getByRole("button", { name, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await usableControls(page);
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
}

test("Home retains the Moon hook and discoverable navigation", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByText(/to the moon/i).first()).toBeVisible();
  await expect(page.getByText(/1,234/).first()).toBeVisible();
  for (const name of ["Home", "Maps", "Teams", "Profile"]) {
    await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Log.*Run/i }).first()).toBeVisible();
  await page.getByRole("button", { name: "More navigation" }).click();
  for (const name of [/Compete/i, /Planner/i]) {
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  }
  await page.goto("/app/profile");
  for (const name of [/Passport/i, /Activity Profile/i, /Stats/i]) {
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  }
});

test("server account identity survives reload without a runner switcher", async ({ page, api }) => {
  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: "Fixture Bea" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Switch runner" })).toHaveCount(0);
  expect(api.reads.some(r => r.path === "/api/auth/account")).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fixture Bea" })).toBeVisible();
});

for (const enabled of [false, true]) {
  test(`create team sends explicit leaderboardEnabled=${enabled} and persists`, async ({ page, api }) => {
    api.allowedWrites.add("/api/moon/teams");
    await page.goto("/app/teams");
    await page.getByRole("button", { name: "Create Team", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const toggle = dialog.getByRole("checkbox", { name: "Enable team leaderboard" });
    await expect(toggle).not.toBeChecked();
    if (enabled) await toggle.check();
    await dialog.getByLabel("Team Name", { exact: true }).fill("Fixture Team");
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: new RegExp(routes[0].name) }).click();
    await dialog.getByLabel(/Goal Date|End Date/i).fill("2099-12-31");
    await dialog.getByRole("button", { name: "Launch Team", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(api.writes).toHaveLength(1);
    expect(api.writes[0].body).toMatchObject({ leaderboardEnabled: enabled });
    expect(api.writes[0].body).not.toHaveProperty("userId");
    await page.goto("/app/journey/map-101");
    await page.reload();
    const heading = page.getByRole("heading", { name: /^Challenge leaderboard$/i });
    if (enabled) await expect(heading).toBeVisible();
    else await expect(heading).toHaveCount(0);
  });
}

test("rankings include tied and zero-mile members and isolate maps", async ({ page, api }) => {
  await page.goto("/app/journey/map-101");
  const section = page.getByRole("main").filter({ has: page.getByRole("heading", { name: /^Challenge leaderboard$/i }) });
  await expect(section).toBeVisible();
  await expect(section).toContainText(/Fixture Ada[\s\S]*10\.0[\s\S]*Fixture Bea[\s\S]*10\.0[\s\S]*Fixture Cy[\s\S]*0\.0/);
  await page.goto("/app/journey/map-102");
  await expect(section).toContainText(/Fixture Bea[\s\S]*40\.0[\s\S]*Fixture Ada[\s\S]*1\.0[\s\S]*Fixture Cy[\s\S]*0\.0/);
  expect(api.reads.some(r => r.path.includes("/maps/102/leaderboard"))).toBe(true);
  await expect(section).not.toContainText("10.0");
});

test("logging a fixture run refreshes challenge ranks and shared progress", async ({ page, api }) => {
  api.allowedWrites.add("/api/moon/runs");
  await page.goto("/app/journey/map-101");
  await expect(page.getByRole("heading", { name: /^Challenge leaderboard$/i })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("10.0");
  await page.getByRole("link", { name: /Log.*Run/i }).first().click();
  await page.getByLabel("Distance (mi)", { exact: true }).fill("3");
  await page.getByLabel("Duration (min)", { exact: true }).fill("30");
  await page.getByLabel("Journey", { exact: true }).selectOption("map-101");
  await page.getByRole("button", { name: "Submit Run" }).click();
  await expect(page).toHaveURL("/app");
  expect(api.writes[0].body).toMatchObject({ teamId: 21, mapId: 101, miles: 3 });
  expect(api.writes[0].body).not.toHaveProperty("userId");
  // Client-side link, not a reload: this must invalidate the cached leaderboard.
  await page.getByRole("link").filter({ has: page.getByRole("heading", { name: routes[0].name }) }).first().click();
  await expect(page.getByRole("main").filter({ has: page.getByRole("heading", { name: /^Challenge leaderboard$/i }) }))
    .toContainText(/Fixture Bea[\s\S]*13\.0[\s\S]*Fixture Ada[\s\S]*10\.0/);
  await expect(page.getByText(/23\.0/).first()).toBeVisible();
});

test("empty and failed teams states retain recovery controls", async ({ page, api }) => {
  api.empty = true;
  await page.goto("/app/teams");
  await expect(page.getByRole("button", { name: "Create Team", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join with Code", exact: true })).toBeVisible();
  api.profileError = true;
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible({ timeout: 15000 });
});

test("loading state remains usable before fixture responses arrive", async ({ page, api }) => {
  api.delay = 800;
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/app/teams");
  await expect(page.getByText("Loading teams...", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Team", exact: true })).toBeVisible();
  await usableControls(page);
});