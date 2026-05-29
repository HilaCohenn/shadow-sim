const BASE = "http://localhost:8000";

export async function listSamples(): Promise<{ name: string; label: string }[]> {
  const res = await fetch(`${BASE}/samples`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function loadSample(name = "building") {
  const res = await fetch(`${BASE}/sample?name=${name}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadModel(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function instantShadow(meshId: string, lat: number, lon: number, datetimeUtc: string) {
  const fd = new FormData();
  fd.append("mesh_id", meshId);
  fd.append("lat", String(lat));
  fd.append("lon", String(lon));
  fd.append("datetime_utc", datetimeUtc);
  const res = await fetch(`${BASE}/shadow/instant`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMeshGeometry(meshId: string): Promise<{ vertices: number[][], faces: number[][] }> {
  const res = await fetch(`${BASE}/mesh/${meshId}/geometry`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function simulateYearly(meshId: string, lat: number, lon: number, year: number) {
  const fd = new FormData();
  fd.append("mesh_id", meshId);
  fd.append("lat", String(lat));
  fd.append("lon", String(lon));
  fd.append("year", String(year));
  const res = await fetch(`${BASE}/simulate/yearly`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
