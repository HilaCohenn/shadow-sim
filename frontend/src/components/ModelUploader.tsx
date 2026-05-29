import { useRef, useState } from "react";
import { uploadModel } from "../api/client";

interface Props {
  onUploaded: (meshId: string, info: any) => void;
}

export default function ModelUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus("Uploading...");
    try {
      const info = await uploadModel(file);
      setStatus(`Loaded: ${info.vertices} vertices, ${info.faces} faces`);
      onUploaded(info.mesh_id, info);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h3>3D Model</h3>
      <button onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "Loading..." : "Upload OBJ / STL / GLTF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".obj,.stl,.gltf,.glb"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {status && <p className="status">{status}</p>}
    </div>
  );
}
