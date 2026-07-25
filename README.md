# Shadow Simulator

Shadow Simulator is a web application for loading a 3D model and visualizing the shadow it casts for a selected location, date, and time. It also runs a full-year simulation and displays a daily histogram of shadow metrics.

The project has a FastAPI backend for mesh loading and shadow calculations, and a React + TypeScript frontend for the 3D scene, map picker, file upload, and charts.

## Features

- Upload OBJ, STL, GLTF, or GLB 3D models.
- Load built-in sample models from the `samples/` directory.
- Choose a location with preset cities, coordinate inputs, or the interactive map.
- Preview an instant shadow based on UTC date and time.
- Run a yearly simulation and compare daily peak area, area-hours, and daylight hours.
- Inspect the model and shadow dimensions in the 3D viewer.

## Requirements

- Python 3.11 or newer
- Node.js 20 or newer
- npm

## Setup

Install and run the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Install and run the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend expects the backend to run at `http://localhost:8000`.

## Usage

1. Start the backend and frontend.
2. Select one of the sample models or upload a 3D model.
3. Choose a location from the preset buttons, the map, or the latitude/longitude fields.
4. Adjust the UTC date and time to update the instant shadow preview.
5. Click **Run Full Year** to calculate daily results for 2024.
6. Click a bar in the histogram to jump the scene to that day at 12:00 UTC.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend health check |
| GET | `/samples` | List available sample models |
| GET | `/sample?name=building` | Load a sample model into the backend mesh store |
| GET | `/mesh/{mesh_id}/geometry` | Return mesh vertices and faces for rendering |
| POST | `/upload` | Upload a 3D mesh file |
| POST | `/shadow/instant` | Calculate shadow polygon and sun position for a specific UTC datetime |
| POST | `/simulate/yearly` | Run the full-year shadow simulation |

## Project Structure

```text
backend/
  app/
    main.py       FastAPI routes and mesh loading
    shadow.py     Shadow projection geometry
    simulate.py   Yearly aggregation
    sun.py        Sun position helpers
frontend/
  src/
    components/   UI, map, 3D viewer, and histogram components
    api/          Backend client functions
samples/          Built-in OBJ models
uploads/          Example uploaded model
```

## Notes

- Uploaded meshes are stored in memory, so restarting the backend clears uploaded model IDs.
- The model is normalized so its base sits on the ground plane and it is centered around the origin.
- Shadow projection uses the convex hull of projected mesh vertices, so concave shadow detail is approximated.
- Yearly simulation currently uses 2024 from the frontend and samples daylight every 30 minutes.
