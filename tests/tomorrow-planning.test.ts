import test from "node:test";
import assert from "node:assert/strict";
import {
  tomorrowPlanningClock,
  planningDismissalKey,
} from "../src/lib/tasks/tomorrow";

test("Planning emphasis starts at 18:00 in the profile timezone", () => {
  assert.deepEqual(
    tomorrowPlanningClock("Asia/Bangkok", new Date("2026-10-26T10:59:00Z")),
    { today: "2026-10-26", tomorrow: "2026-10-27", evening: false },
  );
  assert.equal(
    tomorrowPlanningClock("Asia/Bangkok", new Date("2026-10-26T11:00:00Z"))
      .evening,
    true,
  );
  assert.equal(
    tomorrowPlanningClock("America/New_York", new Date("2026-10-26T11:00:00Z"))
      .evening,
    false,
  );
});
test("Midnight resets the nudge date and tomorrow across month/year boundaries", () => {
  assert.deepEqual(
    tomorrowPlanningClock("Asia/Bangkok", new Date("2026-12-31T16:59:00Z")),
    { today: "2026-12-31", tomorrow: "2027-01-01", evening: true },
  );
  assert.deepEqual(
    tomorrowPlanningClock("Asia/Bangkok", new Date("2026-12-31T17:00:00Z")),
    { today: "2027-01-01", tomorrow: "2027-01-02", evening: false },
  );
  assert.equal(
    tomorrowPlanningClock("Asia/Yangon", new Date("2026-10-31T18:00:00Z"))
      .tomorrow,
    "2026-11-02",
  );
});
test("Dismissal preference keys cannot cross account boundaries", () => {
  assert.notEqual(
    planningDismissalKey("account-a"),
    planningDismissalKey("account-b"),
  );
});
