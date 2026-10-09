import { useCallback, useEffect, useRef, useState } from "react";
import { chapter, chapters, clamp, lenses } from "./narrative";
import type { Lens, ViewMode } from "./narrative";
import { SpatialScene } from "./SpatialScene";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15M13 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none">
      <path
        d="M5 34 21 18h22M5 25 18 12h25M5 43l21-21h17"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function Play({ playing }: { playing: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {playing ? (
        <path d="M9 6v12M15 6v12" stroke="currentColor" strokeWidth="1.7" />
      ) : (
        <path d="m9 6 9 6-9 6V6Z" stroke="currentColor" strokeWidth="1.3" />
      )}
    </svg>
  );
}

const sourceLinks = [
  [
    "Concord Pacific Place",
    "The final chapter narrative",
    "https://www.concordpacificplace.com/",
  ],
  [
    "Northeast False Creek Plan",
    "City of Vancouver · long-term area vision",
    "https://vancouver.ca/home-property-development/northeast-false-creek.aspx",
  ],
  [
    "Sub-area 6C / 811 Carrall Street",
    "City proposal · application on hold",
    "https://www.shapeyourcity.ca/811-carrall-st",
  ],
  [
    "Urban design & connectivity",
    "Georgia Landing, Dunsmuir & Carrall",
    "https://vancouver.ca/home-property-development/urban-design.aspx",
  ],
  [
    "Park design principles",
    "Creekside Park extension & public realm",
    "https://vancouver.ca/home-property-development/park-design.aspx",
  ],
  [
    "City open geographic data",
    "Shoreline, footprints, streets & parks",
    "https://opendata.vancouver.ca/pages/home/",
  ],
];

