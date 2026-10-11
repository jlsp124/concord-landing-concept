import { describe, expect, it } from "vitest";
import {
  beatAt,
  cameraAt,
  motionBlend,
  portraitFov,
  storyChange,
} from "./scene-score";

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
  it("varies distance and angle to reveal each subject while keeping the site anchored", () => {
    for (const mobile of [false, true]) {
      const radiusOf = (t: number) => {
        const pose = cameraAt(t, mobile);
        return Math.hypot(...pose.position.map((v, j) => v - pose.target[j]));
      };
      const angles = (t: number) => {
        const pose = cameraAt(t, mobile);
        const offset = pose.position.map((v, j) => v - pose.target[j]);
        return [
          Math.atan2(offset[0], offset[2]),
          Math.asin(offset[1] / radiusOf(t)),
        ];
      };
      let approachRadius = Infinity;
      for (let i = 0; i <= 1000; i++) {
        const pose = cameraAt(i / 1000, mobile);
        const radius = radiusOf(i / 1000);
        if (i <= 340) {
          expect(radius).toBeLessThanOrEqual(approachRadius + 0.000001);
          approachRadius = radius;
        }
        if (i >= 340) {
          expect(radius).toBeGreaterThanOrEqual(radiusOf(0.69) - 0.000001);
          expect(radius).toBeLessThanOrEqual(radiusOf(0.52) + 0.000001);
          expect(pose.target[0]).toBeGreaterThanOrEqual(30 - 0.000001);
          expect(pose.target[0]).toBeLessThanOrEqual(90 + 0.000001);
        }
      }
      // Read the street network wide, enter the park, then reveal the future.
      expect(radiusOf(0.52)).toBeGreaterThan(radiusOf(0.34) * 1.2);
      expect(radiusOf(0.69)).toBeLessThan(radiusOf(0.52) * 0.8);
      expect(radiusOf(0.83)).toBeGreaterThan(radiusOf(0.69) * 1.2);
      expect(angles(0.83)[0] - angles(0.34)[0]).toBeGreaterThan(0.5);
      expect(angles(0.52)[1] - angles(0.69)[1]).toBeGreaterThan(0.18);
    }
  });
  it("preserves opening and exploration framing and continuous velocity at joins", () => {
    const opening = cameraAt(0),
      ending = cameraAt(1);
    [820, 710, 1480].forEach((v, i) =>
      expect(opening.position[i]).toBeCloseTo(v, 7),
    );
    [730, 680, 980].forEach((v, i) =>
      expect(ending.position[i]).toBeCloseTo(v, 7),
    );
    for (const mobile of [false, true]) {
      for (const t of [0.17, 0.34, 0.52, 0.69, 0.83]) {
        const a = cameraAt(t - 0.00001, mobile),
          b = cameraAt(t, mobile),
          c = cameraAt(t + 0.00001, mobile);
        for (let i = 0; i < 3; i++) {
          const before = (b.position[i] - a.position[i]) / 0.00001;
          const after = (c.position[i] - b.position[i]) / 0.00001;
          expect(Math.abs(before - after)).toBeLessThan(5);
        }
      }
    }
  });
  it("smooths touch updates without overshoot and gives equivalent travel at 60 and 120Hz", () => {
    const settle = (hz: number) => {
      let progress = 0;
      for (let i = 0; i < hz; i++) {
        const next = progress + (1 - progress) * motionBlend(1000 / hz);
        expect(next).toBeGreaterThanOrEqual(progress);
        expect(next).toBeLessThanOrEqual(1);
        progress = next;
      }
      return progress;
    };
    expect(settle(60)).toBeCloseTo(settle(120), 12);
    expect(motionBlend(0)).toBe(0);
    let progress = 0.9;
    for (let i = 0; i < 60; i++) {
      const next = progress + (0.2 - progress) * motionBlend(1000 / 120);
      expect(next).toBeLessThanOrEqual(progress);
      expect(next).toBeGreaterThanOrEqual(0.2);
      progress = next;
    }
  });
  it("holds horizontal framing as phone browser chrome changes the visible height", () => {
    const width = 390,
      frameHeight = 720;
    const horizontalTangent =
      (Math.tan((43 * Math.PI) / 360) * width) / frameHeight;
    for (const height of [640, 700, 720, 780, 844]) {
      const adjusted = portraitFov(43, height, frameHeight);
      expect(
        (Math.tan((adjusted * Math.PI) / 360) * width) / height,
      ).toBeCloseTo(horizontalTangent, 12);
    }
    expect(portraitFov(43, frameHeight, frameHeight)).toBeCloseTo(43, 12);
  });
});
