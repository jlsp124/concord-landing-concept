import { useEffect, useRef, useState } from "react";
import { SpatialScene } from "./SpatialScene";
import { beatAt, beatOpacity, beats, storyChange } from "./scene-score";
import { clamp, lenses } from "./narrative";
import type { Lens } from "./narrative";
import contextSummary from "./data/context-summary.json";

const sources = [
  {
    title: "Concord Pacific Place",
    detail:
      "The developer's account of the Expo lands, eight completed neighbourhoods and Concord Landing as the final chapter.",
    url: "https://www.concordpacificplace.com/",
  },
  {
    title: "Northeast False Creek Area Plan",
    detail:
      "City policy for reconnection, streets, waterfront and public realm. Policy intent is distinct from a current approved development design.",
    url: "https://vancouver.ca/home-property-development/northeast-false-creek.aspx",
  },
  {
    title: "811 Carrall / Sub-area 6C",
    detail:
      "The City rezoning page states that the application is on hold. Checked 10 October 2026. No completion date is represented here.",
    url: "https://www.shapeyourcity.ca/811-carrall-st",
  },
  {
    title: "City of Vancouver Open Data",
    detail:
      "Shoreline 2002, footprints 2015, parks, streets and cropped 2022 orthophotography. Historical snapshots, not a complete present-day survey. Open Government Licence — Vancouver.",
    url: "https://opendata.vancouver.ca/",
  },
  {
    title: "GeoBC / LidarBC",
    detail: `2025 one-metre surface and ground rasters provide generalized roof-height estimates. ${contextSummary.estimated.toLocaleString("en-CA")} of ${contextSummary.total.toLocaleString("en-CA")} mapped footprints sampled; ${contextSummary.fallback} use a 9m fallback. Large roofs use simplified height bands. Open Government Licence — British Columbia.`,
    url: "https://www2.gov.bc.ca/gov/content/data/geographic-data-services/topographic-data/lidarbc",
  },
];

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className={down ? "arrow-down" : ""}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 22c4 0 5-13 11-13h11M4 27c8 0 9-13 16-13h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function App() {
  const scroller = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const autoplay = useRef(0);
  const exploreFocus = useRef(false);
  const exploration = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [lens, setLens] = useState<Lens>("all");
  const [existing, setExisting] = useState(false);
  const [reset, setReset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [about, setAbout] = useState(false);
  const [flat, setFlat] = useState(false);
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reduced = motionOverride ?? systemReduced;
  const exploring = progress >= 0.945;
  const activeBeat = beatAt(progress);
  const selected = lenses.find((item) => item.id === lens);
  useEffect(() => {
    if (exploring && exploreFocus.current) {
      exploreFocus.current = false;
      exploration.current?.focus({ preventScroll: true });
    }
  }, [exploring]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    let position = 0;
    const distance = () =>
      Math.max(1, (scroller.current?.offsetHeight ?? 1) - window.innerHeight);
    const update = () => {
      frame = 0;
      position = clamp(window.scrollY / distance());
      setProgress(position);
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      setPlaying(false);
      window.scrollTo({ top: distance() * position, behavior: "instant" });
      update();
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", resize);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const goTo = (value: number) => {
    setPlaying(false);
    const distance = Math.max(
      1,
      (scroller.current?.offsetHeight ?? 1) - window.innerHeight,
    );
    window.scrollTo({
      top: distance * value,
      behavior: reduced ? "instant" : "smooth",
    });
  };

  useEffect(() => {
    if (!playing || reduced || about) return;
    const distance = Math.max(
      1,
      (scroller.current?.offsetHeight ?? 1) - window.innerHeight,
    );
    const startY = window.scrollY;
    const remaining = Math.max(0, distance - startY);
    const duration = (remaining / distance) * 68000;
    let start = 0;
    const tick = (time: number) => {
      if (!start) start = time;
      const t = clamp((time - start) / Math.max(1, duration));
      window.scrollTo({ top: startY + remaining * t, behavior: "instant" });
      if (t < 1) autoplay.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    const stop = () => setPlaying(false);
    const hidden = () => {
      if (document.hidden) stop();
    };
    const key = (event: KeyboardEvent) => {
      if (
        [
          "Escape",
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        stop();
    };
    autoplay.current = requestAnimationFrame(tick);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(autoplay.current);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [playing, reduced, about]);

  useEffect(() => {
    if (about) {
      setPlaying(false);
      dialog.current?.showModal();
      const previous = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = previous;
        dialog.current?.close();
      };
    }
  }, [about]);

  const select = (value: Lens) => {
    setLens(value);
    setReset((n) => n + 1);
  };

  return (
    <>
      <a
        className="skip-link"
        href="#exploration"
        onClick={(event) => {
          event.preventDefault();
          if (exploring) exploration.current?.focus({ preventScroll: true });
          else exploreFocus.current = true;
          goTo(1);
        }}
      >
        Skip to exploration
      </a>
      <main
        ref={scroller}
        className={`story-scroll ${reduced ? "reduced" : ""}`}
        aria-label="The story of Concord Landing"
      >
        <div
          className={`experience ${ready ? "is-ready" : ""} ${exploring ? "is-exploring" : ""}`}
          data-progress={progress.toFixed(3)}
        >
          <SpatialScene
            story={progress}
            progress={exploring ? (existing ? 0 : 1) : storyChange(progress)}
            lens={exploring ? lens : "all"}
            explore={exploring}
            reset={reset}
            reduced={reduced}
            flat={flat}
            onReady={(isFallback) => {
              setReady(true);
              setFallback(Boolean(isFallback));
            }}
          />
          <div className="film-shade" aria-hidden="true" />
          <header className="masthead">
            <button
              className="identity"
              onClick={() => {
                select("all");
                setExisting(false);
                goTo(0);
              }}
              aria-label="Concord Landing, return to opening"
            >
              <Mark />
              <span>
                CONCORD
                <br />
                LANDING
              </span>
            </button>
            <span className="independent">Independent interaction study</span>
            <div className="header-actions">
              {playing && (
                <button
                  className="text-button pause-button"
                  onClick={() => setPlaying(false)}
                >
                  <span aria-hidden="true">Ⅱ</span> Pause journey
                </button>
              )}
              <button
                className="text-button about-button"
                onClick={() => setAbout(true)}
              >
                About & sources <span aria-hidden="true">↗</span>
              </button>
            </div>
          </header>

          {!exploring && (
            <div className="editorial">
              {beats.map((beat, index) => {
                const opacity = beatOpacity(index, progress);
                return (
                  <article
                    key={beat.id}
                    className={`story-beat beat-${beat.id}`}
                    aria-hidden={activeBeat !== index}
                    style={{
                      opacity,
                      visibility: opacity < 0.005 ? "hidden" : "visible",
                      transform: reduced
                        ? undefined
                        : `translateY(${(1 - opacity) * 12}px)`,
                    }}
                  >
                    <p className="eyebrow">{beat.eyebrow}</p>
                    {index === 0 ? (
                      <h1>
                        <span>CONCORD</span>
                        <span>LANDING</span>
                      </h1>
                    ) : (
                      <h2>{beat.title}</h2>
                    )}
                    {beat.line && (
                      <p className="hero-line">
                        {beat.line} <span aria-hidden="true">—</span>
                      </p>
                    )}
                    {beat.text && <p className="story-text">{beat.text}</p>}
                    {beat.id === "future" && (
                      <p className="policy-note">
                        Conceptual massing · Rezoning application on hold
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {exploring && (
            <section
              ref={exploration}
              id="exploration"
              className="exploration"
              tabIndex={-1}
              aria-label="Explore the place"
            >
              <div className="explore-copy">
                <p className="eyebrow">
                  {existing
                    ? "Existing geographic context"
                    : (selected?.eyebrow ?? "Explore the relationships")}
                </p>
                <h2>
                  {existing
                    ? "The place,\nbefore the change."
                    : (selected?.title ?? "A neighbourhood,\nin relationship.")}
                </h2>
                <p className="story-text">
                  {existing
                    ? "The same waterfront, before the conceptual changes."
                    : (selected?.description ??
                      "Water, public space, connections and everyday life. Select a thread and follow it through the place.")}
                </p>
                {selected && !existing && (
                  <a
                    className="source-link"
                    href={selected.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.sourceLabel} ↗
                  </a>
                )}
                <nav
                  className="lens-navigation"
                  aria-label="Explore the neighbourhood"
                >
                  {lenses.map((item) => (
                    <button
                      key={item.id}
                      className={lens === item.id ? "active" : ""}
                      aria-pressed={lens === item.id}
                      onClick={() => select(lens === item.id ? "all" : item.id)}
                    >
                      <span className="lens-number">{item.number}</span>
                      <span>{item.short}</span>
                      <Arrow />
                    </button>
                  ))}
                </nav>
                <p className="evolution-note">
                  As the place takes shape, its map can become more specific.
                </p>
              </div>
              <div className="explore-tools">
                <div
                  className="comparison"
                  role="group"
                  aria-label="Compare existing context and possible future"
                >
                  <button
                    aria-pressed={existing}
                    onClick={() => setExisting(true)}
                  >
                    Existing
                  </button>
                  <button
                    aria-pressed={!existing}
                    onClick={() => setExisting(false)}
                  >
                    Possible future
                  </button>
                </div>
                <button
                  className="reset-button"
                  aria-label="Reset camera and show all relationships"
                  onClick={() => select("all")}
                >
                  Reset view <span aria-hidden="true">↺</span>
                </button>
              </div>
            </section>
          )}

          <footer className="film-footer">
            <div className="location-caption">
              <span className="caption-rule" aria-hidden="true" />
              <span>
                {exploring
                  ? existing
                    ? "HISTORICAL BASEMAP · GENERALIZED HEIGHTS"
                    : "ILLUSTRATIVE VISION · NOT APPROVED ARCHITECTURE"
                  : progress > 0.43
                    ? "PLANNING INTENT · CONCEPTUAL TRANSFORMATION"
                    : "FALSE CREEK · VANCOUVER"}
              </span>
            </div>
            <div className="story-action">
              {exploring ? (
                <button
                  onClick={() => {
                    select("all");
                    setExisting(false);
                    goTo(0);
                  }}
                >
                  <span aria-hidden="true">↑</span> Return to the story
                </button>
              ) : (
                <>
                  {progress < 0.08 && !reduced && (
                    <button
                      className="watch-button"
                      onClick={() => setPlaying((value) => !value)}
                    >
                      <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
                      {playing ? "Pause" : "Watch the journey"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (progress > 0.86) exploreFocus.current = true;
                      goTo(
                        progress > 0.86
                          ? 1
                          : Math.min(
                              0.99,
                              (beats[Math.max(0, activeBeat)]?.end ?? 0.94) +
                                0.032,
                            ),
                      );
                    }}
                  >
                    {progress > 0.86
                      ? "Explore the place"
                      : progress < 0.08
                        ? "Scroll to discover"
                        : "Continue"}
                    <Arrow down={progress <= 0.86} />
                  </button>
                </>
              )}
            </div>
            <div className="chapter-caption" aria-hidden="true">
              <span>
                {exploring
                  ? "07"
                  : String(Math.max(0, activeBeat) + 1).padStart(2, "0")}
              </span>
              <span>
                {exploring
                  ? "Explore"
                  : (beats[Math.max(0, activeBeat)]?.label ?? "The waterfront")}
              </span>
            </div>
          </footer>
          <div className="story-rule" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          {!ready && (
            <p className="preparing" role="status">
              Reading the city…
            </p>
          )}
          {fallback && <p className="fallback-status">2D geographic view</p>}
        </div>
      </main>

      <dialog
        ref={dialog}
        className="study-dialog"
        aria-labelledby="study-title"
        onCancel={() => setAbout(false)}
        onClose={() => setAbout(false)}
      >
        <button
          className="dialog-close"
          onClick={() => setAbout(false)}
          aria-label="Close about and sources"
        >
          ✕
        </button>
        <p className="eyebrow">About this study</p>
        <h2 id="study-title">
          A place becoming
          <br />a neighbourhood.
        </h2>
        <p className="dialog-intro">
          An independent conceptual exploration of Concord Landing and Northeast
          False Creek, based on publicly available information. Not an official
          Concord Pacific representation.
        </p>
        <p>
          This experience illustrates relationships, planning intent and a
          possible future. The park, routes and future forms are schematic,
          original interpretations. They do not represent approved architecture,
          survey boundaries, homes for sale or a construction programme.
          Landmark models are simplified representations.
        </p>
        <div className="access-options">
          <label>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(event) => setMotionOverride(event.target.checked)}
            />{" "}
            Still camera & reduced motion
          </label>
          <label>
            <input
              type="checkbox"
              checked={flat}
              onChange={(event) => setFlat(event.target.checked)}
            />{" "}
            Use the 2D geographic view
          </label>
        </div>
        <h3>Evidence & context</h3>
        <ol className="source-list">
          {sources.map((source) => (
            <li key={source.title}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title} <span aria-hidden="true">↗</span>
              </a>
              <p>{source.detail}</p>
            </li>
          ))}
        </ol>
        <p className="attribution">
          Contains information licensed under the Open Government Licence —
          Vancouver and the Open Government Licence — British Columbia. No
          endorsement by the data providers is implied.
        </p>
        <details className="read-story">
          <summary>Read the story without motion</summary>
          {beats.slice(1).map((beat) => (
            <div key={beat.id}>
              <h3>{beat.title.replace("\n", " ")}</h3>
              <p>{beat.text}</p>
            </div>
          ))}
        </details>
        <p className="dialog-credit">
          Original interaction study · 2026
          <br />
          No analytics, registration or sales enquiries.
        </p>
      </dialog>
    </>
  );
}