export default function App() {
  const [progress, setProgress] = useState(0);
  const [lens, setLens] = useState<Lens>("all");
  const [mode, setMode] = useState<ViewMode>("perspective");
  const [zoom, setZoom] = useState(1);
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [simpleMap, setSimpleMap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [dialogTab, setDialogTab] = useState<
    "concept" | "sources" | "controls"
  >("concept");
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const currentChapter = chapter(progress);
  const content = chapters[currentChapter];
  const activeLens = lenses.find((item) => item.id === lens);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (!playing || reduced || !ready) return;
    let frame = 0;
    let previous = 0;
    const animate = (time: number) => {
      if (!previous) previous = time;
      // Clamp long frames so a backgrounded tab never skips the story.
      const step = Math.min(time - previous, 60) / 26000;
      previous = time;
      const next = clamp(progressRef.current + step);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) setPlaying(false);
      else frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, ready]);

  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  useEffect(() => {
    const modal = dialogRef.current;
    if (!modal) return;
    if (dialogOpen && !modal.open) modal.showModal();
    if (!dialogOpen && modal.open) modal.close();
  }, [dialogOpen]);

  const stop = useCallback(() => {
    setPlaying(false);
    setInteracted(true);
  }, []);

  const scrub = useCallback(
    (value: number) => {
      setProgress(clamp(value));
      setLens("all");
      stop();
    },
    [stop],
  );

  const selectLens = useCallback(
    (value: Lens) => {
      stop();
      setLens((previous) => (previous === value ? "all" : value));
      if (value !== "all") setProgress(1);
    },
    [stop],
  );

  const journey = () => {
    setInteracted(true);
    setLens("all");
    if (reduced) {
      setProgress(currentChapter === 0 ? 0.5 : currentChapter === 1 ? 1 : 0);
    } else {
      if (playing) setPlaying(false);
      else {
        setProgress(0);
        setMode(simpleMap ? "plan" : "perspective");
        setZoom(1);
        setReset((v) => v + 1);
        setPlaying(true);
      }
    }
  };

  const resetExperience = () => {
    stop();
    setProgress(0);
    setLens("all");
    setMode(simpleMap ? "plan" : "perspective");
    setZoom(1);
    setReset((v) => v + 1);
  };

  const openDialog = (section: typeof dialogTab) => {
    setDialogTab(section);
    setDialogOpen(true);
    setPlaying(false);
  };

  return (
    <div
      className={`experience ${ready ? "is-ready" : ""} ${interacted ? "is-exploring" : ""} ${reduced ? "reduce-motion" : ""} ${activeLens ? "has-lens" : ""}`}
      data-chapter={currentChapter}
    >
      <a className="skip-link" href="#timeline">
        Skip to transformation controls
      </a>
      <header className="masthead">
        <button
          className="wordmark"
          onClick={resetExperience}
          aria-label="Concord Landing — return to beginning"
        >
          <Mark />
          <span>
            CONCORD
            <br />
            LANDING
          </span>
        </button>
        <div className="location">
          <span className="location-dot" />
          NORTHEAST FALSE CREEK
          <span className="location-city">VANCOUVER, BC</span>
        </div>
        <nav aria-label="Experience information" className="header-nav">
          <button onClick={() => openDialog("concept")}>
            About the concept <span className="small-plus">+</span>
          </button>
        </nav>
      </header>

      <main id="main" className="main-stage">
        <SpatialScene
          progress={progress}
          lens={lens}
          mode={mode}
          zoom={zoom}
          reset={reset}
          reduced={reduced}
          onReady={(fallback = false) => {
            setReady(true);
            if (fallback) {
              setSimpleMap(true);
              setMode("plan");
            }
          }}
          onSelect={selectLens}
          onScrub={scrub}
          onInteract={stop}
        />

        <div className="editorial">
          {activeLens ? (
            <section
              className="lens-story"
              key={activeLens.id}
              aria-labelledby="lens-title"
            >
              <button className="back-to-whole" onClick={() => setLens("all")}>
                <span>←</span> The whole neighbourhood
              </button>
              <div className="eyebrow">
                <span className={`lens-swatch ${activeLens.id}`} />
                {activeLens.eyebrow}
              </div>
              <h1 id="lens-title">{activeLens.title}</h1>
              <p>{activeLens.description}</p>
              <a
                className="source-reference"
                href={activeLens.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                {activeLens.sourceLabel}
                <Arrow diagonal />
              </a>
              <span className="story-note">{activeLens.note}</span>
            </section>
          ) : (
            <section
              className="chapter-story"
              key={currentChapter}
              aria-labelledby="chapter-title"
            >
              <div className="eyebrow">{content.kicker}</div>
              <h1 id="chapter-title">
                {content.title.map((line, i) => (
                  <span
                    key={line}
                    className={i === content.italic ? "serif-italic" : ""}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p>{content.description}</p>
              <button
                className="journey-link"
                onClick={journey}
                disabled={!ready}
              >
                <span className="journey-icon">
                  <Play playing={playing} />
                </span>
                <span>
                  {reduced
                    ? "Explore the next chapter"
                    : playing
                      ? "Pause the journey"
                      : currentChapter === 2
                        ? "Replay the journey"
                        : "Take the 30-second journey"}
                </span>
                <Arrow />
              </button>
              {!interacted && (
                <div className="intro-hint">
                  Or move the timeline. The place is yours to explore.
                </div>
              )}
            </section>
          )}
        </div>

        <div className="view-controls" aria-label="Map view">
          <div className="view-toggle">
            <button
              aria-pressed={mode === "perspective"}
              disabled={simpleMap}
              onClick={() => {
                setMode("perspective");
                stop();
              }}
            >
              Perspective
            </button>
            <button
              aria-pressed={mode === "plan"}
              onClick={() => {
                setMode("plan");
                stop();
              }}
            >
              Plan
            </button>
          </div>
          <button
            className="icon-button help-button"
            aria-label="How to explore"
            onClick={() => openDialog("controls")}
          >
            ?
          </button>
        </div>

        <aside className="lens-navigation" aria-label="Explore a spatial layer">
          <div className="eyebrow lens-heading">EXPLORE A LAYER</div>
          {lenses.map((item) => (
            <button
              key={item.id}
              onClick={() => selectLens(item.id)}
              aria-pressed={lens === item.id}
              className={`lens-option ${item.id}`}
            >
              <span className="lens-number">{item.number}</span>
              <span className="lens-label desktop-label">{item.label}</span>
              <span className="lens-label mobile-label">{item.short}</span>
              <span className="lens-line" />
            </button>
          ))}
          {lens !== "all" && (
            <button className="all-layers" onClick={() => setLens("all")}>
              Show the whole <span>↗</span>
            </button>
          )}
        </aside>

        <div className="map-bottom">
          <div className="map-annotation">
            <span className="north-arrow" aria-hidden="true">
              ↑
            </span>
            <span>N</span>
            <span className="model-description">
              A SPATIAL STUDY
              <br />
              {content.caption}
            </span>
          </div>
          <div className="camera-controls">
            <span className="drag-hint">
              {simpleMap
                ? "Simple plan view"
                : mode === "plan"
                  ? "Drag to move the plan"
                  : "Drag to look around"}
            </span>
            <button
              className="icon-button"
              aria-label="Zoom out"
              disabled={zoom <= 0.8}
              onClick={() => {
                setZoom((z) => clamp(z - 0.15, 0.8, 1.7));
                stop();
              }}
            >
              −
            </button>
            <button
              className="icon-button"
              aria-label="Zoom in"
              disabled={zoom >= 1.7}
              onClick={() => {
                setZoom((z) => clamp(z + 0.15, 0.8, 1.7));
                stop();
              }}
            >
              +
            </button>
            <button
              className="icon-button reset-camera"
              aria-label="Reset map view"
              onClick={() => {
                setZoom(1);
                setReset((v) => v + 1);
                stop();
              }}
            >
              ↺
            </button>
          </div>
        </div>

        {!ready && (
          <div className="loading-state" role="status">
            <Mark />
            <span>
              Finding our place
              <br />
              <small>Preparing the spatial study</small>
            </span>
          </div>
        )}
      </main>

      <section
        id="timeline"
        className="timeline"
        aria-label="Explore the transformation"
      >
        <div className="timeline-intro">
          <span className="chapter-index">
            {content.number}
            <span>/ 03</span>
          </span>
          <span className="timeline-title">{content.label}</span>
        </div>
        <div className="timeline-control">
          <div className="timeline-labels">
            <button
              className={currentChapter === 0 ? "current" : ""}
              onClick={() => scrub(0)}
            >
              Today
            </button>
            <button
              className={currentChapter === 1 ? "current" : ""}
              onClick={() => scrub(0.5)}
            >
              Reconnection
            </button>
            <button
              className={currentChapter === 2 ? "current" : ""}
              onClick={() => scrub(1)}
            >
              A possible future
            </button>
          </div>
          <div
            className="timeline-track"
            style={
              { "--progress": `${progress * 100}%` } as React.CSSProperties
            }
          >
            <div className="timeline-rule" />
            <div className="timeline-fill" />
            <span className="timeline-midpoint" />
            <input
              id="transformation"
              type="range"
              min="0"
              max="1000"
              step="1"
              value={Math.round(progress * 1000)}
              aria-label="Transformation from today to a possible future"
              aria-valuetext={`${content.label}, ${Math.round(progress * 100)} percent through the conceptual story`}
              onChange={(e) => scrub(Number(e.target.value) / 1000)}
            />
            <span className="timeline-handle" aria-hidden="true">
              <span>‹</span>
              <span>›</span>
            </span>
          </div>
          <div className="timeline-caption">
            <span>DRAG TO EXPLORE THE CHANGE</span>
            <span>Conceptual sequence, not a delivery timeline</span>
          </div>
        </div>
        <button
          className={`tour-button ${playing ? "is-playing" : ""}`}
          onClick={journey}
          disabled={!ready}
          aria-label={
            reduced
              ? "Explore next chapter"
              : playing
                ? "Pause guided journey"
                : "Play guided journey"
          }
        >
          <Play playing={playing} />
        </button>
      </section>

      <footer className="footer">
        <button onClick={() => openDialog("concept")} className="independent">
          Independent concept{" "}
          <span>· Not an official Concord Pacific representation</span>
        </button>
        <div className="footer-right">
          <button
            className="motion-control"
            onClick={() => setReduced((v) => !v)}
            aria-pressed={!reduced}
            aria-label={reduced ? "Enable motion" : "Reduce motion"}
          >
            <span className={`motion-dot ${reduced ? "paused" : ""}`} />
            MOTION {reduced ? "OFF" : "ON"}
          </button>
          <button onClick={() => openDialog("sources")}>
            Sources <Arrow diagonal />
          </button>
        </div>
      </footer>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {content.label}
        {activeLens ? `: ${activeLens.title}` : ""}
      </div>

      <dialog
        ref={dialogRef}
        className="concept-dialog"
        onCancel={() => setDialogOpen(false)}
        onClose={() => setDialogOpen(false)}
        aria-labelledby="dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setDialogOpen(false);
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <Mark />
            <span>AN OPEN CHAPTER</span>
            <button
              className="close-dialog icon-button"
              onClick={() => setDialogOpen(false)}
              aria-label="Close information"
            >
              ×
            </button>
          </div>
          <nav className="dialog-tabs" aria-label="Concept information">
            <button
              aria-current={dialogTab === "concept" ? "page" : undefined}
              onClick={() => setDialogTab("concept")}
            >
              The concept
            </button>
            <button
              aria-current={dialogTab === "sources" ? "page" : undefined}
              onClick={() => setDialogTab("sources")}
            >
              Public sources
            </button>
            <button
              aria-current={dialogTab === "controls" ? "page" : undefined}
              onClick={() => setDialogTab("controls")}
            >
              How to explore
            </button>
          </nav>
          {dialogTab === "concept" && (
            <section className="dialog-content">
              <div className="eyebrow">
                A digital experience that can grow with a place
              </div>
              <h2 id="dialog-title">
                The final chapter should be something you can <em>explore.</em>
              </h2>
              <p>
                Concord Pacific Place describes Concord Landing as its
                culminating neighbourhood. This study imagines how that story
                could become a spatial experience: a place to understand
                connections, public life, and change before individual buildings
                are defined.
              </p>
              <div className="evolution">
                <span className="eyebrow">ONE PLACE. DEEPER OVER TIME.</span>
                <div>
                  <span className="active">Masterplan</span>
                  <i>→</i>
                  <span className="active">Neighbourhood</span>
                  <i>→</i>
                  <span>Buildings</span>
                  <i>→</i>
                  <span>Spaces & plans</span>
                </div>
                <p>
                  As the project becomes more defined, the same interface could
                  reveal buildings, floors, residences, commercial spaces,
                  plans, and eventually availability.
                </p>
              </div>
              <div className="status-note">
                <span className="status-dot" />
                <p>
                  <strong>A vision, still evolving.</strong> The City’s public
                  811 Carrall / Sub-area 6C page marks the rezoning application
                  as on hold. The sequence here illustrates planning
                  relationships, not construction phases or a delivery date.
                </p>
              </div>
              <p className="full-disclaimer">
                Independent conceptual exploration based on publicly available
                information. Not an official Concord Pacific representation. Not
                commissioned, approved, or endorsed by Concord Pacific or the
                City of Vancouver.
              </p>
            </section>
          )}
          {dialogTab === "sources" && (
            <section className="dialog-content sources-content">
              <div className="eyebrow">Grounded in public information</div>
              <h2 id="dialog-title">
                A clear point of <em>reference.</em>
              </h2>
              <div className="source-list">
                {sourceLinks.map(([name, description, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div>
                      <strong>{name}</strong>
                      <span>{description}</span>
                    </div>
                    <Arrow diagonal />
                  </a>
                ))}
              </div>
              <p className="source-footnote">
                Research checked 9 October 2026. Historical policy and
                preliminary proposals may change. Future zones and routes are
                original abstract illustrations, not approved designs.
              </p>
              <p className="source-footnote">
                Contains information licensed under the{" "}
                <a
                  href="https://opendata.vancouver.ca/pages/licence/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Government Licence – Vancouver
                </a>
                . Source: City of Vancouver. Shoreline: 2002; context
                footprints: 2015. Elevations are symbolic. No third-party
                renderings or photographs are reproduced.
              </p>
              <a
                className="repository-link"
                href="https://github.com/jlsp124/concord-landing-concept/blob/main/SOURCES.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Full source & asset inventory <Arrow diagonal />
              </a>
            </section>
          )}
          {dialogTab === "controls" && (
            <section className="dialog-content controls-content">
              <div className="eyebrow">The place is the interface</div>
              <h2 id="dialog-title">
                Make yourself <em>at home.</em>
              </h2>
              <dl className="control-list">
                <div>
                  <dt>Move through the story</dt>
                  <dd>
                    Drag the timeline, select a chapter, or scroll over the
                    model. The play button takes you on a short guided journey.
                  </dd>
                </div>
                <div>
                  <dt>Look around</dt>
                  <dd>
                    Drag the model to change your viewpoint. Use + and − to
                    zoom. Switch to Plan for a view from above.
                  </dd>
                </div>
                <div>
                  <dt>Follow a relationship</dt>
                  <dd>
                    Select a numbered marker or a layer. The model highlights
                    the relevant geography and brings its story into view.
                  </dd>
                </div>
                <div>
                  <dt>Use the keyboard</dt>
                  <dd>
                    Tab through the controls. Arrow keys adjust the timeline.
                    With the model focused, arrows change the view; + / − zoom;
                    Home resets the view.
                  </dd>
                </div>
                <div>
                  <dt>Move at your pace</dt>
                  <dd>
                    Use Motion off for immediate transitions. Your device’s
                    reduced-motion preference is respected.
                  </dd>
                </div>
              </dl>
            </section>
          )}
          <div className="territory-note">
            On the unceded territories of the Musqueam, Squamish, and
            Tsleil-Waututh Nations.
          </div>
        </div>
      </dialog>
    </div>
  );
}
