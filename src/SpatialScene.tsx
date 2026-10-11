import { useEffect, useRef, useState } from "react";
import {
  futurePark,
  futureZones,
  routes,
  sceneLabels,
  siteOutline,
  transformation,
} from "./narrative";
import type { Lens, Point } from "./narrative";
import type { AtlasEngine, ContextData } from "./atlas-engine";
import type { GeographyData } from "./geography";

type Props = {
  story: number;
  progress: number;
  lens: Lens;
  explore: boolean;
  reset: number;
  reduced: boolean;
  flat: boolean;
  onReady: (fallback?: boolean) => void;
};
function path(points: number[][]) {
  return points.map(([x, z], i) => `${i ? "L" : "M"}${x},${z}`).join(" ") + "Z";
}

function FlatWorld({ progress, lens }: Pick<Props, "progress" | "lens">) {
  const t = transformation(progress);
  const photo = `${import.meta.env.BASE_URL}data/${window.innerWidth < 760 ? "false-creek-2022-small.webp" : "false-creek-2022.webp"}`;
  return (
    <div className="flat-world" aria-hidden="true">
      <svg viewBox="-1234 -891 2468 1892" preserveAspectRatio="xMidYMid slice">
        <image
          href={photo}
          x="-2542"
          y="-2449"
          width="4067"
          height="3673"
          opacity=".64"
        />
        <path
          d={path(siteOutline)}
          fill="#81aeec"
          fillOpacity=".08"
          stroke="#accdff"
          strokeWidth="2"
          strokeDasharray="9 8"
        />
        <path
          d={path(siteOutline)}
          fill="#788999"
          opacity={t.connections * 0.55}
        />
        <path
          d={path(futurePark)}
          fill="#9aac82"
          opacity={t.park * (lens === "all" || lens === "park" ? 0.65 : 0.2)}
        />
        <g
          fill="#cbe1fa"
          fillOpacity=".35"
          stroke="#d7e7ff"
          strokeWidth="2"
          opacity={
            t.neighbourhood * (lens === "all" || lens === "life" ? 1 : 0.3)
          }
        >
          {futureZones.map((zone, i) => (
            <path key={i} d={path(zone)} />
          ))}
        </g>
        <g
          stroke="#9ac3ff"
          strokeWidth="6"
          fill="none"
          opacity={
            t.connections *
            (lens === "all" || lens === "connect" || lens === "water"
              ? 1
              : 0.25)
          }
        >
          {Object.entries(routes).map(([name, points]) => (
            <polyline
              key={name}
              points={points.map((p) => p.join(",")).join(" ")}
            />
          ))}
        </g>
        <g
          fontFamily="DM Sans, sans-serif"
          fontSize="16"
          fill="#f0f1ef"
          stroke="#08101c"
          strokeWidth="4"
          paintOrder="stroke"
        >
          {sceneLabels
            .filter(
              (label) => label.kind !== "route" && label.kind !== "district",
            )
            .map((label) => (
              <text key={label.id} x={label.point[0]} y={label.point[1] - 25}>
                {label.text}
              </text>
            ))}
        </g>
      </svg>
    </div>
  );
}

export function SpatialScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const engine = useRef<AtlasEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { story, progress, lens, explore, reset, reduced, flat } = props;
  const fallback = flat || failed;

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    setLoaded(false);
    if (fallback) {
      latest.current.onReady(true);
      return;
    }
    const nodes = Array.from(
      overlay.current!.querySelectorAll<HTMLElement>("[data-anchor]"),
    );
    const anchors = nodes.map((node) => ({
      id: node.dataset.anchor!,
      point: JSON.parse(node.dataset.point!) as Point,
      height: Number(node.dataset.height ?? 0),
      width: () => node.offsetWidth,
      update: (x: number, y: number, visible: boolean) => {
        node.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        node.style.visibility = visible ? "visible" : "hidden";
      },
    }));
    Promise.all([
      import("./atlas-engine"),
      fetch(`${import.meta.env.BASE_URL}data/context.json`, {
        signal: controller.signal,
      }).then(async (reply) => {
        if (!reply.ok) throw new Error("City context could not be read");
        return reply.json() as Promise<ContextData>;
      }),
      fetch(`${import.meta.env.BASE_URL}data/geography.json`, {
        signal: controller.signal,
      }).then(async (reply) => {
        if (!reply.ok) throw new Error("Geography could not be read");
        return reply.json() as Promise<GeographyData>;
      }),
    ])
      .then(([{ AtlasEngine: Engine }, context, geography]) => {
        if (disposed) return;
        try {
          if (!Array.isArray(context.parts) || !context.parts.length)
            throw new Error("City context has no geometry");
          const atlas = new Engine(mount.current!, {
            anchors,
            context,
            geography,
            onFailure: () => {
              if (!disposed) setFailed(true);
            },
          });
          engine.current = atlas;
          atlas.update(latest.current);
          setLoaded(true);
          latest.current.onReady(false);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      controller.abort();
      engine.current?.dispose();
      engine.current = null;
    };
  }, [fallback]);

  useEffect(() => {
    engine.current?.update({ story, progress, lens, explore, reset, reduced });
  }, [story, progress, lens, explore, reset, reduced]);
  const show = story > 0.095 || explore;
  return (
    <div className={`atlas ${fallback ? "atlas-fallback" : ""}`}>
      {(fallback || !loaded) && <FlatWorld progress={progress} lens={lens} />}
      <div
        ref={mount}
        className="atlas-canvas"
        tabIndex={explore && !fallback ? 0 : -1}
        role={explore && !fallback ? "application" : "img"}
        aria-label={
          fallback
            ? "A 2D geographic view of Northeast False Creek with schematic future relationships."
            : explore
              ? "Northeast False Creek model. On desktop, drag or use arrow keys to look around. Plus and minus zoom; Home resets."
              : "A continuous geographic scene of Northeast False Creek. Scroll the page to follow the story."
        }
      />
      {!fallback && (
        <div className="atlas-labels" ref={overlay} aria-hidden="true">
          {sceneLabels.map((label) => (
            <span
              key={label.id}
              className={`place-label ${label.kind ?? "place"} ${show && (label.kind !== "route" || (progress > 0.55 && (lens === "all" || lens === "connect"))) && (label.kind !== "district" || story < 0.28 || explore) ? "label-show" : ""}`}
              data-anchor={label.id}
              data-point={JSON.stringify(label.point)}
              data-height={label.height ?? 0}
            >
              {label.text === "F A L S E  C R E E K"
                ? "False Creek"
                : label.text}
            </span>
          ))}
          <span
            className={`site-label ${story > 0.19 && story < 0.44 ? "label-show" : ""}`}
            data-anchor="site"
            data-point="[110,-125]"
            data-height="20"
          >
            THE LAST PIECE<span>Concord Landing / Sub-area 6C</span>
          </span>
          <span
            className={`viaduct-label ${(story > 0.27 && progress < 0.35) || (explore && progress === 0) ? "label-show" : ""}`}
            data-anchor="viaducts"
            data-point="[270,-272]"
            data-height="36"
          >
            GEORGIA + DUNSMUIR VIADUCTS
          </span>
        </div>
      )}
    </div>
  );
}
