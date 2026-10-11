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
