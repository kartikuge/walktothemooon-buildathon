import { expect, test as base, type Page } from "@playwright/test";

// Deliberately synthetic, in-browser data only. No request may reach the API.
export const runners = [
  { id: 1, name: "Fixture Ada", avatarEmoji: "🌙", restDays: [] },
  { id: 2, name: "Fixture Bea", avatarEmoji: "🚀", restDays: [] },
  { id: 3, name: "Fixture Cy", avatarEmoji: "⭐", restDays: [] },
];
const route = (id: number, name: string) => ({
  id, name, type: "preset", totalMiles: 100, emoji: "🏁",
  gradientFrom: "#1255ee", gradientTo: "#5988ff",
});
export const routes = [route(11, "Fixture Coastal Route"), route(12, "Fixture Mountain Route")];

export class FixtureApi {
  unexpected: string[] = [];
  reads: { path: string; userId: string | null }[] = [];
  writes: { path: string; body: Record<string, unknown> }[] = [];
  allowedWrites = new Set<string>();
  enabled = true;
  empty = false;
  profileError = false;
  delay = 0;
  addedMiles = 0;

  journeys() {
    return routes.map((r, index) => ({
      ...r, id: `map-${101 + index}`, mapId: 101 + index, routeId: r.id,
      teamId: 21, teamName: "Fixture Team", miles: index ? 41 : 20 + this.addedMiles,
      remainingMiles: index ? 59 : 80 - this.addedMiles, daysRemaining: 100,
      dailyTarget: 1, memberCount: 3, topContributor: "Fixture Ada",
      endDate: "2099-12-31", completed: false, leaderboardEnabled: this.enabled,
    }));
  }

  async install(page: Page) {
    await page.addInitScript(() => {
      if (!localStorage.getItem("moon_user_id")) localStorage.setItem("moon_user_id", "2");
    });
    await page.route("**/api/**", async intercepted => {
      const request = intercepted.request();
      const url = new URL(request.url());
      const path = url.pathname;
      if (this.delay) await new Promise(resolve => setTimeout(resolve, this.delay));
      if (request.method() !== "GET") {
        if (!this.allowedWrites.has(path)) {
          this.unexpected.push(`${request.method()} ${path}`);
          await intercepted.abort();
          return;
        }
        const body = request.postDataJSON();
        this.writes.push({ path, body });
        if (path === "/api/moon/teams") {
          this.enabled = body.leaderboardEnabled === true;
          await intercepted.fulfill({ json: {
            id: 21, name: body.name, inviteCode: "FIX123", routeId: body.routeId,
            endDate: body.endDate, leaderboardEnabled: this.enabled,
          } });
          return;
        }
        if (path === "/api/moon/runs") {
          this.addedMiles += Number(body.miles);
          await intercepted.fulfill({ json: {
            milesAdded: body.miles, moonMiles: 1234 + this.addedMiles,
            completed: false, routeName: routes[0].name, emoji: "🏁",
          } });
          return;
        }
      } else {
        this.reads.push({ path, userId: url.searchParams.get("userId") });
        if (path === "/api/moon/state") {
          await intercepted.fulfill({ json: {
            users: runners, moonMiles: 1234 + this.addedMiles, moonGoal: 238855,
            journeys: this.empty ? [] : this.journeys(), dailyTarget: 1, restDay: false,
            stamps: [], competition: { name: "Fixture Race", endDate: "2099-12-31", teams: this.journeys() },
          } });
          return;
        }
        if (path === "/api/moon/profile") {
          await intercepted.fulfill(this.profileError
            ? { status: 503, json: { error: "Fixture profile unavailable" } }
            : { json: {
              routes, stamps: [], totalMiles: 20, totalMinutes: 200, longestRun: 5,
              mapsCompleted: 0, currentStreak: 2, restDays: [],
              teams: this.empty ? [] : [{
                id: 21, name: "Fixture Team", inviteCode: "FIX123",
                routeId: 11, endDate: "2099-12-31", leaderboardEnabled: this.enabled,
              }],
            } });
          return;
        }
        if (/^\/api\/moon\/activity\/[123]$/.test(path)) {
          await intercepted.fulfill({ json: {
            userId: Number(path.split("/").pop()), configured: true, homeCity: null,
            dailyMiles: 1, restDays: [], commuteMiles: 0, commuteDays: [], sessions: [], weeklyMiles: 7,
          } });
          return;
        }
        const match = path.match(/^\/api\/moon\/teams\/21\/maps\/(101|102)\/leaderboard$/);
        if (match) {
          const mapId = Number(match[1]);
          const miles = mapId === 101 ? [10, 10 + this.addedMiles, 0] : [1, 40, 0];
          const members = runners.map((runner, index) => ({ ...runner, userId: runner.id, miles: miles[index] }))
            .sort((a, b) => b.miles - a.miles || a.userId - b.userId)
            .map((member, index) => ({ ...member, rank: index + 1 }));
          await intercepted.fulfill({ json: {
            teamId: 21, mapId, leaderboardEnabled: this.enabled, members: this.enabled ? members : [],
          } });
          return;
        }
      }
      this.unexpected.push(`${request.method()} ${path}`);
      await intercepted.abort();
    });
  }
}

export const test = base.extend<{ api: FixtureApi }>({
  api: [async ({ page }, use) => {
    const api = new FixtureApi();
    await api.install(page);
    await use(api);
    expect(api.unexpected, "All API traffic must use explicitly allowed fixtures, never live data").toEqual([]);
  }, { auto: true }],
});
export { expect };