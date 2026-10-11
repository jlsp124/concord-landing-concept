import { clamp } from "./narrative";

export type ViewportSize = { width: number; height: number };

export function shouldRescoreViewport(
  previous: ViewportSize,
  next: ViewportSize,
) {
  // Phone browser chrome changes height during momentum scrolling. It must not
  // restart playback, renormalize the story, or issue a programmatic scroll.
  return (
    Math.abs(next.width - previous.width) >= 1 ||
    (next.width > 760 && Math.abs(next.height - previous.height) >= 1)
  );
}

export function scrollRange(contentHeight: number, viewportHeight: number) {
  return Math.max(1, contentHeight - viewportHeight);
}

export function scrollProgress(scrollY: number, distance: number) {
  return clamp(scrollY / Math.max(1, distance));
}

// More native scroll travel through the five geographic close views, less
// through the moves between them. Raised-cosine windows avoid speed steps.
// This maps position only: no captured gestures, snap points or momentum cap.
const phoneStops = [
  { at: 0.355, reach: 0.055 },
  { at: 0.475, reach: 0.035 },
  { at: 0.565, reach: 0.035 },
  { at: 0.7, reach: 0.055 },
  { at: 0.84, reach: 0.055 },
];
const phoneTravel =
  1 + 2 * phoneStops.reduce((sum, stop) => sum + stop.reach, 0);

export function storyScrollFraction(value: number, mobile = false) {
  const progress = clamp(value);
  if (!mobile || progress === 0 || progress === 1) return progress;
  let travel = progress;
  for (const { at, reach } of phoneStops) {
    const x = clamp(progress - (at - reach), 0, 2 * reach);
    travel += x - (reach / Math.PI) * Math.sin((Math.PI * x) / reach);
  }
  return travel / phoneTravel;
}

export function storyProgress(value: number, mobile = false) {
  const fraction = clamp(value);
  if (!mobile || fraction === 0 || fraction === 1) return fraction;
  // Invert the same monotonic curve for scroll, navigation and resize. A pixel
  // must always refer to the same story position, including reverse scrolling.
  let lower = 0,
    upper = 1;
  for (let i = 0; i < 28; i++) {
    const middle = (lower + upper) / 2;
    if (storyScrollFraction(middle, true) < fraction) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}
