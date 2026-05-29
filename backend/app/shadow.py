import numpy as np
from shapely.geometry import MultiPoint
import trimesh


def _project_vertices(mesh: trimesh.Trimesh, sun_dir: tuple):
    """Project mesh vertices onto ground plane (y=0) along sun_dir. Returns (hull, points_2d) or None."""
    sx, sy, sz = sun_dir
    if sy >= 0:
        return None
    vertices = mesh.vertices
    t = -vertices[:, 1] / sy
    points_2d = np.column_stack([vertices[:, 0] + t * sx, vertices[:, 2] + t * sz])
    if len(points_2d) < 3:
        return None
    return MultiPoint(points_2d).convex_hull


def project_shadow(mesh: trimesh.Trimesh, sun_dir: tuple) -> float:
    """Returns shadow area (square units matching mesh scale)."""
    hull = _project_vertices(mesh, sun_dir)
    if hull is None:
        return 0.0
    return hull.area if hull.geom_type in ("Polygon", "MultiPolygon") else 0.0


def shadow_polygon_coords(mesh: trimesh.Trimesh, sun_dir: tuple) -> list:
    """Return convex hull shadow polygon as list of [x, z] pairs (for frontend)."""
    hull = _project_vertices(mesh, sun_dir)
    if hull is None or hull.is_empty or hull.geom_type not in ("Polygon", "MultiPolygon"):
        return []
    return [[float(c[0]), float(c[1])] for c in hull.exterior.coords]
