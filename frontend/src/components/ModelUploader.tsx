import { useRef, useState, useEffect } from "react";
import { uploadModel, loadSample, listSamples } from "../api/client";
import type { MeshInfo } from "../types";

interface Props {
  onUploaded: (meshId: string, info: MeshInfo) => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function ModelUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<{ name: string; label: string }[]>([]);
  const [activeSample, setActiveSample] = useState<string>("building");
  const [activeLabel, setActiveLabel] = useState<string>("Office Building");

  useEffect(() => {
    listSamples().then(setSamples).catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus("Uploading...");
    setActiveSample("");
    setActiveLabel(file.name);
    try {
      const info = await uploadModel(file);
      setStatus(`Loaded: ${info.vertices} vertices, ${info.faces} faces`);
      onUploaded(info.mesh_id, info);
    } catch (err: unknown) {
      setStatus(`Error: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSample(name: string) {
    setLoading(true);
    setStatus("");
    setActiveSample(name);
    setActiveLabel(samples.find((s) => s.name === name)?.label ?? name);
    try {
      const info = await loadSample(name);
      onUploaded(info.mesh_id, info);
    } catch (err: unknown) {
      setStatus(`Error: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h3>3D Model</h3>
      {samples.length > 0 && (
        <div className="presets">
          {samples.map((s) => (
            <button
              key={s.name}
              className={`preset-btn${activeSample === s.name ? " active" : ""}`}
              onClick={() => handleSample(s.name)}
              disabled={loading}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => inputRef.current?.click()} disabled={loading} style={{ marginTop: "0.5rem" }}>
        {loading ? "Loading..." : "Upload OBJ / STL / GLTF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".obj,.stl,.gltf,.glb"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {activeLabel && (
        <p className="status" style={{ marginTop: "0.5rem" }}>
          Active: <strong>{activeLabel}</strong>
        </p>
      )}
      {status && <p className="status">{status}</p>}
    </div>
  );
}
