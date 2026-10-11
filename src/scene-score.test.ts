import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { lenses, routes, sceneLabels, transformation } from "./narrative";
import { pathDistance } from "./scene-geometry";
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
    expect(transformation(storyChange(0.565)).connections).toBeGreaterThan(
      0.95,
    );
    expect(transformation(storyChange(0.7)).park).toBeGreaterThan(0.95);
    expect(transformation(storyChange(0.84)).neighbourhood).toBeGreaterThan(
      0.9,
    );
    let previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const change = storyChange(i / 1000);
      expect(change).toBeGreaterThanOrEqual(previous);
      expect(change).toBeLessThanOrEqual(1);
      previous = change;
    }
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
    for (const t of [0, 0.17, 0.355, 0.475, 0.565, 0.7, 0.84, 1]) {
      const desktop = cameraAt(t),
        phone = cameraAt(t, true);
      expect(phone.target[0]).toBe(desktop.target[0]);
      expect(phone.target[2]).toBe(desktop.target[2]);
      expect(phone.position[1]).toBeGreaterThan(desktop.position[1]);
    }
  });
  it("approaches the district, then changes scale and viewing angle around its important places", () => {
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
        const radius = radiusOf(i / 1000);
        if (i <= 355) {
          expect(radius).toBeLessThanOrEqual(approachRadius + 0.000001);
          approachRadius = radius;
        }
      }
      expect(radiusOf(0.475)).toBeGreaterThan(radiusOf(0.355) * 1.1);
      expect(radiusOf(0.565)).toBeLessThan(radiusOf(0.475) * 0.75);
      expect(radiusOf(0.7)).toBeLessThan(radiusOf(0.17) * 0.55);
      expect(angles(0.84)[0] - angles(0.355)[0]).toBeGreaterThan(0.7);
      expect(angles(0.475)[1] - angles(0.7)[1]).toBeGreaterThan(0.2);
    }
  });
  it("aims the close views at the site, connections, landing and park rather than open water", () => {
    const site = cameraAt(0.36).target;
    expect(Math.hypot(site[0] - 110, site[2] + 125)).toBeLessThan(60);
    const connections = cameraAt(0.48).target;
    expect(
      pathDistance([connections[0], connections[2]], routes.dunsmuir),
    ).toBeLessThan(45);
    expect(
      pathDistance([connections[0], connections[2]], routes.carrall),
    ).toBeLessThan(70);
    for (const [at, point] of [
      [0.56, sceneLabels.find((label) => label.id === "georgia")!.point],
      [0.7, lenses.find((lens) => lens.id === "park")!.point],
      [0.84, lenses.find((lens) => lens.id === "life")!.point],
    ] as const) {
      const target = cameraAt(at).target;
      expect(
        Math.hypot(target[0] - point[0], target[2] - point[1]),
      ).toBeLessThan(65);
    }
  });
  it("frames each close-view subject in the scene's clear area on desktop and phone", () => {
    for (const mobile of [false, true]) {
      const width = mobile ? 390 : 1440,
        height = mobile ? 844 : 900;
      for (const [at, x, z] of [
        [0.355, 110, -125],
        [0.475, 165, -285],
        [0.565, -65, -10],
        [0.7, 322, -30],
        [0.84, 90, -145],
      ]) {
        const pose = cameraAt(at, mobile);
        const camera = new PerspectiveCamera(
          pose.fov,
          width / height,
          1,
          10000,
        );
        camera.position.fromArray(pose.position);
        camera.setViewOffset(
          width,
          height,
          mobile ? 0 : -width * 0.12,
          0,
          width,
          height,
        );
        camera.lookAt(new Vector3(...pose.target));
        camera.updateMatrixWorld();
        const subject = new Vector3(x, 0, z).project(camera);
        const screenX = (subject.x + 1) / 2,
          screenY = (1 - subject.y) / 2;
        expect(subject.z).toBeGreaterThan(-1);
        expect(subject.z).toBeLessThan(1);
        expect(screenX).toBeGreaterThan(mobile ? 0.2 : 0.45);
        expect(screenX).toBeLessThan(0.8);
        expect(screenY).toBeGreaterThan(mobile ? 0.53 : 0.4);
        expect(screenY).toBeLessThan(0.76);
      }
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
      for (const t of [0.17, 0.355, 0.475, 0.565, 0.7, 0.84]) {
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
