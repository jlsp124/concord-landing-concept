import { useEffect, useRef, useState } from "react";
import geography from "./data/geography.json";
import {
  lenses,
  sceneLabels,
  siteOutline,
  futurePark,
  futureZones,
  routes,
  transformation,
} from "./narrative";
import type { Lens, Point, ViewMode } from "./narrative";
import type { AtlasEngine } from "./atlas-engine";

type Props = {
  progress: number;
  lens: Lens;
  mode: ViewMode;
  zoom: number;
  reset: number;
  reduced: boolean;
  onReady: (fallback?: boolean) => void;
  onSelect: (lens: Lens) => void;
  onScrub: (value: number) => void;
  onInteract: () => void;
};

function path(points: number[][]) {
  return (
    points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + "Z"
  );
}

function FlatAtlas({
  progress,
  lens,
  zoom = 1,
}: Pick<Props, "progress" | "lens"> & { zoom?: number }) {
  const t = transformation(progress);
  return (
    <svg
      className="flat-atlas"
      viewBox="-1070 -870 2300 1870"
      aria-hidden="true"
      style={zoom !== 1 ? { transform: `scale(${zoom})` } : undefined}
    >
      <g fill="#829795" stroke="#b0c5be" strokeWidth="1">
        {geography.land.map((rings, i) => (
          <path key={i} d={rings.map(path).join(" ")} fillRule="evenodd" />
        ))}
      </g>
      <g fill="#8cae98" opacity="0.8">
        {geography.parks.map((item, i) => (
          <path key={i} d={item.rings.map(path).join(" ")} />
        ))}
      </g>
      <g stroke="#c1cfc7" strokeWidth="7" fill="none">
        {geography.streets
          .filter((s) => !s.name?.includes("VIADUCT"))
          .map((item, i) => (
            <polyline
              key={i}
              points={item.points.map((p) => p.join(",")).join(" ")}
            />
          ))}
      </g>
      <g
        fill="#dae0d4"
        stroke="#9fb0a8"
        strokeWidth="1"
        opacity={lens === "all" ? 1 : 0.55}
      >
        {geography.buildings.map((item, i) => (
          <path
            key={`${item.id}-${i}`}
            d={item.rings.map(path).join(" ")}
            fillRule="evenodd"
          />
        ))}
      </g>
      <g stroke="#c9ad90" strokeWidth="13" fill="none" opacity={t.existing}>
        {geography.streets
          .filter((s) => s.name?.includes("VIADUCT"))
          .map((item, i) => (
            <polyline
              key={i}
              points={item.points.map((p) => p.join(",")).join(" ")}
            />
          ))}
      </g>
      <path
        d={path(siteOutline)}
        fill="#edcba0"
        fillOpacity="0.08"
        stroke="#edcba0"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <path d={path(futurePark)} fill="#b3d6a8" opacity={t.park} />
      <g fill="#e9d4ad" opacity={t.neighbourhood}>
        {futureZones.map((zone, i) => (
          <path key={i} d={path(zone)} />
        ))}
      </g>
      <g fill="none" stroke="#eac292" strokeWidth="7" opacity={t.connections}>
        {Object.entries(routes).map(([key, points]) => (
          <polyline
            key={key}
            points={points.map((p) => p.join(",")).join(" ")}
          />
        ))}
      </g>
      <g
        fontFamily="DM Sans, sans-serif"
        fontSize="19"
        fill="#142e32"
        textAnchor="middle"
      >
        {sceneLabels
          .filter((l) => l.kind !== "route")
          .map((label) => (
            <text key={label.id} x={label.point[0]} y={label.point[1]}>
              {label.text}
            </text>
          ))}
      </g>
    </svg>
  );
}

