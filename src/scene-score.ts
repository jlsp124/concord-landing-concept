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

// City policy identifies these places, rather than the centre of the inlet:
// 6C's viaduct edge, Dunsmuir / Carrall, Georgia Landing, and the park north of
// Science World. Each close view follows its subject through the same world.
// Keep the established opening and exploration compositions.
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
    at: 0.355,
    radius: 950,
    azimuth: radians(12),
    elevation: radians(32),
    target: [105, 14, -160],
    fov: 43,
  },
  {
    at: 0.475,
    radius: 1120,
    azimuth: radians(28),
    elevation: radians(43),
    target: [165, 15, -285],
    fov: 43,
  },
  {
    at: 0.565,
    radius: 720,
    azimuth: radians(34),
    elevation: radians(41),
    target: [-60, 8, 8],
    fov: 43,
  },
  {
    at: 0.7,
    radius: 820,
    azimuth: radians(50),
    elevation: radians(29),
    target: [322, 8, -30],
    fov: 43,
  },
  {
    at: 0.84,
    radius: 1000,
    azimuth: radians(60),
    elevation: radians(35),
    target: [95, 22, -140],
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
function sample<Key extends { at: number }>(
  keys: Key[],
  index: number,
  progress: number,
  value: (key: Key) => number,
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

// Route drawing must reach the waterfront while the camera is there, rather
// than wait until the park beat. Keep the existing story and its hold / finish
// points; direct the transformation within them with the same smooth score.
const changeScore = [
  { at: 0, value: 0 },
  { at: 0.39, value: 0 },
  { at: 0.475, value: 0.35 },
  { at: 0.565, value: 0.6 },
  { at: 0.7, value: 0.75 },
  { at: 0.88, value: 1 },
  { at: 1, value: 1 },
];
export function storyChange(value: number) {
  const progress = clamp(value);
  const index = Math.max(
    1,
    changeScore.findIndex((key) => key.at >= progress),
  );
  return sample(changeScore, index, progress, (key) => key.value);
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
