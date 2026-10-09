import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import geography from "./data/geography.json";
import {
  clamp,
  futurePark,
  futureZones,
  routes,
  siteOutline,
  transformation,
} from "./narrative";
import type { Lens, Point, ViewMode } from "./narrative";

type State = {
  progress: number;
  lens: Lens;
  mode: ViewMode;
  zoom: number;
  reset: number;
  reduced: boolean;
};
type Anchor = {
  id: string;
  point: Point;
  height: number;
  update: (x: number, y: number, visible: boolean) => void;
};
type Options = {
  anchors: Anchor[];
  onInteract: () => void;
  onScrub: (change: number) => void;
  onFailure: () => void;
  onNorth: (degrees: number) => void;
};

const BACKGROUND = "#142e32";
const PALETTE = {
  land: "#688372",
  building: "#dfe2d4",
  park: "#839f77",
  futurePark: "#b6d79d",
  road: "#c4cdbf",
  route: "#ecc296",
  sea: "#72b3ab",
  life: "#e8cc98",
  viaduct: "#b5aa91",
};

function makeShape(rings: number[][][]) {
  const polygon = new THREE.Shape(
    rings[0].map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  rings
    .slice(1)
    .forEach((hole) =>
      polygon.holes.push(
        new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))),
      ),
    );
  return polygon;
}

