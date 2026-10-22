import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, transition, available, restore } from "../lib/engine.mjs";
test("new report trims input and starts unassigned", () => {
  let s = transition(seed(), {
    type: "report",
    data: { title: " Test ", location: " Zone ", severity: "HIGH", people: 4 },
  });
  assert.equal(s.incidents[0].title, "Test");
  assert.equal(s.incidents[0].status, "REPORTED");
  assert.equal(s.incidents[0].teamId, null);
});
test("invalid input rejected", () => {
  for (const people of [0, -1, 1.5, 100001, NaN])
    assert.throws(() =>
      transition(seed(), {
        type: "report",
        data: { title: "A", location: "B", severity: "HIGH", people },
      }),
    );
  assert.throws(() =>
    transition(seed(), {
      type: "report",
      data: { title: " ", location: "B", severity: "HIGH", people: 1 },
    }),
  );
});
test("viewer cannot mutate any workflow", () => {
  for (const type of ["report", "dispatch", "allocate", "advance"])
    assert.throws(
      () => transition(seed(), { type, id: "INC-1001" }, "VIEWER"),
      /read-only/,
    );
});
test("double dispatch fails without changing original", () => {
  const s = transition(seed(), {
    type: "dispatch",
    id: "INC-1001",
    data: { teamId: "T-01" },
  });
  const before = JSON.stringify(s);
  assert.throws(
    () =>
      transition(s, {
        type: "dispatch",
        id: "INC-1002",
        data: { teamId: "T-01" },
      }),
    /already assigned/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("resolution releases the team and cannot be repeated", () => {
  let s = transition(seed(), {
    type: "dispatch",
    id: "INC-1001",
    data: { teamId: "T-01" },
  });
  assert.equal(available(s, "T-01"), false);
  s = transition(s, { type: "advance", id: "INC-1001" });
  assert.equal(s.incidents[0].status, "ON_SITE");
  s = transition(s, { type: "advance", id: "INC-1001" });
  assert.equal(available(s, "T-01"), true);
  assert.throws(() => transition(s, { type: "advance", id: "INC-1001" }));
  assert.throws(() =>
    transition(s, {
      type: "allocate",
      id: "INC-1001",
      data: { resourceId: "R-01", quantity: 1 },
    }),
  );
});
test("cannot skip dispatch stage", () =>
  assert.throws(() => transition(seed(), { type: "advance", id: "INC-1001" })));
test("stock conserved across allocations and cannot become negative", () => {
  let s = transition(seed(), {
    type: "allocate",
    id: "INC-1001",
    data: { resourceId: "R-01", quantity: 230 },
  });
  assert.equal(s.resources[0].stock, 10);
  assert.equal(s.allocations[0].quantity, 230);
  assert.throws(() =>
    transition(s, {
      type: "allocate",
      id: "INC-1002",
      data: { resourceId: "R-01", quantity: 11 },
    }),
  );
  s = transition(s, {
    type: "allocate",
    id: "INC-1002",
    data: { resourceId: "R-01", quantity: 10 },
  });
  assert.equal(s.resources[0].stock, 0);
});
test("unknown entity and action fail", () => {
  assert.throws(() =>
    transition(seed(), {
      type: "dispatch",
      id: "missing",
      data: { teamId: "T-01" },
    }),
  );
  assert.throws(() =>
    transition(seed(), {
      type: "dispatch",
      id: "INC-1001",
      data: { teamId: "missing" },
    }),
  );
  assert.throws(() => transition(seed(), { type: "unknown", id: "INC-1001" }));
});
test("malformed storage and incompatible schema recover", () => {
  assert.equal(restore("garbage").incidents.length, 3);
  assert.equal(restore('{"schema":2}').teams.length, 3);
  let s = seed();
  assert.deepEqual(restore(JSON.stringify({ schema: 1, state: s })), s);
});
