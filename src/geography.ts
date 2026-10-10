export type GeographyData = {
  origin: [number, number];
  bounds: [number, number, number, number];
  land: number[][][][];
  shoreline: number[][][];
  buildings: Array<{
    // City object_id can be shared by separate parts of a MultiPolygon.
    id: number;
    rings: number[][][];
    area: number;
    center: [number, number];
  }>;
  streets: Array<{
    name: string | null;
    use: string | null;
    points: number[][];
  }>;
  parks: Array<{ name: string; rings: number[][][] }>;
};
