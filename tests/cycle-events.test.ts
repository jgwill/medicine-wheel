/**
 * The cycle page's moments (#164): an event names itself in words a person
 * reads, and a beat's line carries the title the wheel holds for it — the
 * event itself carries only the id.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@medicine-wheel/events", async () => await import("../src/events/src/index"));

import { buildEvent } from "../src/events/src/index";
import { eventDetail, eventLabel } from "../components/cycle-events";

describe("a cycle's moments, read by a person", () => {
  it("labels an event by its name", () => {
    expect(eventLabel("medicine-wheel.cycle.opened")).toBe("Cycle opened");
    expect(eventLabel("medicine-wheel.chronicle.episode.registered")).toBe("Chronicle episode registered");
  });

  it("joins a beat to its title and says what moved", () => {
    const recorded = buildEvent({ name: "beat.recorded", subject: { kind: "beat", id: "b1" }, payload: { direction: "east", act: 1 } });
    expect(eventDetail(recorded, { b1: "The first turn" })).toBe("“The first turn”");
    const amended = buildEvent({ name: "cycle.amended", subject: { kind: "cycle", id: "c" }, payload: { changed: ["current_direction"], current_direction: "south" } });
    expect(eventDetail(amended, {})).toBe("changed current_direction");
    const witnessed = buildEvent({ name: "beat.witnessed", subject: { kind: "beat", id: "b1" }, payload: { added_witnesses: ["m"] } });
    expect(eventDetail(witnessed, { b1: "The first turn" })).toBe("“The first turn” · 1 witness added");
  });
});
