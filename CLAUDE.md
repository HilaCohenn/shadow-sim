# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Shadow Simulator predicts and visualizes shadows cast by 3D objects based on geographic location and sun path. Users upload OBJ/STL/GLTF models, pick a lat/lon, and either scrub through time to see real-time shadow projections or run a full-year simulation that produces an interactive D3 histogram.

## Commands

### Backend (Python / FastAPI)

```bash
cd backend
source .venv/bin/activate        # activate venv
uvicorn app.main:app --reload    # dev server on :8000
```

The venv lives at `backend/.venv`. Install dependencies with:
```bash
pip install -r requirements.txt
```

### Frontend (React / Vite / TypeScript)

```bash
cd frontend
npm install
npm run dev      # dev server on :5173
npm run build    # tsc + vite build
npm run lint     # eslint
```

The frontend hard-codes `http://localhost:8000` as the API base in [frontend/src/api/client.ts](frontend/src/api/client.ts).

## Architecture

### Backend (`backend/app/`)

The pipeline flows through three modules:

1. **`sun.py`** — wraps `pysolar` to compute sun altitude/azimuth for a given lat/lon/UTC datetime, then converts those angles to a 3D direction vector pointing *from* the sun *toward* the origin. Also provides `daylight_samples()` which yields UTC datetimes only when the sun is above the horizon.

2. **`shadow.py`** — takes a `trimesh.Trimesh` and the sun direction vector, projects all mesh vertices onto the ground plane (y=0) using parametric ray intersection, then computes the convex hull of those projected points via `shapely`. Returns either the hull area (float) or the hull polygon coordinates (list of `[x, z]` pairs for the frontend).

3. **`simulate.py`** — calls `daylight_samples` + `project_shadow` for every day of the year at 30-minute steps, aggregating `peak_area`, `total_area_hours`, and `hours_shaded` per day.

**`main.py`** ties these together as a FastAPI app with an in-memory mesh store (`_mesh_store: dict[str, trimesh.Trimesh]`). Meshes are keyed by a simple `mesh_N` id returned to the frontend on upload. On upload, meshes are normalized: base placed at y=0, centered on the xz origin. The `GET /sample` endpoint loads `samples/building.obj` directly from disk without a file upload.

### Frontend (`frontend/src/`)

State lives entirely in `App.tsx`. The component tree is flat — four independent panel components talk to `App` only through props and callbacks:

- **`ModelUploader`** — file input that POSTs to `/upload`, returns `mesh_id` and mesh info up to App.
- **`LocationPicker`** — Leaflet map for picking lat/lon; calls `onChange(lat, lon)`.
- **`SceneViewer`** — Three.js scene (WebGL canvas) showing a placeholder box mesh, a movable sun sphere, and the shadow polygon (rendered as a `THREE.ShapeGeometry` on the ground plane, y=0.1). The scene is initialized once in a `useEffect` and updated via two separate effects for sun position and shadow polygon. The actual uploaded mesh geometry is **not** rendered in Three.js — only a placeholder box; the real shadow polygon comes from the backend.
- **`ShadowHistogram`** — D3 bar chart rendered into an SVG ref. Each bar represents one day; clicking a bar calls `onDaySelect` which jumps the scene to noon on that day.

`api/client.ts` contains all fetch calls; all endpoints use `multipart/form-data` (via `FormData`), not JSON bodies.

### Key constraint

The shadow projection algorithm uses **convex hull only** — concave geometry or holes in a shadow are not modeled. The mesh coordinate system is Y-up; shadow coordinates are (x, z) on the ground plane.
