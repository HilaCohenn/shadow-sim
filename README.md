# Shadow Simulator

Predict and visualize shadows cast by 3D objects based on geographic location and sun path.

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Usage
1. Upload a 3D model (OBJ / STL / GLTF) — sample in `samples/building.obj`
2. Pick a geographic location (lat/lon)
3. Adjust date/time to see real-time shadow projection
4. Click **Run Full Year** to compute and display the annual shadow histogram
5. Click any bar in the histogram to jump to that day's shadow

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload 3D mesh |
| POST | `/shadow/instant` | Shadow at specific datetime |
| POST | `/simulate/yearly` | Full year simulation |
| GET  | `/health` | Health check |
