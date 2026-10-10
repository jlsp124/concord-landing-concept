import { clamp, smoothstep } from "./narrative";

export type Vector = [number, number, number];
export type CameraPose = { position: Vector; target: Vector; fov: number };

// A score in geographic metres, not a construction timeline.
// The camera stays south of the site: downtown left, Science World right.
const score: Array<CameraPose & { at: number }> = [
  { at: 0, position: [820, 710, 1480], target: [-170, 25, -250], fov: 42 },
  { at: 0.17, position: [620, 1380, 1880], target: [-250, 0, -190], fov: 43 },
  { at: 0.34, position: [660, 490, 800], target: [50, 10, -170], fov: 43 },
  { at: 0.52, position: [440, 580, 750], target: [80, 0, -160], fov: 43 },
  { at: 0.69, position: [510, 190, 420], target: [300, 8, -50], fov: 45 },
  { at: 0.83, position: [640, 420, 690], target: [65, 8, -160], fov: 42 },
  { at: 1, position: [730, 680, 980], target: [30, 5, -110], fov: 43 },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function cameraAt(value: number, mobile = false): CameraPose {
  const progress = clamp(value);
  const index = score.findIndex((key) => key.at >= progress);
  const right = score[Math.max(1, index)];
  const left = score[Math.max(0, index - 1)];
  const t = smoothstep(left.at, right.at, progress);
  const position = left.position.map((a, i) =>
    mix(a, right.position[i], t),
  ) as Vector;
  const target = left.target.map((a, i) =>
    mix(a, right.target[i], t),
  ) as Vector;
  if (mobile) {
    // Back away without rotating the geographic frame. A portrait is guided.
    const distance = mix(1.12, 1.3, smoothstep(0.2, 0.3, progress));
    for (let i = 0; i < 3; i++)
      position[i] = target[i] + (position[i] - target[i]) * distance;
    target[1] += mix(100, 85, smoothstep(0.1, 0.2, progress));
  }
  return { position, target, fov: mix(left.fov, right.fov, t) };
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
    text: "Homes, work and public life could meet here. The forms you see are a study of relationships, not final architecture.",
  },
] as const;

export function beatAt(value: number) {
  return beats.findIndex((beat) => value >= beat.start && value < beat.end);
}

export function beatOpacity(index: number, value: number) {
  const beat = beats[index];
  const entering =
    index === 0 ? 1 : smoothstep(beat.start, beat.start + 0.025, value);
  return entering * (1 - smoothstep(beat.end - 0.025, beat.end, value));
}
