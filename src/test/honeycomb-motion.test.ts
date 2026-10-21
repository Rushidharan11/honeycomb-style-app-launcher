import { describe, expect, it } from "vitest";
import { panWithFinger, wrapCoordinate } from "@/lib/honeycomb-motion";

describe("thumb-following honeycomb", () => {
  it("brings an app from the top-left to the thumb in both axes", () => {
    const movement = panWithFinger({ x: 0, y: 0 }, { x: 30, y: 70 }, { x: 260, y: 510 });
    expect({ x: 30 + movement.x, y: 70 + movement.y }).toEqual({ x: 260, y: 510 });
  });

  it("moves left and up with the finger as well", () => {
    expect(panWithFinger({ x: 12, y: 18 }, { x: 260, y: 510 }, { x: 30, y: 70 })).toEqual({ x: -218, y: -422 });
  });

  it("wraps in either direction without an unreachable edge", () => {
    expect(wrapCoordinate(400, 378)).toBe(22);
    expect(wrapCoordinate(-20, 378)).toBe(358);
  });
});