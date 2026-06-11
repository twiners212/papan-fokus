import { describe, it, expect } from "vitest";
import { getMidPosition } from "../fractional-positioning";

describe("Fractional Positioning", () => {
  it("should return start position if next is not provided", () => {
    expect(getMidPosition(1000, undefined)).toBe(1000 + 1000);
  });

  it("should return end position if prev is not provided", () => {
    expect(getMidPosition(undefined, 1000)).toBe(1000 / 2);
  });

  it("should return mid position when both prev and next are provided", () => {
    expect(getMidPosition(1000, 2000)).toBe(1500);
    expect(getMidPosition(1000, 1001)).toBe(1000.5);
    expect(getMidPosition(1000.5, 1001)).toBe(1000.75);
  });

  it("should default to 1000 for the first item", () => {
    expect(getMidPosition(undefined, undefined)).toBe(1000);
  });
});
