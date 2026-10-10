import { describe, expect, it } from "vitest";
import { transformation } from "./narrative";
import { storyChange } from "./scene-score";

describe("reversible spatial narrative", () => {
  it("starts with existing infrastructure and finishes with the complete conceptual layers", () => {
    expect(transformation(0)).toEqual({
      existing: 1,
      connections: 0,
      park: 0,
      neighbourhood: 0,
    });
    expect(transformation(1)).toEqual({
      existing: 0,
      connections: 1,
      park: 1,
      neighbourhood: 1,
    });
  });
  it("reveals connections before public realm and neighbourhood, without reversing midway", () => {
    let previous = transformation(0);
    for (let i = 1; i <= 100; i++) {
      const next = transformation(i / 100);
      expect(next.existing).toBeLessThanOrEqual(previous.existing);
      expect(next.connections).toBeGreaterThanOrEqual(previous.connections);
      expect(next.park).toBeGreaterThanOrEqual(previous.park);
      expect(next.neighbourhood).toBeGreaterThanOrEqual(previous.neighbourhood);
      expect(next.connections).toBeGreaterThanOrEqual(next.park);
      expect(next.park).toBeGreaterThanOrEqual(next.neighbourhood);
      previous = next;
    }
  });
  it("clamps out-of-range input and does not depend on traversal history", () => {
    expect(transformation(-100)).toEqual(transformation(0));
    expect(transformation(100)).toEqual(transformation(1));
    const forward = Array.from({ length: 21 }, (_, i) =>
      transformation(i / 20),
    );
    const backward = Array.from({ length: 21 }, (_, i) =>
      transformation(1 - i / 20),
    ).reverse();
    forward.forEach((value, index) => {
      Object.keys(value).forEach((key) =>
        expect(value[key as keyof typeof value]).toBeCloseTo(
          backward[index][key as keyof typeof value],
          10,
        ),
      );
    });
  });
  it("keeps existing geography for the site story and completes the future before exploration", () => {
    expect(transformation(storyChange(0.34))).toEqual(transformation(0));
    const publicLife = transformation(storyChange(0.69));
    expect(publicLife.connections).toBe(1);
    expect(publicLife.park).toBeGreaterThan(publicLife.neighbourhood);
    expect(transformation(storyChange(0.93))).toEqual(transformation(1));
  });
});
