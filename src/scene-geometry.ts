import type { Point } from "./narrative";

export function pathDistance(point: Point, points: number[][]) {
  let distance = Infinity;
  for (let i = 1; i < points.length; i++) {
    const [x, z] = points[i - 1],
      [endX, endZ] = points[i];
    const dx = endX - x,
      dz = endZ - z;
    const square = dx * dx + dz * dz;
    const t = square
      ? Math.max(
          0,
          Math.min(1, ((point[0] - x) * dx + (point[1] - z) * dz) / square),
        )
      : 0;
    distance = Math.min(
      distance,
      Math.hypot(point[0] - x - t * dx, point[1] - z - t * dz),
    );
  }
  return distance;
}

// Shared joins remove gaps and overlapping segment ends. Clamp acute mitres so
// an illustrative route cannot grow a long spike at a bend.
export function ribbonVertices(
  source: number[][],
  width: number,
  height: number,
) {
  const points: number[][] = [];
  for (const point of source) {
    const previous = points[points.length - 1];
    if (
      !previous ||
      Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= 0.01
    )
      points.push(point);
  }
  if (points.length < 2) return [];
  const normals = points.slice(1).map((p, i) => {
    const dx = p[0] - points[i][0],
      dz = p[1] - points[i][1];
    const length = Math.hypot(dx, dz);
    return [-dz / length, dx / length];
  });
  const edges = points.map(([x, z], i) => {
    const a = normals[Math.max(0, i - 1)],
      b = normals[Math.min(normals.length - 1, i)];
    const length = Math.hypot(a[0] + b[0], a[1] + b[1]);
    const normal =
      length < 0.01 ? b : [(a[0] + b[0]) / length, (a[1] + b[1]) / length];
    const projection = Math.max(0.5, normal[0] * b[0] + normal[1] * b[1]);
    const offset = width / (2 * projection);
    return [
      [x + normal[0] * offset, height, z + normal[1] * offset],
      [x - normal[0] * offset, height, z - normal[1] * offset],
    ];
  });
  const positions: number[] = [];
  for (let i = 1; i < edges.length; i++) {
    const [a, b] = edges[i - 1],
      [c, d] = edges[i];
    positions.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  return positions;
}
