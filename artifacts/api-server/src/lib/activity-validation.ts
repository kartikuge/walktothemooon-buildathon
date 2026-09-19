import { SaveActivityProfileBody } from "@workspace/api-zod";

/** Keep the generated shape validation, with actionable messages at the API boundary. */
export function parseActivityProfile(body: unknown) {
  const parsed = SaveActivityProfileBody.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map(issue => {
      const [field, index, child] = issue.path;
      if (field === "dailyMiles") return "Baseline miles must be a number from 0 to 200.";
      if (field === "commuteMiles") return "Commute miles must be a number from 0 to 100.";
      if (field === "homeCity") return "Choose a home city from the search results, or clear it.";
      if (field === "restDays" || field === "commuteDays") return `Choose valid weekdays for ${field === "restDays" ? "baseline rest days" : "commuting"}.`;
      if (field === "sessions" && typeof index === "number") {
        const prefix = `Session ${index + 1}: `;
        if (child === "name") return prefix + "enter a name of 1 to 80 characters.";
        if (child === "miles") return prefix + "miles must be a number from 0.01 to 200.";
        if (child === "days") return prefix + "choose at least one valid weekday.";
        return prefix + "invalid session identifier.";
      }
      if (field === "sessions") return "Use no more than 20 scheduled sessions.";
      return "Enter a complete activity profile.";
    });
    throw Object.assign(new Error([...new Set(messages)].join(" ")), { status: 400 });
  }
  const profile = parsed.data;
  const fail = (message: string): never => { throw Object.assign(new Error(message), { status: 400 }); };
  const unique = (days: number[]) => new Set(days).size === days.length;
  if (!unique(profile.restDays) || !unique(profile.commuteDays)) fail("Choose each weekday only once.");
  if (profile.commuteMiles > 0 && profile.commuteDays.length === 0) fail("Choose at least one commute day, or set commute miles to 0.");
  profile.sessions.forEach((session, index) => {
    session.name = session.name.trim();
    if (!session.name) fail(`Session ${index + 1}: enter a name of 1 to 80 characters.`);
    if (!unique(session.days)) fail(`Session ${index + 1}: choose each weekday only once.`);
  });
  if (new Set(profile.sessions.map(session => session.id)).size !== profile.sessions.length) fail("Session identifiers must be unique. Remove the duplicate session and add it again.");
  return profile;
}