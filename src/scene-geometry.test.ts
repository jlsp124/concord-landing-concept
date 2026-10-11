import { describe, expect, it } from "vitest";
import { pathDistance, ribbonVertices } from "./scene-geometry";
import { routes } from "./narrative";

describe("clean route geometry", () => {
  it("joins adjacent route segments along exactly the same edge", () => {
    const vertices = ribbonVertices(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      4,
      2.5,
    );
    expect(vertices.slice(3, 6)).toEqual(vertices.slice(18, 21));
    expect(vertices.slice(15, 18)).toEqual(vertices.slice(24, 27));
  });
  it("keeps sharp and repeated geographic points finite without long mitre spikes", () => {
    for (const points of [
      [
        [0, 0],
        [0, 0],
        [10, 0],
        [0.1, 0.1],
      ],
      ...Object.values(routes),
    ]) {
      const vertices = ribbonVertices(points, 4, 2.5);
      expect(vertices.every(Number.isFinite)).toBe(true);
      for (let i = 0; i < vertices.length; i += 3) {
        expect(vertices[i + 1]).toBe(2.5);
        const distance = Math.min(
          ...points.map(([x, z]) =>
            Math.hypot(x - vertices[i], z - vertices[i + 2]),
          ),
        );
        expect(distance).toBeLessThanOrEqual(4.000001);
      }
    }
    expect(
      ribbonVertices(
        [
          [0, 0],
          [0, 0],
        ],
        4,
        2.5,
      ),
    ).toEqual([]);
  });
  it("measures path clearances including bends, endpoints and repeated nodes", () => {
    expect(
      pathDistance(
        [5, 4],
        [
          [0, 0],
          [10, 0],
        ],
      ),
    ).toBe(4);
    expect(
      pathDistance(
        [-3, 4],
        [
          [0, 0],
          [0, 0],
          [10, 0],
        ],
      ),
    ).toBe(5);
    expect(
      pathDistance(
        [12, 5],
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
      ),
    ).toBe(2);
  });
});
