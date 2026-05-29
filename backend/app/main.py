import io
import tempfile
import os
from datetime import datetime, timezone
from typing import Annotated

import trimesh
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .sun import sun_position, sun_direction_vector
from .shadow import project_shadow, shadow_polygon_coords
from .simulate import run_yearly_simulation

app = FastAPI(title="Shadow Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for uploaded meshes (keyed by session id)
_mesh_store: dict[str, trimesh.Trimesh] = {}


def _load_mesh(data: bytes, filename: str) -> trimesh.Trimesh:
    ext = os.path.splitext(filename)[1].lower()
    mesh = trimesh.load(io.BytesIO(data), file_type=ext.lstrip("."))
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
    if not isinstance(mesh, trimesh.Trimesh):
        raise ValueError("Could not parse mesh")
    # Normalize: place base at y=0, center xz at origin
    mesh.vertices -= mesh.bounds[0]  # min to origin
    cx, _, cz = (mesh.bounds[0] + mesh.bounds[1]) / 2
    mesh.vertices[:, 0] -= cx
    mesh.vertices[:, 2] -= cz
    return mesh


@app.post("/upload")
async def upload_model(file: UploadFile = File(...)):
    data = await file.read()
    try:
        mesh = _load_mesh(data, file.filename)
    except Exception as e:
        raise HTTPException(400, f"Mesh load failed: {e}")

    mesh_id = f"mesh_{len(_mesh_store)}"
    _mesh_store[mesh_id] = mesh

    bounds = mesh.bounds.tolist()
    return {
        "mesh_id": mesh_id,
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "bounds": {"min": bounds[0], "max": bounds[1]},
        "size": {
            "width": round(bounds[1][0] - bounds[0][0], 3),
            "height": round(bounds[1][1] - bounds[0][1], 3),
            "depth": round(bounds[1][2] - bounds[0][2], 3),
        },
    }


@app.post("/shadow/instant")
async def instant_shadow(
    mesh_id: Annotated[str, Form()],
    lat: Annotated[float, Form()],
    lon: Annotated[float, Form()],
    datetime_utc: Annotated[str, Form()],
):
    mesh = _mesh_store.get(mesh_id)
    if mesh is None:
        raise HTTPException(404, "Mesh not found")

    dt = datetime.fromisoformat(datetime_utc).replace(tzinfo=timezone.utc)
    pos = sun_position(lat, lon, dt)
    if pos["altitude"] <= 0:
        return {"shadow_area": 0.0, "polygon": [], "sun": pos}

    sun_dir = sun_direction_vector(pos["altitude"], pos["azimuth"])
    area = project_shadow(mesh, sun_dir)
    poly = shadow_polygon_coords(mesh, sun_dir)

    return {
        "shadow_area": round(area, 3),
        "polygon": poly,
        "sun": {k: round(v, 2) for k, v in pos.items()},
    }


@app.post("/simulate/yearly")
async def simulate_yearly(
    mesh_id: Annotated[str, Form()],
    lat: Annotated[float, Form()],
    lon: Annotated[float, Form()],
    year: Annotated[int, Form()] = 2024,
):
    mesh = _mesh_store.get(mesh_id)
    if mesh is None:
        raise HTTPException(404, "Mesh not found")

    results = run_yearly_simulation(mesh, lat, lon, year, step_minutes=30)
    return {"year": year, "lat": lat, "lon": lon, "days": results}


@app.get("/sample")
def load_sample():
    """Load the bundled sample building.obj and return a mesh_id ready for simulation."""
    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "samples", "building.obj")
    sample_path = os.path.abspath(sample_path)
    if not os.path.exists(sample_path):
        raise HTTPException(404, "Sample model not found")
    with open(sample_path, "rb") as f:
        data = f.read()
    try:
        mesh = _load_mesh(data, "building.obj")
    except Exception as e:
        raise HTTPException(400, f"Mesh load failed: {e}")

    mesh_id = "mesh_sample"
    _mesh_store[mesh_id] = mesh

    bounds = mesh.bounds.tolist()
    return {
        "mesh_id": mesh_id,
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "bounds": {"min": bounds[0], "max": bounds[1]},
        "size": {
            "width": round(bounds[1][0] - bounds[0][0], 3),
            "height": round(bounds[1][1] - bounds[0][1], 3),
            "depth": round(bounds[1][2] - bounds[0][2], 3),
        },
    }


@app.get("/mesh/{mesh_id}/geometry")
def get_mesh_geometry(mesh_id: str):
    mesh = _mesh_store.get(mesh_id)
    if mesh is None:
        raise HTTPException(404, "Mesh not found")
    return {
        "vertices": mesh.vertices.tolist(),
        "faces": mesh.faces.tolist(),
    }


@app.get("/health")
def health():
    return {"status": "ok"}
