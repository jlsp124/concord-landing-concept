import { describe, expect, it } from "vitest";
import { beatAt, cameraAt, storyChange } from "./scene-score";

describe("geographic film continuity", () => {
  it("holds existing context until reconnection and completes change before exploration", () => {
    expect(storyChange(0.38)).toBe(0);
    expect(storyChange(0.89)).toBe(1);
    expect(beatAt(0.34)).toBe(2);
    expect(beatAt(0.52)).toBe(3);
    expect(beatAt(0.69)).toBe(4);
    expect(beatAt(0.83)).toBe(5);
  });
  it("keeps the camera above the ground and on the same side of the site without sudden cuts", () => {
    for (const mobile of [false, true]) {
      let previous = cameraAt(0, mobile);
      for (let i = 1; i <= 1000; i++) {
        const next = cameraAt(i / 1000, mobile);
        expect(next.position[1]).toBeGreaterThan(140);
        expect(next.position[2]).toBeGreaterThan(next.target[2]);
        expect(next.position.flat().every(Number.isFinite)).toBe(true);
        const displacement = Math.hypot(
          ...next.position.map((v, j) => v - previous.position[j]),
        );
        expect(displacement).toBeLessThan(20);
        previous = next;
      }
    }
  });
  it("reverses along the same camera path and clamps browser scroll overshoot", () => {
    expect(cameraAt(-1)).toEqual(cameraAt(0));
    expect(cameraAt(2)).toEqual(cameraAt(1));
    for (let i = 0; i <= 100; i++) {
      const forward = cameraAt(i / 100);
      const backward = cameraAt(1 - (100 - i) / 100);
      forward.position.forEach((v, j) =>
        expect(v).toBeCloseTo(backward.position[j], 8),
      );
      forward.target.forEach((v, j) =>
        expect(v).toBeCloseTo(backward.target[j], 8),
      );
    }
  });
  it("keeps the portrait camera geographically aligned while opening its view", () => {
    for (const t of [0, 0.17, 0.34, 0.52, 0.69, 0.83, 1]) {
      const desktop = cameraAt(t),
        phone = cameraAt(t, true);
      expect(phone.target[0]).toBe(desktop.target[0]);
      expect(phone.target[2]).toBe(desktop.target[2]);
      expect(phone.position[1]).toBeGreaterThan(desktop.position[1]);
    }
  });
});
