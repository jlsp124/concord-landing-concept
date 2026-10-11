import { describe, expect, it } from "vitest";
import {
  scrollProgress,
  scrollRange,
  shouldRescoreViewport,
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
});
