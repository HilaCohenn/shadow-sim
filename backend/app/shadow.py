import numpy as np
from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union
import trimesh


def project_shadow(mesh: trimesh.Trimesh, sun_dir: tuple) -> float:
    """
    Project mesh vertices onto ground plane (y=0) along sun_dir.
    Returns shadow area (square units matching mesh scale).
    sun_dir: unit vector FROM sun TOWARD origin (dx, dy, dz).
    """
    sx, sy, sz = sun_dir
    if sy >= 0:
        # sun below horizon or at horizon — no shadow
        return 0.0

    vertices = mesh.vertices  # (N, 3)
    # parametric: P + t*sun_dir hits y=0 when P.y + t*sy = 0 => t = -P.y/sy
    t = -vertices[:, 1] / sy
    # shadow point on ground
    shadow_x = vertices[:, 0] + t * sx
    shadow_z = vertices[:, 2] + t * sz

    points_2d = np.column_stack([shadow_x, shadow_z])

    if len(points_2d) < 3:
        return 0.0

    hull = MultiPoint(points_2d).convex_hull
    return hull.area if hull.geom_type in ("Polygon", "MultiPolygon") else 0.0


def shadow_polygon_coords(mesh: trimesh.Trimesh, sun_dir: tuple) -> list:
    """Return convex hull shadow polygon as list of [x, z] pairs (for frontend)."""
    sx, sy, sz = sun_dir
    if sy >= 0:
        return []

    vertices = mesh.vertices
    t = -vertices[:, 1] / sy
    shadow_x = vertices[:, 0] + t * sx
    shadow_z = vertices[:, 2] + t * sz
    points_2d = np.column_stack([shadow_x, shadow_z])

    if len(points_2d) < 3:
        return []

    hull = MultiPoint(points_2d).convex_hull
    if hull.is_empty or hull.geom_type not in ("Polygon", "MultiPolygon"):
        return []

    coords = list(hull.exterior.coords)
    return [[float(c[0]), float(c[1])] for c in coords]