export function SpatialScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const engine = useRef<AtlasEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [fallback, setFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { progress, lens, mode, zoom, reset, reduced } = props;

  useEffect(() => {
    let disposed = false;
    const target = mount.current!;
    const northArrow = target
      .closest(".experience")
      ?.querySelector<HTMLElement>(".north-arrow");
    const nodes = Array.from(
      overlay.current!.querySelectorAll<HTMLElement>("[data-anchor]"),
    );
    const anchors = nodes.map((node) => ({
      id: node.dataset.anchor!,
      point: JSON.parse(node.dataset.point!) as Point,
      height: Number(node.dataset.height || 0),
      update: (x: number, y: number, visible: boolean) => {
        node.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        node.style.visibility = visible ? "visible" : "hidden";
      },
    }));
    import("./atlas-engine")
      .then(({ AtlasEngine: Engine }) => {
        if (disposed) return;
        try {
          const atlas = new Engine(target, {
            anchors,
            onInteract: () => latest.current.onInteract(),
            onScrub: (change) =>
              latest.current.onScrub(latest.current.progress + change),
            onFailure: () => {
              setFallback(true);
              latest.current.onReady(true);
            },
            onNorth: (degrees) => {
              if (northArrow)
                northArrow.style.transform = `rotate(${degrees.toFixed(1)}deg)`;
            },
          });
          engine.current = atlas;
          atlas.update(latest.current);
          setLoaded(true);
          latest.current.onReady();
        } catch {
          setFallback(true);
          latest.current.onReady(true);
        }
      })
      .catch(() => {
        if (!disposed) {
          setFallback(true);
          latest.current.onReady(true);
        }
      });
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.update({ progress, lens, mode, zoom, reset, reduced });
  }, [progress, lens, mode, zoom, reset, reduced]);

  return (
    <div
      className={`atlas ${loaded ? "atlas-loaded" : ""} ${fallback ? "atlas-fallback" : ""}`}
    >
      {(fallback || !loaded) && (
        <FlatAtlas progress={progress} lens={lens} zoom={fallback ? zoom : 1} />
      )}
      <div
        ref={mount}
        className="atlas-canvas"
        tabIndex={fallback ? -1 : 0}
        role="application"
        aria-label="Interactive model of Northeast False Creek. Drag to look around. Scroll to explore change. Arrow keys rotate, plus and minus zoom, Home resets."
      />
      {!fallback && (
        <div ref={overlay} className="atlas-labels">
          {sceneLabels.map((label) => (
            <span
              key={label.id}
              className={`place-label ${label.kind || "place"} ${label.kind === "route" && progress < 0.46 ? "label-hidden" : ""} ${label.kind === "route" && lens !== "all" && lens !== "connect" ? "label-hidden" : ""}`}
              data-anchor={label.id}
              data-point={JSON.stringify(label.point)}
              data-height={label.height || 0}
            >
              {label.text}
            </span>
          ))}
          <span
            className={`viaduct-label ${progress > 0.3 ? "label-hidden" : ""}`}
            data-anchor="viaducts"
            data-point="[360,-262]"
            data-height="44"
          >
            <span />
            GEORGIA + DUNSMUIR VIADUCTS
          </span>
          <span
            className={`site-label ${progress > 0.65 || lens !== "all" ? "label-hidden" : ""}`}
            data-anchor="site"
            data-point="[98,-119]"
            data-height="10"
          >
            THE NEXT CHAPTER<span>Concord Landing / 6C</span>
          </span>
          {lenses.map((item) => (
            <button
              key={item.id}
              className={`map-marker ${item.id} ${lens === item.id ? "selected" : ""} ${progress < 0.66 ? "label-hidden" : ""} ${lens !== "all" && lens !== item.id ? "marker-muted" : ""}`}
              aria-label={`Explore ${item.label}`}
              aria-hidden={progress < 0.66}
              tabIndex={progress < 0.66 ? -1 : 0}
              onClick={() => props.onSelect(item.id)}
              data-anchor={`marker-${item.id}`}
              data-point={JSON.stringify(item.point)}
              data-height={item.id === "connect" ? 60 : 28}
            >
              <span className="marker-dot">{item.number}</span>
              <span className="marker-name">{item.short}</span>
            </button>
          ))}
        </div>
      )}
      {fallback && (
        <div className="fallback-note">
          Plan view · interactive 3D unavailable on this device
        </div>
      )}
    </div>
  );
}
