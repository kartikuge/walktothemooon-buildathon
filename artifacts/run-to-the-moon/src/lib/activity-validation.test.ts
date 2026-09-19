import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateActivityProfile } from './activity-validation.ts';

describe('validateActivityProfile', () => {
  it('should validate a correct profile', () => {
    const { isValid, errors } = validateActivityProfile({
      dailyMiles: "2.5",
      commuteMiles: "1",
      commuteDays: [1, 2],
      sessions: [
        { id: "1", name: "Long Run", miles: "10", days: [0] }
      ]
    });
    assert.equal(isValid, true);
    assert.strictEqual(errors.dailyMiles, undefined);
    assert.strictEqual(errors.commuteMiles, undefined);
    assert.deepEqual(errors.sessions, {});
  });

  it('should invalidate empty strings instead of falling back to 0', () => {
    const { isValid, errors } = validateActivityProfile({
      dailyMiles: "",
      commuteMiles: "",
      commuteDays: [],
      sessions: [
        { id: "1", name: "Run", miles: "", days: [1] }
      ]
    });
    assert.equal(isValid, false);
    assert.equal(errors.dailyMiles, "Required");
    assert.equal(errors.commuteMiles, "Required");
    assert.equal(errors.sessions?.["1"]?.miles, "Required");
  });

  it('should enforce limits', () => {
    const { isValid, errors } = validateActivityProfile({
      dailyMiles: "201",
      commuteMiles: "-1",
      commuteDays: [1],
      sessions: [
        { id: "1", name: "", miles: "300", days: [] }
      ]
    });
    assert.equal(isValid, false);
    assert.equal(errors.dailyMiles, "Must be between 0 and 200");
    assert.equal(errors.commuteMiles, "Must be between 0 and 100");
    assert.equal(errors.sessions?.["1"]?.name, "1-80 characters");
    assert.equal(errors.sessions?.["1"]?.miles, ">= 0.01 and <= 200");
    assert.equal(errors.sessions?.["1"]?.days, "Select at least 1 day");
  });

  it('should require commute days if commute miles > 0', () => {
    const { isValid, errors } = validateActivityProfile({
      dailyMiles: "0",
      commuteMiles: "1",
      commuteDays: [],
      sessions: []
    });
    assert.equal(isValid, false);
    assert.equal(errors.commuteDays, "Select days if commute miles > 0");
  });

  it('should allow valid zero commute miles without days', () => {
    const { isValid, errors } = validateActivityProfile({
      dailyMiles: "2",
      commuteMiles: "0",
      commuteDays: [],
      sessions: []
    });
    assert.equal(isValid, true);
    assert.strictEqual(errors.commuteDays, undefined);
  });
});
