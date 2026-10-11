import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { GeographyData } from "./geography";
import {
  clamp,
  futurePark,
  futureZones,
  routes,
  siteOutline,
  smoothstep,
  transformation,
} from "./narrative";
import type { Lens, Point } from "./narrative";
import { cameraAt, motionBlend, portraitFov } from "./scene-score";
import { pathDistance, ribbonVertices } from "./scene-geometry";

type State = {
  story: number;
  progress: number;
  lens: Lens;
  explore: boolean;
  reset: number;
  reduced: boolean;
};
export type ContextData = {
  parts: Array<{
    id: number;
    rings: number[][][];
    h: number;
    g: number;
    b?: number;
  }>;
};
type Anchor = {
  id: string;
  point: Point;
  height: number;
  width: () => number;
  update: (x: number, y: number, visible: boolean) => void;
};
type Options = {
  anchors: Anchor[];
  context: ContextData;
  geography: GeographyData;
  onFailure: () => void;
};

const BACKGROUND = "#0a1525";
const PALETTE = {
  land: "#596673",
  building: "#c3cbd0",
  park: "#425c40",
  futurePark: "#638253",
  road: "#9ba5af",
  route: "#79a8eb",
  life: "#b2d2f6",
  viaduct: "#afaca4",
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
    roughness: 0.68,
    metalness: 0.12,
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
  // Joined, ground-level strips keep the original geographic alignment.
  const positions = ribbonVertices(points, width, height);
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
  private readonly geography: GeographyData;
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 2, 6500);
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
  private readonly clearedGroundMaterial = mat("#707983", true);
  private readonly siteContextMaterial = mat(PALETTE.building, true);
  private readonly siteStreetMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.road,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.48,
  });
  private readonly parkMaterial = mat(PALETTE.futurePark, true);
  private readonly treeMaterial = mat("#62864f", true);
  private readonly lifeMaterial = mat(PALETTE.life, true);
  private readonly connectionMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.route,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  private readonly waterLineMaterial = new THREE.MeshBasicMaterial({
    color: "#91baf2",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  private readonly siteMaterial = new THREE.LineDashedMaterial({
    color: "#8bb6f2",
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
  private readonly contextTrees: Point[] = [];
  private readonly resources = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  >();
  private state: State = {
    story: 0,
    progress: 0,
    lens: "all",
    explore: false,
    reset: 0,
    reduced: false,
  };
  private currentProgress = 0;
  private currentStory = 0;
  private currentZoom = 1;
  private yaw = 0;
  private targetYaw = 0;
  private pitch = 0;
  private targetPitch = 0;
  private internalZoom = 1;
  private width = 1;
  private height = 1;
  private frameHeight = 1;
  private frame = 0;
  private lastTime = 0;
  private disposed = false;
  private invalidated = true;
  private pointer: { x: number; y: number; id: number } | null = null;
  private observer: ResizeObserver | null = null;
  private anchorWidths: number[] = [];
  private firstFrame = 0;
  private introProgress = 0;
  private slowFrames = 0;
  private quality = 1;
  private cleanup: Array<() => void> = [];

  constructor(
    private readonly mount: HTMLDivElement,
    private readonly options: Options,
  ) {
    this.geography = options.geography;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(BACKGROUND, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;
    this.renderer.shadowMap.enabled = window.innerWidth >= 1000;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(BACKGROUND, 0.00038);
    this.scene.add(this.world);
    this.scene.add(new THREE.HemisphereLight("#c1d7f1", "#243146", 1.8));
    const sun = new THREE.DirectionalLight("#ffe5c9", 2.2);
    sun.position.set(-1000, 1600, 750);
    sun.target.position.set(0, 0, -130);
    sun.castShadow = true;
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
        ink: { value: new THREE.Color("#102943") },
      },
      vertexShader: `varying vec2 waterPosition; void main(){ waterPosition=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float time; uniform vec3 ink; varying vec2 waterPosition;
        void main(){
          float a=sin(waterPosition.x*0.13+waterPosition.y*0.21+time*0.24);
          float b=sin(waterPosition.x*0.18-waterPosition.y*0.085-time*0.16);
          float line=pow(max(0.0,a*b),14.0)*0.006;
          float light=exp(-length(waterPosition-vec2(250.0,100.0))*0.001)*0.018;
          gl_FragColor=vec4(ink+vec3(line*.7+light*.55,line+light*.7,line+light),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const [west, south, east, north] = this.geography.bounds;
    const [lon0, lat0] = this.geography.origin;
    const longitudeMetres = Math.cos((lat0 * Math.PI) / 180) * 111320;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (east - west) * longitudeMetres,
        (north - south) * 111320,
      ),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(
      ((west + east) / 2 - lon0) * longitudeMetres,
      -1,
      (lat0 - (north + south) / 2) * 111320,
    );
    this.world.add(water);
    const distantGround = this.mesh(
      new THREE.PlaneGeometry(16000, 16000),
      mat("#182331"),
    );
    distantGround.rotation.x = -Math.PI / 2;
    distantGround.position.y = -4.2;
    try {
      this.buildContext();
      this.buildTransformation();
      this.registerInputs();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(mount);
      this.resize();
      void document.fonts.ready.then(() => this.resize());
    } catch (error) {
      this.dispose();
      throw error;
    }
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
    const geography = this.geography;
    geography.land.forEach(
      (rings) =>
        (this.mesh(extrusion(rings, 4), this.landMaterial).position.y = -4),
    );
    const [west, south, east, north] = geography.bounds;
    const [lon0, lat0] = geography.origin;
    const metreLon = Math.cos((lat0 * Math.PI) / 180) * 111320;
    const minX = (west - lon0) * metreLon,
      maxX = (east - lon0) * metreLon;
    const minZ = (lat0 - north) * 111320,
      maxZ = (lat0 - south) * 111320;
    const groundMaterial = mat("#9ca5ae");
    groundMaterial.roughness = 1;
    groundMaterial.metalness = 0;
    geography.land.forEach((rings) => {
      const geometry = new THREE.ShapeGeometry(makeShape(rings));
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.getAttribute("position");
      const uv: number[] = [];
      for (let i = 0; i < positions.count; i++)
        uv.push(
          (positions.getX(i) - minX) / (maxX - minX),
          (maxZ - positions.getZ(i)) / (maxZ - minZ),
        );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      this.mesh(geometry, groundMaterial).position.y = 0.12;
    });
    const textureName =
      window.innerWidth < 760
        ? "false-creek-2022-small.webp"
        : "false-creek-2022.webp";
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}data/${textureName}`,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          4,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        this.resources.add(texture);
        groundMaterial.map = texture;
        groundMaterial.needsUpdate = true;
        this.invalidate();
      },
    );
    // Original facade treatment. Geometry is grounded in GIS, not this light pattern.
    this.contextMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vCity; varying vec3 vCityNormal;",
        )
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvCity=(modelMatrix*vec4(transformed,1.0)).xyz; vCityNormal=normalize(mat3(modelMatrix)*normal);",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vCity; varying vec3 vCityNormal;",
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float wall=1.0-step(0.5,abs(vCityNormal.y));
          float pane=step(0.22,fract((vCity.x+vCity.z)*0.18))*step(0.24,fract(vCity.y/3.3))*wall;
          float lamp=step(0.973,fract(sin(dot(floor(vCity/vec3(5.5,3.3,5.5)),vec3(12.9898,78.233,43.21)))*43758.5453));
          diffuseColor.rgb*=mix(1.0,0.78,pane);
          totalEmissiveRadiance+=vec3(0.60,0.33,0.14)*lamp*pane;
        `,
        );
    };
    const context: THREE.BufferGeometry[] = [];
    const siteContext: THREE.BufferGeometry[] = [];
    const contactShadows: THREE.BufferGeometry[] = [];
    const landmarks: THREE.BufferGeometry[] = [];
    const landmarkIds = new Set<number>();
    const affectedIds = new Set<number>();
    geography.buildings.forEach((building) => {
      const [x, z] = building.center;
      if (building.area > 30000 && Math.hypot(x + 216, z + 189) < 100) {
        landmarks.push(extrusion(building.rings, 25));
        landmarkIds.add(building.id);
        return;
      }
      if (Math.hypot(x - 14, z + 317) < 75 && building.area > 8000) {
        landmarks.push(extrusion(building.rings, 30));
        landmarkIds.add(building.id);
        return;
      }
      if (Math.hypot(x - 388, z - 178) < 75 && building.area > 3000) {
        landmarks.push(extrusion(building.rings, 10));
        landmarkIds.add(building.id);
        return;
      }
      const affected =
        inside([x, z], siteOutline) || inside([x, z], futurePark);
      if (affected) affectedIds.add(building.id);
      const shade = new THREE.ShapeGeometry(makeShape(building.rings));
      shade.rotateX(-Math.PI / 2);
      shade.translate(5, 0.18, -8);
      if (!affected) contactShadows.push(shade);
      else shade.dispose();
    });
    this.options.context.parts.forEach((part) => {
      if (landmarkIds.has(part.id)) return;
      const base = part.b ?? 0;
      const geometry = extrusion(part.rings, part.h - base);
      geometry.translate(0, base, 0);
      (affectedIds.has(part.id) ? siteContext : context).push(geometry);
    });
    this.clearedGroundMaterial.depthWrite = false;
    this.mesh(
      extrusion([siteOutline], 0.35),
      this.clearedGroundMaterial,
      this.world,
      false,
    ).position.y = 0.15;
    this.merge(
      contactShadows,
      new THREE.MeshBasicMaterial({
        color: "#07101f",
        transparent: true,
        opacity: 0.32,
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
      mat("#f2f1e7"),
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
        mat("#d8e0e7"),
      );
      mast.position.set(x, 45, z);
    }
    const roofLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(cables, 3),
      ),
      new THREE.LineBasicMaterial({
        color: "#687b92",
        transparent: true,
        opacity: 0.35,
      }),
    );
    this.world.add(roofLines);
    this.resources.add(roofLines.geometry);
    this.resources.add(roofLines.material);
    // Landmark symbols, not architectural replicas.
    const sphereGeometry = new THREE.IcosahedronGeometry(26, 3);
    const sphere = this.mesh(sphereGeometry, mat("#d0e0f1"));
    sphere.position.set(388, 31, 178);
    const sphereWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(sphereGeometry),
      new THREE.LineBasicMaterial({
        color: "#86a7d0",
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
      opacity: 0.23,
    });
    const groundRoads: THREE.BufferGeometry[] = [];
    const siteRoads: THREE.BufferGeometry[] = [];
    const elevated: THREE.BufferGeometry[] = [];
    const clearedRoads: THREE.BufferGeometry[] = [];
    geography.streets.forEach((street) => {
      if (street.name?.includes("VIADUCT")) {
        elevated.push(ribbon(street.points, 11, 24));
        clearedRoads.push(ribbon(street.points, 20, 0.5));
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
    this.merge(clearedRoads, this.clearedGroundMaterial, this.world, false);
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
        if (
          inside(point, ring) &&
          !park.rings.slice(1).some((hole) => inside(point, hole)) &&
          pathDistance(point, [...ring, ring[0]]) > 4.8 &&
          Math.hypot(point[0] - 388, point[1] - 178) > 63 &&
          trees.every(
            (other) =>
              Math.hypot(point[0] - other[0], point[1] - other[1]) >= 10,
          )
        )
          trees.push(point);
      }
    });
    this.contextTrees.push(...trees);
    this.makeTrees(trees, mat("#5b8050"), this.world, 4.1);
    const shoreMat = new THREE.LineBasicMaterial({
      color: "#9cb6d3",
      transparent: true,
      opacity: 0.25,
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
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const trees = new THREE.InstancedMesh(geometry, material, points.length);
    const dummy = new THREE.Object3D();
    const rng = random(42);
    const tint = new THREE.Color();
    points.forEach(([x, z], index) => {
      const r = size * (0.85 + rng() * 0.3);
      dummy.position.set(x, ground + r * 1.2, z);
      dummy.scale.set(r * 0.94, r * 1.25, r);
      dummy.rotation.y = rng() * Math.PI;
      dummy.updateMatrix();
      trees.setMatrixAt(index, dummy.matrix);
      const shade = 0.88 + rng() * 0.12;
      trees.setColorAt(
        index,
        tint.setRGB(shade, Math.min(1, shade + 0.03), shade * 0.94),
      );
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
    for (let i = 0; i < 190; i++) {
      const point: Point = [230 + rng() * 200, -195 + rng() * 408];
      if (
        inside(point, futurePark) &&
        Math.hypot(point[0] - 388, point[1] - 178) > 65 &&
        pathDistance(point, futurePark) > 5.5 &&
        Object.values(routes).every(
          (route) => pathDistance(point, route) > 7,
        ) &&
        [...this.contextTrees, ...trees].every(
          (other) => Math.hypot(point[0] - other[0], point[1] - other[1]) >= 11,
        )
      )
        trees.push(point);
    }
    const futureTrees = this.makeTrees(
      trees,
      this.treeMaterial,
      this.park,
      4.4,
      3,
    );
    futureTrees.renderOrder = 3;
    futureTrees.castShadow = false;
    this.world.add(this.park);
    this.lifeMaterial.depthWrite = false;
    this.lifeMaterial.emissive.set("#6c9ed9");
    this.lifeMaterial.emissiveIntensity = 0.18;
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
          color: "#b4d2f4",
          transparent: true,
          opacity: 0.55,
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
      if (
        !this.state.explore ||
        this.width <= 760 ||
        event.pointerType === "touch" ||
        event.button !== 0
      )
        return;
      this.mount.focus({ preventScroll: true });
      this.mount.setPointerCapture(event.pointerId);
      this.pointer = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      this.mount.classList.add("is-dragging");
    });
    this.listen("pointermove", (event) => {
      if (!this.state.explore) return;
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const dx = event.clientX - this.pointer.x,
        dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.targetYaw = clamp(this.targetYaw - dx * 0.0025, -0.48, 0.48);
      this.targetPitch = clamp(this.targetPitch + dy * 0.0015, -0.16, 0.2);
      this.invalidate();
    });
    const end = () => {
      this.pointer = null;
      this.mount.classList.remove("is-dragging");
    };
    this.listen("pointerup", end);
    this.listen("pointercancel", end);
    this.listen("lostpointercapture", end);
    // Wheel and touch remain native page scroll, even in exploration.
    this.listen("keydown", (event) => {
      if (
        !this.state.explore ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "Home",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key === "Home") this.resetView();
      if (event.key === "+" || event.key === "=")
        this.internalZoom = clamp(this.internalZoom + 0.12, 0.7, 1.65);
      if (event.key === "-")
        this.internalZoom = clamp(this.internalZoom - 0.12, 0.7, 1.65);
      if (event.key === "ArrowLeft")
        this.targetYaw = clamp(this.targetYaw - 0.09, -0.48, 0.48);
      if (event.key === "ArrowRight")
        this.targetYaw = clamp(this.targetYaw + 0.09, -0.48, 0.48);
      if (event.key === "ArrowUp")
        this.targetPitch = clamp(this.targetPitch + 0.06, -0.16, 0.2);
      if (event.key === "ArrowDown")
        this.targetPitch = clamp(this.targetPitch - 0.06, -0.16, 0.2);
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
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.internalZoom = 1;
    this.invalidate();
  }

  update(state: State) {
    if (
      state.reset !== this.state.reset ||
      state.explore !== this.state.explore
    )
      this.resetView();
    this.state = { ...state };
    this.invalidate();
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    if (this.frameHeight === 1 || width !== this.width)
      this.frameHeight = height;
    this.width = width;
    this.height = height;
    this.anchorWidths = this.options.anchors.map((anchor) => anchor.width());
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.width < 760 ? 1.3 : 1.5) *
        this.quality,
    );
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
    if (this.disposed || !this.invalidated || document.hidden) return;
    const first = !this.firstFrame;
    if (first) {
      this.firstFrame = time;
      this.currentStory = this.state.story;
      this.currentProgress = this.state.progress;
    }
    const delta = Math.min(50, time - this.lastTime || 16);
    this.lastTime = time;
    this.slowFrames =
      delta > 35 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.quality > 0.65) {
      this.quality = Math.max(0.65, this.quality - 0.15);
      this.slowFrames = 0;
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, this.width < 760 ? 1.3 : 1.5) *
          this.quality,
      );
      this.renderer.setSize(this.width, this.height);
    }
    const damping = this.state.reduced ? 1 : motionBlend(delta);
    this.currentStory += (this.state.story - this.currentStory) * damping;
    this.currentProgress +=
      (this.state.progress - this.currentProgress) * damping;
    this.yaw += (this.targetYaw - this.yaw) * damping;
    this.pitch += (this.targetPitch - this.pitch) * damping;
    this.currentZoom += (this.internalZoom - this.currentZoom) * damping;
    const mobile = this.width <= 760;
    const pose = cameraAt(this.state.reduced ? 1 : this.currentStory, mobile);
    const intro = (this.introProgress = this.state.reduced
      ? 1
      : Math.max(
          this.introProgress,
          smoothstep(0, 4200, time - this.firstFrame),
          smoothstep(0, 0.08, this.currentStory),
        ));
    pose.position[1] -= (1 - intro) * 140;
    pose.position[2] += (1 - intro) * 160;
    if (
      this.state.explore &&
      !this.state.reduced &&
      this.state.lens !== "all"
    ) {
      const focus =
        this.state.lens === "water"
          ? [-20, 60]
          : this.state.lens === "park"
            ? [300, -30]
            : this.state.lens === "connect"
              ? [140, -270]
              : [90, -130];
      pose.target[0] += (focus[0] - pose.target[0]) * 0.65;
      pose.target[2] += (focus[1] - pose.target[2]) * 0.65;
    }
    this.targetFocal.fromArray(pose.target);
    // Scroll is already damped in score space. A second Cartesian interpolation
    // cuts across the orbit during touch momentum and introduces radial drift.
    if (this.state.explore)
      this.focal.lerp(this.targetFocal, first ? 1 : damping);
    else this.focal.copy(this.targetFocal);
    const direction = new THREE.Vector3(...pose.position).sub(this.focal);
    direction
      .applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"))
      .divideScalar(this.currentZoom);
    const desired = this.focal.clone().add(direction);
    this.camera.position.copy(desired);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = mobile
      ? portraitFov(pose.fov, this.height, this.frameHeight)
      : pose.fov;
    this.camera.setViewOffset(
      this.width,
      this.height,
      mobile ? 0 : -this.width * 0.12,
      mobile ? (this.height - this.frameHeight) / 2 : 0,
      this.width,
      this.height,
    );
    this.camera.lookAt(this.focal);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    const t = transformation(this.currentProgress);
    const opacity = (id: Lens) =>
      this.state.lens === "all" || this.state.lens === id ? 1 : 0.2;
    this.oldMaterial.opacity = t.existing * 0.96;
    this.clearedGroundMaterial.opacity = (1 - t.existing) * 0.95;
    this.siteContextMaterial.opacity = 1 - t.park;
    this.existingSite.visible = t.park < 0.999;
    this.siteStreetMaterial.opacity = 0.28 * (1 - t.connections);
    this.viaducts.visible = t.existing > 0.01;
    this.viaducts.position.y = -(1 - t.existing) * 25;
    this.parkMaterial.opacity = t.park * opacity("park") * 0.9;
    this.treeMaterial.opacity = t.park * opacity("park");
    this.treeMaterial.depthWrite = t.park > 0.98 && opacity("park") === 1;
    this.park.visible = t.park > 0.005;
    this.park.scale.y = Math.max(0.01, t.park);
    this.lifeMaterial.opacity = t.neighbourhood * opacity("life") * 0.42;
    this.neighbourhood.visible = t.neighbourhood > 0.005;
    this.neighbourhood.scale.y = Math.max(0.01, t.neighbourhood);
    this.neighbourhood.children.forEach((child) => {
      if (child instanceof THREE.Line)
        child.material.opacity = t.neighbourhood * opacity("life") * 0.55;
    });
    this.connectionMaterial.opacity =
      t.connections *
      opacity("connect") *
      (this.state.lens === "connect" ? 0.92 : 0.65);
    this.connections.visible = t.connections > 0.005;
    this.connections.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const count = child.geometry.getAttribute("position").count;
        child.geometry.setDrawRange(
          0,
          Math.floor((count * t.connections) / 6) * 6,
        );
      }
    });
    this.waterLineMaterial.opacity =
      t.connections *
      (this.state.lens === "water"
        ? 0.92
        : this.state.lens === "all"
          ? 0.72
          : 0.2);
    this.waterfront.visible = t.connections > 0.005;
    this.siteMaterial.opacity =
      (1 - t.connections) * (this.state.lens === "all" ? 0.55 : 0.12);
    this.contextMaterial.color.lerp(
      this.color.set(this.state.lens === "all" ? PALETTE.building : "#889bb3"),
      damping,
    );
    if (!this.state.reduced)
      this.waterMaterial.uniforms.time.value = time / 1000;
    this.renderer.render(this.scene, this.camera);
    this.mount.dataset.calls = String(this.renderer.info.render.calls);
    this.mount.dataset.triangles = String(this.renderer.info.render.triangles);
    this.mount.dataset.quality = this.quality.toFixed(2);
    this.mount.dataset.camera = this.camera.position
      .toArray()
      .map((n) => n.toFixed(1))
      .join(",");
    this.mount.dataset.fov = this.camera.fov.toFixed(2);
    this.mount.dataset.frameHeight = String(this.frameHeight);
    this.options.anchors.forEach((anchor, index) => {
      this.markerProjection
        .set(anchor.point[0], anchor.height, anchor.point[1])
        .project(this.camera);
      const x = (this.markerProjection.x * 0.5 + 0.5) * this.width,
        y = (-this.markerProjection.y * 0.5 + 0.5) * this.height;
      const inFrame =
        this.markerProjection.z > -1 &&
        this.markerProjection.z < 1 &&
        x > 25 &&
        x < this.width - Math.max(80, this.anchorWidths[index] + 14) &&
        y > 110 &&
        y < this.height - 115;
      const clearText = mobile
        ? y > 360 || x > this.width * 0.76
        : x > Math.min(430, this.width * 0.41) || y > this.height * 0.74;
      anchor.update(x, y, inFrame && clearText);
    });
    const still =
      Math.abs(this.state.story - this.currentStory) < 0.0001 &&
      Math.abs(this.state.progress - this.currentProgress) < 0.0001 &&
      Math.abs(this.internalZoom - this.currentZoom) < 0.001 &&
      Math.abs(this.targetYaw - this.yaw) < 0.001 &&
      Math.abs(this.targetPitch - this.pitch) < 0.001 &&
      this.focal.distanceTo(this.targetFocal) < 0.1 &&
      this.camera.position.distanceTo(desired) < 0.1 &&
      intro === 1;
    this.invalidated = !still;
    this.mount.dataset.rendering = still ? "idle" : "moving";
    if (!still) this.frame = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
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
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.world.clear();
  }
}
