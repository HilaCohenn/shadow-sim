import { useState } from "react";

interface Props {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

export default function LocationPicker({ lat, lon, onChange }: Props) {
  const [inputLat, setInputLat] = useState(String(lat));
  const [inputLon, setInputLon] = useState(String(lon));

  function apply() {
    const la = parseFloat(inputLat);
    const lo = parseFloat(inputLon);
    if (!isNaN(la) && !isNaN(lo)) onChange(la, lo);
  }

  const presets = [
    { label: "New York", lat: 40.71, lon: -74.0 },
    { label: "London", lat: 51.51, lon: -0.13 },
    { label: "Tel Aviv", lat: 32.08, lon: 34.78 },
    { label: "Tokyo", lat: 35.69, lon: 139.69 },
    { label: "Sydney", lat: -33.87, lon: 151.21 },
  ];

  return (
    <div className="panel">
      <h3>Location</h3>
      <div className="presets">
        {presets.map((p) => (
          <button
            key={p.label}
            className="preset-btn"
            onClick={() => {
              setInputLat(String(p.lat));
              setInputLon(String(p.lon));
              onChange(p.lat, p.lon);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="coord-row">
        <label>
          Lat
          <input
            type="number"
            value={inputLat}
            onChange={(e) => setInputLat(e.target.value)}
            step="0.01"
            min="-90"
            max="90"
          />
        </label>
        <label>
          Lon
          <input
            type="number"
            value={inputLon}
            onChange={(e) => setInputLon(e.target.value)}
            step="0.01"
            min="-180"
            max="180"
          />
        </label>
        <button onClick={apply}>Set</button>
      </div>
      <p className="status">
        {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
      </p>
    </div>
  );
}
