export interface DayData {
  day: number;
  date: string;
  month: number;
  peak_area: number;
  total_area_hours: number;
  hours_shaded: number;
}

export interface MeshInfo {
  mesh_id: string;
  vertices: number;
  faces: number;
  bounds: { min: number[]; max: number[] };
  size: { width: number; height: number; depth: number };
}
