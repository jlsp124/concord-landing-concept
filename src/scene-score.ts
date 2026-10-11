import { clamp, smoothstep } from "./narrative";

export type Vector = [number, number, number];
export type CameraPose = { position: Vector; target: Vector; fov: number };

export function motionBlend(deltaMs: number) {
  return 1 - Math.exp(-Math.max(0, deltaMs) / 120);
}

export function portraitFov(fov: number, height: number, frameHeight: number) {
  // A phone toolbar resize reveals more scene instead of zooming the model.
  return (
    (Math.atan(
      (Math.tan((fov * Math.PI) / 360) * height) / Math.max(1, frameHeight),
    ) *
      360) /
    Math.PI
  );
}

type Orbit = {
  at: number;
  radius: number;
  azimuth: number;
  elevation: number;
  target: Vector;
  fov: number;
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;
function orbitOf(pose: CameraPose & { at: number }): Orbit {
  const [x, y, z] = pose.position.map((v, i) => v - pose.target[i]);
  const radius = Math.hypot(x, y, z);
  return {
    at: pose.at,
    radius,
    azimuth: Math.atan2(x, z),
    elevation: Math.asin(y / radius),
    target: pose.target,
    fov: pose.fov,
  };
}
function poseOf(orbit: Omit<Orbit, "at">): CameraPose {
  const horizontal = orbit.radius * Math.cos(orbit.elevation);
  return {
    position: [
      orbit.target[0] + horizontal * Math.sin(orbit.azimuth),
      orbit.target[1] + orbit.radius * Math.sin(orbit.elevation),
      orbit.target[2] + horizontal * Math.cos(orbit.azimuth),
    ],
    target: orbit.target,
    fov: orbit.fov,
  };
}

// Keep the established opening and exploration compositions. Each change in
// distance has a subject: approach the site, widen to read the connections,
// move lower and closer to the waterfront, then rise to reveal the future.
const score: Orbit[] = [
  orbitOf({
    at: 0,
    position: [820, 710, 1480],
    target: [-170, 25, -250],
    fov: 42,
  }),
  {
    at: 0.17,
    radius: 1950,
    azimuth: radians(24),
    elevation: radians(34),
    target: [-200, 16, -185],
    fov: 43,
  },
  {
    at: 0.34,
    radius: 1400,
    azimuth: radians(12),
    elevation: radians(22),
    target: [40, 10, -170],
    fov: 43,
  },
  {
    at: 0.52,
    radius: 1750,
    azimuth: radians(28),
    elevation: radians(31),
    target: [65, 12, -155],
    fov: 43,
  },
  {
    at: 0.69,
    radius: 1280,
    azimuth: radians(43),
    elevation: radians(19),
    target: [90, 10, -115],
    fov: 43,
  },
  {
    at: 0.83,
    radius: 1670,
    azimuth: radians(47),
    elevation: radians(32),
    target: [55, 8, -140],
    fov: 43,
  },
  orbitOf({ at: 1, position: [730, 680, 980], target: [30, 5, -110], fov: 43 }),
];
const portraitScore = score.map((key) => {
  const pose = poseOf(key);
  const scale = key.at === 0 ? 1.12 : key.at === 0.17 ? 1.18 : 1.3;
  const position = pose.position.map(
    (v, i) => pose.target[i] + (v - pose.target[i]) * scale,
  ) as Vector;
  const target = [...pose.target] as Vector;
  target[1] += key.at === 0 ? 100 : 85;
  return orbitOf({ at: key.at, position, target, fov: key.fov });
});

// Shape-preserving Hermite slopes: continuous velocity through story beats,
// without overshooting the radius or target. No stop/start easing at every key.
function sample(
  keys: Orbit[],
  index: number,
  progress: number,
  value: (key: Orbit) => number,
) {
  const slope = (i: number) => {
    if (i === 0 || i === keys.length - 1) return 0;
    const before = keys[i].at - keys[i - 1].at;
    const after = keys[i + 1].at - keys[i].at;
    const a = (value(keys[i]) - value(keys[i - 1])) / before;
    const b = (value(keys[i + 1]) - value(keys[i])) / after;
    if (a * b <= 0) return 0;
    const w1 = 2 * after + before,
      w2 = after + 2 * before;
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const a = keys[index - 1],
    b = keys[index];
  const span = b.at - a.at;
  const t = (progress - a.at) / span,
    t2 = t * t,
    t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * value(a) +
    (t3 - 2 * t2 + t) * span * slope(index - 1) +
    (-2 * t3 + 3 * t2) * value(b) +
    (t3 - t2) * span * slope(index)
  );
}

export function cameraAt(value: number, mobile = false): CameraPose {
  const progress = clamp(value);
  const keys = mobile ? portraitScore : score;
  const index = Math.max(
    1,
    keys.findIndex((key) => key.at >= progress),
  );
  const read = (value: (key: Orbit) => number) =>
    sample(keys, index, progress, value);
  return poseOf({
    radius: read((key) => key.radius),
    azimuth: read((key) => key.azimuth),
    elevation: read((key) => key.elevation),
    target: [0, 1, 2].map((i) => read((key) => key.target[i])) as Vector,
    fov: read((key) => key.fov),
  });
}

export function storyChange(value: number) {
  return smoothstep(0.39, 0.88, value);
}

export const beats = [
  {
    id: "place",
    start: 0,
    end: 0.13,
    label: "Vancouver",
    eyebrow: "Northeast False Creek · Vancouver",
    title: "Concord Landing",
    line: "The final chapter",
    text: "",
  },
  {
    id: "legacy",
    start: 0.13,
    end: 0.29,
    label: "The Expo lands",
    eyebrow: "Concord Pacific Place",
    title: "Eight neighbourhoods.\nOne remains.",
    line: "",
    text: "From the former Expo lands, a waterfront city has grown. Concord Landing is its final neighbourhood.",
  },
  {
    id: "today",
    start: 0.29,
    end: 0.43,
    label: "The site today",
    eyebrow: "Between downtown and the water",
    title: "A city,\ninterrupted.",
    line: "",
    text: "The viaducts cross a place that has yet to become a complete neighbourhood.",
  },
  {
    id: "connect",
    start: 0.43,
    end: 0.61,
    label: "Reconnection",
    eyebrow: "From infrastructure to connection",
    title: "Let the city\nmeet the water.",
    line: "",
    text: "The area plan imagines a new street network, a Dunsmuir connection and Georgia Street reaching False Creek.",
  },
  {
    id: "park",
    start: 0.61,
    end: 0.77,
    label: "Public life",
    eyebrow: "Waterfront · Park · Public space",
    title: "Room for\nthe everyday.",
    line: "",
    text: "A Creekside Park extension. A connected waterfront. More space to walk, pause and belong.",
  },
  {
    id: "future",
    start: 0.77,
    end: 0.94,
    label: "An open future",
    eyebrow: "A possible neighbourhood",
    title: "The next chapter\nis still open.",
    line: "",
    text: "Homes, work and public life could meet here.",
  },
] as const;

export function beatAt(value: number) {
  if (value >= beats[beats.length - 1].end) return beats.length - 1;
  return beats.findIndex((beat) => value >= beat.start && value < beat.end);
}

export function beatOpacity(index: number, value: number) {
  const beat = beats[index];
  const entering =
    index === 0 ? 1 : smoothstep(beat.start, beat.start + 0.025, value);
  return entering * (1 - smoothstep(beat.end - 0.025, beat.end, value));
}