function extrusion(rings: number[][][], depth: number) {
  const geometry = new THREE.ExtrudeGeometry(makeShape(rings), {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 6,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function mat(color: string, transparent = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    transparent,
    opacity: transparent ? 0 : 1,
  });
}

function lineGeometry(points: number[][], height = 0) {
  return new THREE.BufferGeometry().setFromPoints(
    points.map(([x, z]) => new THREE.Vector3(x, height, z)),
  );
}

function ribbon(points: number[][], width: number, height: number) {
  // Flat strip; architectural model roads never acquire pipe-like silhouettes.
  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i],
      [x2, z2] = points[i + 1];
    const length = Math.hypot(x2 - x1, z2 - z1);
    if (length < 0.01) continue;
    const dx = ((-(z2 - z1) / length) * width) / 2,
      dz = (((x2 - x1) / length) * width) / 2;
    const a = [x1 + dx, height, z1 + dz],
      b = [x1 - dx, height, z1 - dz];
    const c = [x2 + dx, height, z2 + dz],
      d = [x2 - dx, height, z2 - dz];
    positions.push(...a, ...c, ...b, ...b, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

function inside(point: Point, polygon: number[][]) {
  const [x, z] = point;
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i],
      [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      found = !found;
  }
  return found;
}

function random(seed: number) {
  let value = seed | 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}

export class AtlasEngine {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    -1000,
    1000,
    750,
    -750,
    1,
    7000,
  );
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world = new THREE.Group();
  private readonly viaducts = new THREE.Group();
  private readonly existingSite = new THREE.Group();
  private readonly park = new THREE.Group();
  private readonly neighbourhood = new THREE.Group();
  private readonly connections = new THREE.Group();
  private readonly waterfront = new THREE.Group();
  private readonly contextMaterial = mat(PALETTE.building);
  private readonly landMaterial = mat(PALETTE.land);
  private readonly oldMaterial = mat(PALETTE.viaduct, true);
  private readonly siteContextMaterial = mat(PALETTE.building, true);
  private readonly siteStreetMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.road,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.48,
  });
  private readonly parkMaterial = mat(PALETTE.futurePark, true);
  private readonly treeMaterial = mat("#91ad7b", true);
  private readonly lifeMaterial = mat(PALETTE.life, true);
  private readonly connectionMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.route,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  private readonly waterLineMaterial = new THREE.MeshBasicMaterial({
    color: "#acd7c5",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  private readonly siteMaterial = new THREE.LineDashedMaterial({
    color: "#e5c092",
    dashSize: 6,
    gapSize: 5,
    transparent: true,
    opacity: 0.8,
  });
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly markerProjection = new THREE.Vector3();
  private readonly focal = new THREE.Vector3(0, 0, -80);
  private readonly targetFocal = new THREE.Vector3(0, 0, -80);
  private readonly color = new THREE.Color();
  private readonly resources = new Set<THREE.BufferGeometry | THREE.Material>();
  private state: State = {
    progress: 0,
    lens: "all",
    mode: "perspective",
    zoom: 1,
    reset: 0,
    reduced: false,
  };
  private currentProgress = 0;
  private currentZoom = 1;
  private modeMix = 0;
  private yaw = -0.42;
  private targetYaw = -0.42;
  private pitch = 0.83;
  private targetPitch = 0.83;
  private pan: Point = [0, 0];
  private internalZoom = 1;
  private width = 1;
  private height = 1;
  private frame = 0;
  private lastTime = 0;
  private disposed = false;
  private invalidated = true;
  private pointer: { x: number; y: number; id: number } | null = null;
  private observer: ResizeObserver;
  private cleanup: Array<() => void> = [];

  constructor(
    private readonly mount: HTMLDivElement,
    private readonly options: Options,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(BACKGROUND, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.91;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(BACKGROUND, 2150, 3800);
    this.scene.add(this.world);
    this.scene.add(new THREE.HemisphereLight("#e4eee1", "#344e46", 1.9));
    const sun = new THREE.DirectionalLight("#ffecd0", 2.4);
    sun.position.set(-1000, 1600, 750);
    sun.target.position.set(0, 0, -130);
    sun.castShadow = false;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -1500;
    sun.shadow.camera.right = 1500;
    sun.shadow.camera.top = 1300;
    sun.shadow.camera.bottom = -1300;
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 4200;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 1.4;
    sun.shadow.intensity = 0.35;
    this.scene.add(sun, sun.target);

    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        ink: { value: new THREE.Color("#1d4145") },
      },
      vertexShader: `varying vec2 waterPosition; void main(){ waterPosition=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float time; uniform vec3 ink; varying vec2 waterPosition;
        void main(){
          float a=sin(waterPosition.x*0.075+waterPosition.y*0.09+time*0.24);
          float b=sin(waterPosition.x*0.018-waterPosition.y*0.045-time*0.16);
          float line=pow(max(0.0,a*b),16.0)*0.027;
          float light=exp(-length(waterPosition-vec2(50.0,100.0))*0.0006)*0.035;
          gl_FragColor=vec4(ink+vec3(line+light),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(12000, 12000),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    this.world.add(water);
    this.buildContext();
    this.buildTransformation();
    this.registerInputs();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
    this.renderer.shadowMap.needsUpdate = true;
    const visibility = () => {
      if (!document.hidden) this.invalidate();
    };
    document.addEventListener("visibilitychange", visibility);
    this.cleanup.push(() =>
      document.removeEventListener("visibilitychange", visibility),
    );
  }

  private mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    group = this.world,
    shadow = true,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    this.resources.add(geometry);
    this.resources.add(material);
    return mesh;
  }

  private merge(
    geometries: THREE.BufferGeometry[],
    material: THREE.Material,
    group = this.world,
    shadow = true,
  ) {
    if (!geometries.length) return;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (merged) this.mesh(merged, material, group, shadow);
  }

  private buildContext() {
    geography.land.forEach(
      (rings) =>
        (this.mesh(extrusion(rings, 4), this.landMaterial).position.y = -4),
    );
    const context: THREE.BufferGeometry[] = [];
    const siteContext: THREE.BufferGeometry[] = [];
    const contactShadows: THREE.BufferGeometry[] = [];
    const landmarks: THREE.BufferGeometry[] = [];
    geography.buildings.forEach((building) => {
      const [x, z] = building.center;
      if (building.area > 30000 && Math.hypot(x + 216, z + 189) < 100) {
        landmarks.push(extrusion(building.rings, 25));
        return;
      }
      if (Math.hypot(x - 14, z + 317) < 75 && building.area > 8000) {
        landmarks.push(extrusion(building.rings, 30));
        return;
      }
      if (Math.hypot(x - 388, z - 178) < 75 && building.area > 3000) {
        landmarks.push(extrusion(building.rings, 10));
        return;
      }
      // Symbolic context elevations convey grain. Not measured building heights.
      const taller =
        building.area > 500 && building.area < 2400 && (x < -280 || x > 540);
      const height = taller
        ? 35 + (building.id % 4) * 12
        : 9 + (building.id % 3) * 4;
      const affected =
        inside([x, z], siteOutline) || inside([x, z], futurePark);
      (affected ? siteContext : context).push(
        extrusion(building.rings, height),
      );
      const shade = new THREE.ShapeGeometry(makeShape(building.rings));
      shade.rotateX(-Math.PI / 2);
      shade.translate(height * 0.16, 0.15, -height * 0.24);
      if (!affected) contactShadows.push(shade);
      else shade.dispose();
    });
    this.merge(
      contactShadows,
      new THREE.MeshBasicMaterial({
        color: "#29463d",
        transparent: true,
        opacity: 0.19,
        depthWrite: false,
      }),
      this.world,
      false,
    );
    this.merge(context, this.contextMaterial);
    this.merge(siteContext, this.siteContextMaterial, this.existingSite, false);
    this.world.add(this.existingSite);
    this.merge(landmarks, this.contextMaterial);

    const roof = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      mat("#eeefe2"),
    );
    roof.scale.set(114, 25, 98);
    roof.position.set(-216, 29, -189);
    this.world.add(roof);
    this.resources.add(roof.geometry);
    this.resources.add(roof.material);
    const cables: number[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const x = -216 + Math.cos(angle) * 114,
        z = -189 + Math.sin(angle) * 98;
      cables.push(x, 40, z, -216, 55, -189);
      const mast = this.mesh(
        new THREE.CylinderGeometry(0.5, 1, 39, 4),
        mat("#d8dbcf"),
      );
      mast.position.set(x, 45, z);
    }
    const roofLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(cables, 3),
      ),
      new THREE.LineBasicMaterial({
        color: "#74877c",
        transparent: true,
        opacity: 0.35,
      }),
    );
    this.world.add(roofLines);
    this.resources.add(roofLines.geometry);
    this.resources.add(roofLines.material);
    // Landmark symbols, not architectural replicas.
    const sphereGeometry = new THREE.SphereGeometry(26, 12, 8);
    const sphere = this.mesh(sphereGeometry, mat("#d9e3d8"));
    sphere.position.set(388, 31, 178);
    const sphereWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(sphereGeometry),
      new THREE.LineBasicMaterial({
        color: "#70988b",
        transparent: true,
        opacity: 0.46,
      }),
    );
    sphereWire.position.copy(sphere.position);
    this.world.add(sphereWire);
    this.resources.add(sphereWire.geometry);
    this.resources.add(sphereWire.material);

    const streetMat = new THREE.MeshBasicMaterial({
      color: PALETTE.road,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.48,
    });
    const groundRoads: THREE.BufferGeometry[] = [];
    const siteRoads: THREE.BufferGeometry[] = [];
    const elevated: THREE.BufferGeometry[] = [];
    geography.streets.forEach((street) => {
      if (street.name?.includes("VIADUCT")) {
        elevated.push(ribbon(street.points, 11, 24));
        const length = new THREE.CurvePath<THREE.Vector3>();
        street.points
          .slice(1)
          .forEach((p, index) =>
            length.add(
              new THREE.LineCurve3(
                new THREE.Vector3(
                  street.points[index][0],
                  0,
                  street.points[index][1],
                ),
                new THREE.Vector3(p[0], 0, p[1]),
              ),
            ),
          );
        const count = Math.max(1, Math.floor(length.getLength() / 75));
        for (let i = 0; i < count; i++) {
          const p = length.getPoint((i + 0.5) / count);
          const support = this.mesh(
            new THREE.BoxGeometry(3, 23, 3),
            this.oldMaterial,
            this.viaducts,
            false,
          );
          support.position.set(p.x, 11.5, p.z);
        }
      } else {
        const arterial = /PACIFIC|EXPO|MAIN|QUEBEC/.test(street.name || "");
        const affected = street.points.some(
          (p) =>
            inside(p as Point, siteOutline) || inside(p as Point, futurePark),
        );
        (affected ? siteRoads : groundRoads).push(
          ribbon(street.points, arterial ? 10 : 6, 0.6),
        );
      }
    });
    this.merge(groundRoads, streetMat, this.world, false);
    this.merge(siteRoads, this.siteStreetMaterial, this.world, false);
    this.oldMaterial.side = THREE.DoubleSide;
    this.merge(elevated, this.oldMaterial, this.viaducts, false);
    this.world.add(this.viaducts);

    geography.parks.forEach((park) => {
      const green = this.mesh(
        extrusion(park.rings, 0.8),
        mat(PALETTE.park),
        this.world,
        false,
      );
      green.position.y = 0.15;
    });
    const trees: Point[] = [];
    const rng = random(811);
    geography.parks.forEach((park) => {
      const ring = park.rings[0];
      const xs = ring.map((p) => p[0]),
        zs = ring.map((p) => p[1]);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minZ = Math.min(...zs),
        maxZ = Math.max(...zs);
      for (
        let i = 0;
        i < Math.min(95, ((maxX - minX) * (maxZ - minZ)) / 550);
        i++
      ) {
        const point: Point = [
          minX + rng() * (maxX - minX),
          minZ + rng() * (maxZ - minZ),
        ];
        if (inside(point, ring)) trees.push(point);
      }
    });
    this.makeTrees(trees, mat("#81a17c"), this.world, 4.1);
    const shoreMat = new THREE.LineBasicMaterial({
      color: "#aec5b9",
      transparent: true,
      opacity: 0.6,
    });
    geography.shoreline.forEach((points) => {
      const shore = new THREE.Line(lineGeometry(points, 0.5), shoreMat);
      this.world.add(shore);
      this.resources.add(shore.geometry);
    });
    this.resources.add(shoreMat);
  }

  private makeTrees(
    points: Point[],
    material: THREE.Material,
    group: THREE.Group,
    size: number,
    ground = 0,
  ) {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const trees = new THREE.InstancedMesh(geometry, material, points.length);
    const dummy = new THREE.Object3D();
    const rng = random(42);
    points.forEach(([x, z], index) => {
      const r = size * (0.7 + rng() * 0.6);
      dummy.position.set(x, ground + r * 1.2, z);
      dummy.scale.set(r, r * 1.35, r);
      dummy.updateMatrix();
      trees.setMatrixAt(index, dummy.matrix);
    });
    trees.castShadow = true;
    trees.receiveShadow = true;
    group.add(trees);
    this.resources.add(geometry);
    this.resources.add(material);
    return trees;
  }

  private buildTransformation() {
    const site = new THREE.Line(
      lineGeometry(siteOutline, 1.3),
      this.siteMaterial,
    );
    site.computeLineDistances();
    this.world.add(site);
    this.resources.add(site.geometry);
    this.resources.add(this.siteMaterial);
    this.parkMaterial.depthWrite = false;
    this.treeMaterial.depthWrite = false;
    const parkSurface = this.mesh(
      extrusion([futurePark], 2.0),
      this.parkMaterial,
      this.park,
      false,
    );
    parkSurface.position.y = 1;
    parkSurface.renderOrder = 2;
    const rng = random(270);
    const trees: Point[] = [];
    for (let i = 0; i < 650; i++) {
      const point: Point = [230 + rng() * 200, -195 + rng() * 408];
      if (inside(point, futurePark)) trees.push(point);
    }
    this.makeTrees(trees, this.treeMaterial, this.park, 4.4, 3).renderOrder = 3;
    this.world.add(this.park);
    this.lifeMaterial.depthWrite = false;
    futureZones.forEach((zone, index) => {
      // Low, uniform plates indicate conceptual mixed-use areas, not buildings.
      this.mesh(
        extrusion([zone], 18),
        this.lifeMaterial,
        this.neighbourhood,
        false,
      ).position.y = 1;
      const cap = new THREE.Line(
        lineGeometry([...zone, zone[0]], 20),
        new THREE.LineBasicMaterial({
          color: "#f2d6a8",
          transparent: true,
          opacity: 0.75,
        }),
      );
      this.neighbourhood.add(cap);
      this.resources.add(cap.geometry);
      this.resources.add(cap.material);
      cap.userData.zone = index;
    });
    this.world.add(this.neighbourhood);
    Object.entries(routes).forEach(([key, points]) => {
      if (key === "waterfront")
        this.mesh(
          ribbon(points, 3.5, 2.8),
          this.waterLineMaterial,
          this.waterfront,
          false,
        );
      else
        this.mesh(
          ribbon(points, key === "pacific" ? 8 : 4, 2.5),
          this.connectionMaterial,
          this.connections,
          false,
        );
    });
    this.world.add(this.connections, this.waterfront);
  }

  private listen<K extends keyof HTMLElementEventMap>(
    type: K,
    callback: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) {
    this.mount.addEventListener(type, callback, options);
    this.cleanup.push(() => this.mount.removeEventListener(type, callback));
  }

  private registerInputs() {
    this.listen("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.mount.focus({ preventScroll: true });
      this.mount.setPointerCapture(event.pointerId);
      this.pointer = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      this.mount.classList.add("is-dragging");
      this.options.onInteract();
    });
    this.listen("pointermove", (event) => {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const dx = event.clientX - this.pointer.x,
        dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      if (this.state.mode === "plan") {
        this.pan = [
          clamp(this.pan[0] - dx * 1.15, -350, 350),
          clamp(this.pan[1] - dy * 1.15, -350, 350),
        ];
      } else {
        this.targetYaw = clamp(this.targetYaw - dx * 0.003, -1.0, 0.65);
        this.targetPitch = clamp(this.targetPitch + dy * 0.003, 0.58, 1.23);
      }
      this.invalidate();
    });
    const end = () => {
      this.pointer = null;
      this.mount.classList.remove("is-dragging");
    };
    this.listen("pointerup", end);
    this.listen("pointercancel", end);
    this.listen("lostpointercapture", end);
    this.listen(
      "wheel",
      (event) => {
        if (event.ctrlKey) return; // Retain the browser's zoom gesture.
        event.preventDefault();
        this.options.onScrub(clamp(event.deltaY, -140, 140) / 1800);
      },
      { passive: false },
    );
    this.listen("keydown", (event) => {
      const keys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "Home",
      ];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      this.options.onInteract();
      if (event.key === "Home") this.resetView();
      else if (event.key === "+" || event.key === "=")
        this.internalZoom = clamp(this.internalZoom + 0.12, 0.7, 1.8);
      else if (event.key === "-")
        this.internalZoom = clamp(this.internalZoom - 0.12, 0.7, 1.8);
      else if (this.state.mode === "plan") {
        if (event.key === "ArrowLeft") this.pan[0] -= 50;
        if (event.key === "ArrowRight") this.pan[0] += 50;
        if (event.key === "ArrowUp") this.pan[1] -= 50;
        if (event.key === "ArrowDown") this.pan[1] += 50;
        this.pan = this.pan.map((v) => clamp(v, -350, 350)) as Point;
      } else {
        if (event.key === "ArrowLeft") this.targetYaw -= 0.09;
        if (event.key === "ArrowRight") this.targetYaw += 0.09;
        if (event.key === "ArrowUp") this.targetPitch += 0.08;
        if (event.key === "ArrowDown") this.targetPitch -= 0.08;
        this.targetYaw = clamp(this.targetYaw, -1.0, 0.65);
        this.targetPitch = clamp(this.targetPitch, 0.58, 1.23);
      }
      this.invalidate();
    });
    const lost = (event: Event) => {
      event.preventDefault();
      this.options.onFailure();
    };
    this.renderer.domElement.addEventListener("webglcontextlost", lost);
    this.cleanup.push(() =>
      this.renderer.domElement.removeEventListener("webglcontextlost", lost),
    );
  }

  private resetView() {
    this.targetYaw = -0.42;
    this.targetPitch = 0.83;
    this.pan = [0, 0];
    this.internalZoom = 1;
    this.invalidate();
  }

  update(state: State) {
    if (state.reset !== this.state.reset) this.resetView();
    if (state.zoom !== this.state.zoom) this.internalZoom = 1;
    this.state = { ...state };
    this.invalidate();
  }

  private resize() {
    this.width = Math.max(1, this.mount.clientWidth);
    this.height = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.invalidate();
  }

  private invalidate() {
    this.invalidated = true;
    if (!this.frame && !this.disposed)
      this.frame = requestAnimationFrame(this.animate);
  }

  private animate = (time: number) => {
    this.frame = 0;
    if (this.disposed || !this.invalidated) return;
    const delta = Math.min(50, time - this.lastTime || 16);
    this.lastTime = time;
    if (document.hidden) return;
    const damping = this.state.reduced ? 1 : 1 - Math.exp(-delta / 150);
    this.currentProgress +=
      (this.state.progress - this.currentProgress) * damping;
    this.yaw += (this.targetYaw - this.yaw) * damping;
    this.pitch += (this.targetPitch - this.pitch) * damping;
    this.modeMix +=
      ((this.state.mode === "plan" ? 1 : 0) - this.modeMix) * damping;
    const focus =
      this.state.lens === "water"
        ? [-30, 40]
        : this.state.lens === "park"
          ? [250, -30]
          : this.state.lens === "connect"
            ? [100, -275]
            : this.state.lens === "life"
              ? [60, -125]
              : [0, -80];
    this.targetFocal.set(
      focus[0] * 0.65 + this.pan[0],
      0,
      focus[1] * 0.65 + this.pan[1],
    );
    this.focal.lerp(this.targetFocal, damping);
    const lensZoom = this.state.lens === "all" ? 1 : 1.18;
    const targetZoom =
      this.state.zoom *
      this.internalZoom *
      lensZoom *
      (1 + this.currentProgress * 0.08);
    this.currentZoom += (targetZoom - this.currentZoom) * damping;
    const mobile = window.innerWidth < 760;
    const viewHeight = (mobile ? 1180 : 1100) / this.currentZoom;
    const aspect = this.width / this.height;
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    const angle = THREE.MathUtils.lerp(
      this.pitch,
      Math.PI / 2 - 0.001,
      this.modeMix,
    );
    const radius = 2500;
    this.camera.position.set(
      this.focal.x + Math.sin(this.yaw) * Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      this.focal.z + Math.cos(this.yaw) * Math.cos(angle) * radius,
    );
    this.camera.up.set(0, 1 - this.modeMix, -this.modeMix).normalize();
    this.camera.lookAt(this.focal);
    this.camera.updateMatrixWorld();
    const center = this.focal.clone().project(this.camera);
    const north = this.focal
      .clone()
      .add(new THREE.Vector3(0, 0, -100))
      .project(this.camera);
    this.options.onNorth(
      (Math.atan2(
        (north.x - center.x) * this.width,
        (north.y - center.y) * this.height,
      ) *
        180) /
        Math.PI,
    );

    const t = transformation(this.currentProgress);
    const opacity = (id: Lens) =>
      this.state.lens === "all" || this.state.lens === id ? 1 : 0.2;
    this.oldMaterial.opacity = t.existing * 0.9;
    this.siteContextMaterial.opacity = 1 - t.park;
    this.existingSite.visible = t.park < 0.999;
    this.siteStreetMaterial.opacity = 0.48 * (1 - t.connections);
    this.viaducts.visible = t.existing > 0.01;
    this.viaducts.position.y = -(1 - t.existing) * 25;
    this.parkMaterial.opacity = t.park * opacity("park") * 0.95;
    this.treeMaterial.opacity = t.park * opacity("park");
    this.park.visible = t.park > 0.005;
    this.park.scale.y = Math.max(0.01, t.park);
    this.lifeMaterial.opacity = t.neighbourhood * opacity("life") * 0.95;
    this.neighbourhood.visible = t.neighbourhood > 0.005;
    this.neighbourhood.scale.y = Math.max(0.01, t.neighbourhood);
    this.neighbourhood.children.forEach((child) => {
      if (child instanceof THREE.Line)
        child.material.opacity = t.neighbourhood * opacity("life") * 0.8;
    });
    this.connectionMaterial.opacity = t.connections * opacity("connect") * 0.95;
    this.connections.visible = t.connections > 0.005;
    this.waterLineMaterial.opacity =
      t.connections *
      (this.state.lens === "all" || this.state.lens === "water" ? 1 : 0.28);
    this.waterfront.visible = t.connections > 0.005;
    this.siteMaterial.opacity =
      this.state.lens === "all" ? 0.7 - t.neighbourhood * 0.35 : 0.2;
    this.contextMaterial.color.lerp(
      this.color.set(this.state.lens === "all" ? PALETTE.building : "#9baea1"),
      damping,
    );
    this.landMaterial.color.lerp(
      this.color.set(this.state.lens === "all" ? PALETTE.land : "#768f83"),
      damping,
    );
    if (!this.state.reduced)
      this.waterMaterial.uniforms.time.value = time / 1000;
    this.renderer.render(this.scene, this.camera);
    this.options.anchors.forEach((anchor) => {
      this.markerProjection
        .set(anchor.point[0], anchor.height, anchor.point[1])
        .project(this.camera);
      const x = (this.markerProjection.x * 0.5 + 0.5) * this.width;
      const y = (-this.markerProjection.y * 0.5 + 0.5) * this.height;
      anchor.update(
        x,
        y,
        x > 35 && x < this.width - 50 && y > 65 && y < this.height - 45,
      );
    });
    const still =
      Math.abs(this.state.progress - this.currentProgress) < 0.001 &&
      Math.abs(targetZoom - this.currentZoom) < 0.001 &&
      Math.abs(this.targetYaw - this.yaw) < 0.001 &&
      Math.abs(this.targetPitch - this.pitch) < 0.001 &&
      Math.abs((this.state.mode === "plan" ? 1 : 0) - this.modeMix) < 0.001 &&
      this.focal.distanceTo(this.targetFocal) < 0.1;
    this.invalidated = !still;
    if (!still) this.frame = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.cleanup.forEach((fn) => fn());
    this.world.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        this.resources.add(object.geometry);
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => this.resources.add(material));
      }
    });
    this.resources.forEach((resource) => resource.dispose());
    this.waterMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.world.clear();
  }
}
