export type GeographyData = {
  origin: [number, number];
  bounds: [number, number, number, number];
  land: number[][][][];
  shoreline: number[][][];
  buildings: Array<{
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
