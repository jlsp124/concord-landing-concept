export type Point = [number, number];
export type Lens = "all" | "water" | "park" | "connect" | "life";

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

// Narrative order, deliberately independent of any construction schedule.
export function transformation(value: number) {
  const t = clamp(value);
  return {
    existing: 1 - smoothstep(0.15, 0.5, t),
    connections: smoothstep(0.2, 0.6, t),
    park: smoothstep(0.4, 0.78, t),
    neighbourhood: smoothstep(0.66, 0.98, t),
  };
}

export const lenses: Array<{
  id: Exclude<Lens, "all">;
  number: string;
  label: string;
  short: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  source: string;
  sourceLabel: string;
  point: Point;
}> = [
  {
    id: "water",
    number: "01",
    label: "The waterfront",
    short: "Waterfront",
    eyebrow: "City + water",
    title: "An edge becomes a destination.",
    description:
      "Georgia Landing is envisioned as a meeting of city and water. An active waterfront and pedestrian lanes could connect everyday life to False Creek.",
    note: "Waterfront alignment shown schematically.",
    source: "https://vancouver.ca/home-property-development/urban-design.aspx",
    sourceLabel: "City urban design policy",
    point: [-10, 50],
  },
  {
    id: "park",
    number: "02",
    label: "Park & public realm",
    short: "Public realm",
    eyebrow: "Landscape + belonging",
    title: "More room for public life.",
    description:
      "The Creekside Park extension is envisioned north of Science World. Open space, a richer shoreline, and places to gather would connect new and existing communities.",
    note: "Landscape represents intent, not a final park design.",
    source: "https://vancouver.ca/home-property-development/park-design.aspx",
    sourceLabel: "City park design principles",
    point: [290, -60],
  },
  {
    id: "connect",
    number: "03",
    label: "City connections",
    short: "Connections",
    eyebrow: "Downtown + neighbourhoods",
    title: "The city, stitched together.",
    description:
      "The area plan replaces the viaducts with a ground-level street network. Georgia Street, the Dunsmuir Connection, and Carrall Greenway bring city and waterfront into closer relationship.",
    note: "Routes illustrate policy intent, not engineered alignments.",
    source:
      "https://vancouver.ca/home-property-development/streetscape-design.aspx",
    sourceLabel: "City streets & connectivity policy",
    point: [130, -300],
  },
  {
    id: "life",
    number: "04",
    label: "Neighbourhood life",
    short: "Neighbourhood",
    eyebrow: "Homes + work + everyday life",
    title: "A neighbourhood beyond its buildings.",
    description:
      "Homes, commercial space, social housing, and active pedestrian lanes form part of the public 6C proposal. Their relationship to the park and water is the story here.",
    note: "Abstract zones. No buildings, plans, or availability represented.",
    source: "https://www.shapeyourcity.ca/811-carrall-st",
    sourceLabel: "City Sub-area 6C proposal · on hold",
    point: [90, -145],
  },
];

export const sceneLabels: Array<{
  id: string;
  text: string;
  point: Point;
  height?: number;
  kind?: "place" | "district" | "water" | "route";
}> = [
  { id: "bc", text: "BC PLACE", point: [-216, -190], height: 80 },
  { id: "rogers", text: "ROGERS ARENA", point: [15, -318], height: 38 },
  { id: "science", text: "SCIENCE WORLD", point: [388, 178], height: 48 },
  { id: "chinatown", text: "CHINATOWN", point: [460, -570], kind: "district" },
  { id: "yaletown", text: "YALETOWN", point: [-830, 60], kind: "district" },
  {
    id: "olympic",
    text: "OLYMPIC VILLAGE",
    point: [40, 570],
    kind: "district",
  },
  {
    id: "falsecreek",
    text: "F A L S E  C R E E K",
    point: [-210, 310],
    kind: "water",
  },
  {
    id: "andy",
    text: "ANDY LIVINGSTONE PARK",
    point: [345, -400],
    kind: "district",
  },
  { id: "georgia", text: "GEORGIA LANDING", point: [-65, -10], kind: "route" },
  {
    id: "dunsmuir",
    text: "DUNSMUIR CONNECTION",
    point: [100, -290],
    kind: "route",
  },
  {
    id: "carrall",
    text: "CARRALL GREENWAY",
    point: [205, -395],
    kind: "route",
  },
];

// Original conceptual overlays, informed by public policy and City diagrams.
// Positions / shapes are illustrative. They are not survey or rezoning geometry.
export const siteOutline: Point[] = [
  [-130, -105],
  [-75, -238],
  [0, -275],
  [100, -225],
  [210, -193],
  [282, -148],
  [264, -68],
  [165, -78],
  [82, -72],
  [40, -55],
  [22, 45],
  [-25, 83],
  [-92, 95],
  [-139, 45],
  [-130, -105],
];

export const futurePark: Point[] = [
  [235, -204],
  [375, -209],
  [444, -166],
  [449, -81],
  [434, -32],
  [436, 90],
  [415, 142],
  [407, 204],
  [377, 221],
  [352, 213],
  [339, 193],
  [349, 167],
  [366, 145],
  [384, 141],
  [390, 73],
  [392, 13],
  [403, -22],
  [400, -45],
  [392, -53],
  [365, -57],
  [293, -55],
  [263, -63],
  [237, -62],
  [221, -76],
  [218, -132],
  [235, -204],
];

export const futureZones: Point[][] = [
  [
    [-115, -137],
    [-74, -225],
    [-30, -244],
    [-12, -168],
    [-55, -128],
  ],
  [
    [-48, -113],
    [-4, -159],
    [24, -242],
    [83, -211],
    [52, -136],
    [12, -88],
  ],
  [
    [32, -74],
    [76, -129],
    [103, -208],
    [153, -193],
    [146, -116],
    [102, -79],
  ],
  [
    [122, -78],
    [163, -112],
    [178, -183],
    [215, -167],
    [235, -138],
    [222, -79],
  ],
];

export const routes: Record<
  "georgia" | "dunsmuir" | "carrall" | "pacific" | "waterfront",
  Point[]
> = {
  georgia: [
    [-222, -397],
    [-134, -310],
    [-87, -235],
    [-40, -140],
    [-45, -72],
    [-61, -18],
    [-82, 66],
  ],
  dunsmuir: [
    [-77, -506],
    [15, -414],
    [77, -357],
    [139, -302],
    [216, -243],
    [287, -193],
    [331, -166],
  ],
  carrall: [
    [289, -456],
    [241, -380],
    [206, -327],
    [210, -273],
    [241, -203],
    [289, -153],
    [330, -85],
  ],
  pacific: [
    [-521, 54],
    [-405, -39],
    [-307, -113],
    [-213, -146],
    [-111, -197],
    [-4, -249],
    [100, -268],
    [219, -239],
    [362, -224],
    [493, -221],
    [606, -215],
    [686, -187],
  ],
  waterfront: [
    [-430, 274],
    [-344, 219],
    [-228, 157],
    [-153, 100],
    [-106, 92],
    [-86, 57],
    [-41, 58],
    [8, 42],
    [33, -16],
    [54, -63],
    [95, -64],
    [149, -65],
    [210, -48],
    [270, -49],
    [331, -44],
    [379, -30],
    [372, 64],
    [365, 130],
    [333, 167],
    [330, 202],
    [356, 232],
    [400, 240],
  ],
};
