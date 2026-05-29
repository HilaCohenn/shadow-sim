import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

const pinIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.6)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  className: "",
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000,
      );
    },
  });
  return null;
}

function MapRef({ mapRef }: { mapRef: { current: L.Map | null } }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

const presets = [
  { label: "New York", lat: 40.71, lon: -74.0 },
  { label: "London", lat: 51.51, lon: -0.13 },
  { label: "Tel Aviv", lat: 32.08, lon: 34.78 },
  { label: "Tokyo", lat: 35.69, lon: 139.69 },
  { label: "Sydney", lat: -33.87, lon: 151.21 },
];

export default function LocationPicker({ lat, lon, onChange }: Props) {
  const [inputLat, setInputLat] = useState(String(lat));
  const [inputLon, setInputLon] = useState(String(lon));
  const mapRef = useRef<L.Map | null>(null);

  function apply() {
    const la = parseFloat(inputLat);
    const lo = parseFloat(inputLon);
    if (!isNaN(la) && !isNaN(lo)) onChange(la, lo);
  }

  function handlePreset(p: (typeof presets)[0]) {
    setInputLat(String(p.lat));
    setInputLon(String(p.lon));
    onChange(p.lat, p.lon);
    mapRef.current?.flyTo([p.lat, p.lon], 12);
  }

  return (
    <div className="panel">
      <h3>Location</h3>
      <div className="presets">
        {presets.map((p) => (
          <button key={p.label} className="preset-btn" onClick={() => handlePreset(p)}>
            {p.label}
          </button>
        ))}
      </div>
      <MapContainer
        center={[lat, lon]}
        zoom={12}
        style={{ height: 180, borderRadius: 4, marginBottom: 8 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[lat, lon]} icon={pinIcon} />
        <ClickHandler
          onMapClick={(la, lo) => {
            setInputLat(String(la));
            setInputLon(String(lo));
            onChange(la, lo);
          }}
        />
        <MapRef mapRef={mapRef} />
      </MapContainer>
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
