import { describe, expect, it } from "vitest";
import {
  scrollProgress,
  scrollRange,
  shouldRescoreViewport,
  storyProgress,
  storyScrollFraction,
} from "./scroll-geometry";

describe("stable phone story geometry", () => {
  it("ignores height-only phone chrome changes and preserves the same score", () => {
    const phone = { width: 390, height: 700 };
    for (const height of [640, 720, 780, 844, 700]) {
      expect(shouldRescoreViewport(phone, { ...phone, height })).toBe(false);
    }
    const distance = scrollRange(5460, phone.height);
    expect(scrollProgress(2380, distance)).toBe(0.5);
  });
  it("rescores an orientation change or real desktop resize", () => {
    expect(
      shouldRescoreViewport(
        { width: 390, height: 844 },
        { width: 844, height: 390 },
      ),
    ).toBe(true);
    expect(
      shouldRescoreViewport(
        { width: 1440, height: 900 },
        { width: 1440, height: 720 },
      ),
    ).toBe(true);
    expect(
      shouldRescoreViewport(
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
      ),
    ).toBe(true);
  });
  it("clamps elastic overscroll without leaving the narrative range", () => {
    const distance = scrollRange(5460, 700);
    expect(scrollProgress(-120, distance)).toBe(0);
    expect(scrollProgress(distance + 120, distance)).toBe(1);
    expect(scrollProgress(0, scrollRange(0, 700))).toBe(0);
  });
  it("gives mobile close views more scroll travel and moves faster between them", () => {
    const travel = (at: number) =>
      storyScrollFraction(at + 0.005, true) -
      storyScrollFraction(at - 0.005, true);
    for (const at of [0.355, 0.475, 0.565, 0.7, 0.84]) {
      expect(travel(at)).toBeGreaterThan(0.019);
    }
    expect(travel(0.24)).toBeLessThan(0.007);
    expect(travel(0.92)).toBeLessThan(0.007);
  });
  it("uses one reversible monotonic mapping for scroll, navigation and resize", () => {
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const at = i / 1000;
      const fraction = storyScrollFraction(at, true);
      expect(fraction).toBeGreaterThan(previous);
      expect(storyProgress(fraction, true)).toBeCloseTo(at, 8);
      expect(storyScrollFraction(at)).toBe(at);
      expect(storyProgress(at)).toBe(at);
      previous = fraction;
    }
    expect(storyProgress(-1, true)).toBe(0);
    expect(storyProgress(2, true)).toBe(1);
    // Smooth speed across the edges and centres of the slower windows.
    for (const at of [
      0.3, 0.355, 0.41, 0.44, 0.475, 0.51, 0.53, 0.565, 0.6, 0.645, 0.7, 0.755,
      0.785, 0.84, 0.895,
    ]) {
      const step = 0.00001;
      const before =
        (storyScrollFraction(at, true) - storyScrollFraction(at - step, true)) /
        step;
      const after =
        (storyScrollFraction(at + step, true) - storyScrollFraction(at, true)) /
        step;
      expect(Math.abs(before - after)).toBeLessThan(0.001);
    }
  });
});
