import { useState, useCallback, useEffect } from "react";
import ModelUploader from "./components/ModelUploader";
import LocationPicker from "./components/LocationPicker";
import SceneViewer from "./components/SceneViewer";
import ShadowHistogram from "./components/ShadowHistogram";
import { instantShadow, simulateYearly, loadSample } from "./api/client";
import type { DayData, MeshInfo } from "./types";
import "./App.css";

type Metric = "peak_area" | "total_area_hours" | "hours_shaded";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function App() {
  const [meshId, setMeshId] = useState<string | null>(null);
  const [meshInfo, setMeshInfo] = useState<MeshInfo | null>(null);
  const [lat, setLat] = useState(32.08);
  const [lon, setLon] = useState(34.78);
  const [datetime, setDatetime] = useState(() => {
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [shadowPolygon, setShadowPolygon] = useState<number[][] | null>(null);
  const [sunPos, setSunPos] = useState({ altitude: 45, azimuth: 180 });
  const [yearlyData, setYearlyData] = useState<DayData[]>([]);
  const [metric, setMetric] = useState<Metric>("peak_area");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    loadSample("building")
      .then((info) => {
        setMeshId(info.mesh_id);
        setMeshInfo(info);
        fetchInstant(info.mesh_id, lat, lon, datetime);
      })
      .catch(() => {});
  }, [datetime, lat, lon]);

  async function fetchInstant(mid: string, la: number, lo: number, dt: string) {
    if (!mid) return;
    try {
      const res = await instantShadow(mid, la, lo, dt + ":00");
      setShadowPolygon(res.polygon?.length ? res.polygon : null);
      setSunPos({ altitude: res.sun.altitude, azimuth: res.sun.azimuth });
    } catch {
      // silent
    }
  }

  function handleUploaded(id: string, info: MeshInfo) {
    setMeshId(id);
    setMeshInfo(info);
    fetchInstant(id, lat, lon, datetime);
  }

  function handleLocationChange(la: number, lo: number) {
    setLat(la);
    setLon(lo);
    if (meshId) fetchInstant(meshId, la, lo, datetime);
  }

  function handleDatetimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dt = e.target.value;
    setDatetime(dt);
    if (meshId) fetchInstant(meshId, lat, lon, dt);
  }

  async function handleSimulate() {
    if (!meshId) return;
    setSimLoading(true);
    setSimError("");
    try {
      const res = await simulateYearly(meshId, lat, lon, 2024);
      setYearlyData(res.days);
    } catch (err: unknown) {
      setSimError(getErrorMessage(err));
    } finally {
      setSimLoading(false);
    }
  }

  const handleDaySelect = useCallback(
    (day: DayData) => {
      setSelectedDay(day);
      if (meshId) fetchInstant(meshId, lat, lon, `${day.date}T12:00`);
    },
    [meshId, lat, lon]
  );

  return (
    <div className="app">
      <header className="header">
        <h1>Shadow Simulator</h1>
        <span className="subtitle">3D object shadow projection · daily &amp; yearly analysis</span>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <ModelUploader onUploaded={handleUploaded} />
          <LocationPicker lat={lat} lon={lon} onChange={handleLocationChange} />

          <div className="panel">
            <h3>Date &amp; Time (UTC)</h3>
            <input
              type="datetime-local"
              value={datetime}
              onChange={handleDatetimeChange}
              className="dt-input"
            />
            <div className="hour-slider-row">
              <label>Hour: {datetime.slice(11, 13)}:00 UTC</label>
              <input
                type="range"
                min={0}
                max={23}
                value={Number(datetime.slice(11, 13))}
                onChange={(e) => {
                  const h = e.target.value.padStart(2, "0");
                  const dt = `${datetime.slice(0, 11)}${h}:00`;
                  setDatetime(dt);
                  if (meshId) fetchInstant(meshId, lat, lon, dt);
                }}
                className="hour-slider"
              />
            </div>
            <p className="status">
              Sun: alt {sunPos.altitude.toFixed(1)}° · az {sunPos.azimuth.toFixed(1)}°
            </p>
          </div>

          {meshId && (
            <div className="panel">
              <h3>Yearly Simulation</h3>
              <button onClick={handleSimulate} disabled={simLoading} className="sim-btn">
                {simLoading ? "Running… (~30s)" : "Run Full Year"}
              </button>
              {simError && <p className="error">{simError}</p>}
            </div>
          )}

          {meshInfo && (
            <div className="panel">
              <h3>Model Info</h3>
              <p>{meshInfo.size.width} × {meshInfo.size.height} × {meshInfo.size.depth} m</p>
              <p>{meshInfo.vertices} vertices · {meshInfo.faces} faces</p>
            </div>
          )}
        </aside>

        <main className="scene-area">
          <SceneViewer
            meshId={meshId}
            meshInfo={meshInfo}
            shadowPolygon={shadowPolygon}
            sunAzimuth={sunPos.azimuth}
            sunAltitude={sunPos.altitude}
          />
        </main>
      </div>

      {yearlyData.length > 0 && (
        <section className="histogram-section">
          <div className="histogram-header">
            <h2>Annual Shadow Histogram</h2>
            <div className="metric-tabs">
              {(["peak_area", "total_area_hours", "hours_shaded"] as Metric[]).map((m) => (
                <button
                  key={m}
                  className={metric === m ? "tab active" : "tab"}
                  onClick={() => setMetric(m)}
                >
                  {m === "peak_area" ? "Peak Area" : m === "total_area_hours" ? "Area·Hours" : "Hours Shaded"}
                </button>
              ))}
            </div>
          </div>

          {selectedDay && (
            <div className="selected-day">
              <strong>{selectedDay.date}</strong> — Peak: {selectedDay.peak_area} m² ·
              Hours shaded: {selectedDay.hours_shaded}h ·
              Area·hours: {selectedDay.total_area_hours}
            </div>
          )}

          <div style={{ position: "relative" }}>
            <ShadowHistogram data={yearlyData} metric={metric} onDaySelect={handleDaySelect} />
          </div>
        </section>
      )}

      {!meshId && (
        <div className="empty-state">
          Upload a 3D model (OBJ, STL, GLTF) to begin shadow analysis
        </div>
      )}
    </div>
  );
}
