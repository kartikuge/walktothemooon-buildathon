import { test } from "node:test";
import assert from "node:assert/strict";
import { parseActivityProfile } from "./activity-validation.ts";
import { activityWeek } from "./effort.ts";

const base = { homeCity: null, dailyMiles: 2, restDays: [0,6], commuteMiles: 1, commuteDays: [1,2,3,4,5], sessions: [{ id: "run", name: " Run ", miles: 5, days: [6] }] };
test("preserves additive schedule and trims names", () => {
  const result = parseActivityProfile(base);
  assert.equal(result.sessions[0].name, "Run");
  assert.deepEqual(activityWeek(result), [0,3,3,3,3,3,5]);
  assert.equal(base.sessions[0].name, " Run ");
});
test("specific numeric errors, never blank coercion", () => {
  for (const value of ["", null, -1, 201, NaN, Infinity]) assert.throws(() => parseActivityProfile({...base,dailyMiles:value}), /Baseline miles/);
  assert.throws(() => parseActivityProfile({...base,commuteMiles:101}), /Commute miles/);
});
test("specific session and missing-day errors", () => {
  for (const name of ["", "   ", "x".repeat(81)]) assert.throws(() => parseActivityProfile({...base,sessions:[{...base.sessions[0],name}]}), /Session 1: enter a name/);
  assert.throws(() => parseActivityProfile({...base,sessions:[{...base.sessions[0],miles:0}]}), /Session 1: miles/);
  assert.throws(() => parseActivityProfile({...base,sessions:[{...base.sessions[0],days:[]}]}), /Session 1: choose/);
  assert.throws(() => parseActivityProfile({...base,commuteDays:[]}), /commute day/);
  assert.doesNotThrow(() => parseActivityProfile({...base,commuteDays:[],commuteMiles:0}));
});
test("rejects duplicate days and IDs", () => {
  assert.throws(() => parseActivityProfile({...base,restDays:[0,0]}), /only once/);
  assert.throws(() => parseActivityProfile({...base,sessions:[base.sessions[0],base.sessions[0]]}), /identifiers must be unique/);
});