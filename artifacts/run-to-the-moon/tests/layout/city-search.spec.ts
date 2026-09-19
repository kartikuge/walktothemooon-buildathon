import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`City to City keeps both search rows usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const unexpectedRequests: string[] = [];
    // Never send API traffic to a real backend, including accidental writes.
    await page.route("**/api/**", async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const fixtures: Record<string, unknown> = {
        "/api/moon/profile": { teams: [], routes: [] },
        "/api/moon/state": { users: [], journeys: [] },
        "/api/moon/activity/1": {},
      };
      if (request.method() !== "GET" || !(pathname in fixtures)) {
        unexpectedRequests.push(`${request.method()} ${pathname}`);
        await route.abort();
        return;
      }
      await route.fulfill({ json: fixtures[pathname] });
    });
    await page.addInitScript(() => localStorage.setItem("moon_user_id", "1"));
    await page.goto("/maps/add");
    await page.getByRole("tab", { name: "City to City", exact: true }).click();

    for (const city of ["origin", "destination"]) {
      const input = page.getByLabel(new RegExp(`^${city} city$`, "i"));
      const button = page.getByRole("button", { name: `Search ${city} city`, exact: true });
      await expect(input).toBeVisible();
      await expect(button).toBeVisible();
      await input.fill("A deliberately long city name to expose flex shrinking");
      const row = button.locator("..");
      const dimensions = await row.evaluate(element => {
        const rect = (node: Element) => {
          const { x, y, width, height, right, bottom } = node.getBoundingClientRect();
          return { x, y, width, height, right, bottom };
        };
        return {
          row: rect(element),
          input: rect(element.querySelector("input")!),
          button: rect(element.querySelector("button")!),
          overflow: element.scrollWidth - element.clientWidth,
        };
      });
      const { input: field, button: search, row: bounds } = dimensions;
      // At 320px the available row is ~238px: reserve at least 160px for typing.
      expect(field.width, `${city}: usable input width`).toBeGreaterThanOrEqual(160);
      expect(search.width, `${city}: touch target width`).toBeGreaterThanOrEqual(44);
      expect(search.height, `${city}: touch target height`).toBeGreaterThanOrEqual(44);
      expect(search.width, `${city}: compact inline button`).toBeLessThanOrEqual(56);
      expect(search.height).toBeLessThanOrEqual(56);
      expect(Math.abs(search.y - field.y), `${city}: same row`).toBeLessThanOrEqual(1);
      expect(field.right).toBeLessThanOrEqual(search.x);
      expect(field.x).toBeGreaterThanOrEqual(bounds.x);
      expect(search.right).toBeLessThanOrEqual(bounds.right + 1);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(dimensions.overflow, `${city}: no clipped row overflow`).toBeLessThanOrEqual(1);
    }
    // Probe the real shared default, without the page's explicit w-full overrides.
    const defaultWidth = await page.evaluate(async () => {
      // Vite resolves the component and its aliases in the browser.
      const modulePath = "/src/components/ui/button.tsx";
      const { buttonVariants } = await import(/* @vite-ignore */ modulePath);
      const container = document.createElement("div");
      container.style.width = "240px";
      const button = document.createElement("button");
      button.className = buttonVariants();
      button.textContent = "Primary action";
      container.append(button);
      document.body.append(container);
      const result = button.getBoundingClientRect().width;
      container.remove();
      return result;
    });
    expect(defaultWidth, "shared default Button must remain full-width").toBe(240);
    expect(unexpectedRequests, "layout check must not write data or call unmocked APIs").toEqual([]);
  });
}