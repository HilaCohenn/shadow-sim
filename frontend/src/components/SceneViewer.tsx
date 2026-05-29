import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getMeshGeometry } from "../api/client";
import type { MeshInfo } from "../types";

interface Props {
  meshId?: string | null;
  meshInfo?: MeshInfo | null;
  shadowPolygon: number[][] | null;
  sunAzimuth: number;
  sunAltitude: number;
}

export default function SceneViewer({ meshId, meshInfo, shadowPolygon, sunAzimuth, sunAltitude }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sunRadiusRef = useRef(30);
  const raycasterRef = useRef(new THREE.Raycaster());
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    meshObj: THREE.Mesh | null;
    shadowMesh: THREE.Mesh | null;
    sunSphere: THREE.Mesh;
    ground: THREE.Mesh;
    grid: THREE.GridHelper;
    frameId: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w || 800, h || 500, false);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(50, (w || 800) / (h || 500), 0.1, 2000);
    camera.position.set(-20, 30, 25);
    camera.lookAt(0, 5, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: 0x2d5a27, side: THREE.DoubleSide })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 30, 0x444444, 0x333333);
    scene.add(grid);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    scene.add(sunSphere);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 5, 0);
    controls.update();

    let frameId = 0;
    let active = true;

    function render() {
      if (!active) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    }
    render();

    sceneRef.current = { renderer, scene, camera, controls, meshObj: null, shadowMesh: null, sunSphere, ground, grid, frameId };

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width < 10 || height < 10) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    return () => {
      active = false;
      ro.disconnect();
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Load mesh geometry and rescale scene to fit
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    if (ctx.meshObj) {
      ctx.scene.remove(ctx.meshObj);
      ctx.meshObj.geometry.dispose();
      (ctx.meshObj.material as THREE.Material).dispose();
      ctx.meshObj = null;
    }

    if (!meshId) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(10, 20, 10),
        new THREE.MeshLambertMaterial({ color: 0x6688cc })
      );
      box.position.y = 10;
      ctx.scene.add(box);
      ctx.meshObj = box;
      return;
    }

    let cancelled = false;
    getMeshGeometry(meshId).then(({ vertices, faces }) => {
      if (cancelled) return;
      const ctx2 = sceneRef.current;
      if (!ctx2) return;

      if (ctx2.meshObj) {
        ctx2.scene.remove(ctx2.meshObj);
        ctx2.meshObj.geometry.dispose();
        (ctx2.meshObj.material as THREE.Material).dispose();
        ctx2.meshObj = null;
      }

      const positions = new Float32Array(vertices.length * 3);
      for (let i = 0; i < vertices.length; i++) {
        positions[i * 3]     = vertices[i][0];
        positions[i * 3 + 1] = vertices[i][1];
        positions[i * 3 + 2] = vertices[i][2];
      }
      const indices = new Uint32Array(faces.length * 3);
      for (let i = 0; i < faces.length; i++) {
        indices[i * 3]     = faces[i][0];
        indices[i * 3 + 1] = faces[i][1];
        indices[i * 3 + 2] = faces[i][2];
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setIndex(new THREE.BufferAttribute(indices, 1));
      geo.computeVertexNormals();

      const mat = new THREE.MeshLambertMaterial({ color: 0x6688cc, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      ctx2.scene.add(mesh);
      ctx2.meshObj = mesh;

      // Scale scene elements to mesh bounding box
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      const groundSize = maxDim * 2.5;
      const gridDivisions = Math.max(10, Math.round(groundSize / 5));
      const camDist = maxDim * 4;
      const sunR = camDist * 0.6;
      sunRadiusRef.current = sunR;

      // Reposition sun sphere immediately with new radius
      const az2  = (sunAzimuth  * Math.PI) / 180;
      const alt2 = (sunAltitude * Math.PI) / 180;
      ctx2.sunSphere.position.set(
        sunR * Math.sin(az2)  * Math.cos(alt2),
        sunR * Math.sin(alt2),
        -sunR * Math.cos(az2) * Math.cos(alt2)
      );
      ctx2.sunSphere.geometry.dispose();
      ctx2.sunSphere.geometry = new THREE.SphereGeometry(sunR * 0.03, 12, 12);

      // Update ground
      ctx2.scene.remove(ctx2.ground);
      ctx2.ground.geometry.dispose();
      ctx2.ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundSize, groundSize),
        new THREE.MeshLambertMaterial({ color: 0x2d5a27, side: THREE.DoubleSide })
      );
      ctx2.ground.rotation.x = -Math.PI / 2;
      ctx2.scene.add(ctx2.ground);

      // Update grid
      ctx2.scene.remove(ctx2.grid);
      ctx2.grid = new THREE.GridHelper(groundSize, gridDivisions, 0x444444, 0x333333);
      ctx2.scene.add(ctx2.grid);

      // Sync aspect from actual canvas before placing camera
      const canvas2 = canvasRef.current;
      if (canvas2 && canvas2.clientWidth > 0) {
        ctx2.camera.aspect = canvas2.clientWidth / canvas2.clientHeight;
      }
      // 3/4 perspective view: ~33° elevation from a corner, distance fits full ground
      ctx2.camera.position.set(groundSize * 0.5, groundSize * 1.15, -groundSize * 1.7);
      ctx2.camera.near = maxDim * 0.05;
      ctx2.camera.far = groundSize * 8;
      ctx2.camera.updateProjectionMatrix();
      ctx2.controls.target.set(0, size.y * 0.45, 0);
      ctx2.controls.update();

    }).catch(() => {});

    return () => { cancelled = true; };
  }, [meshId]);

  // Update sun sphere position
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const az  = (sunAzimuth  * Math.PI) / 180;
    const alt = (sunAltitude * Math.PI) / 180;
    const r   = sunRadiusRef.current;
    ctx.sunSphere.position.set(
      r * Math.sin(az)  * Math.cos(alt),
      r * Math.sin(alt),
      -r * Math.cos(az) * Math.cos(alt)
    );
  }, [sunAzimuth, sunAltitude]);

  // Update shadow polygon overlay
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    if (ctx.shadowMesh) {
      ctx.scene.remove(ctx.shadowMesh);
      ctx.shadowMesh.geometry.dispose();
      ctx.shadowMesh = null;
    }

    if (!shadowPolygon || shadowPolygon.length < 3) return;

    const shape = new THREE.Shape(shadowPolygon.map(([x, z]) => new THREE.Vector2(x, z)));
    const geo   = new THREE.ShapeGeometry(shape);
    const mat   = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const sm = new THREE.Mesh(geo, mat);
    sm.rotation.x  = Math.PI / 2;
    sm.position.y  = 0.1;
    sm.renderOrder = 1;
    sm.frustumCulled = false;
    ctx.scene.add(sm);
    ctx.shadowMesh = sm;
  }, [shadowPolygon]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = sceneRef.current;
    if (!ctx || !ctx.meshObj || !meshInfo) { setTooltip(null); return; }
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), ctx.camera);
    const hits = raycaster.intersectObject(ctx.meshObj);
    if (hits.length > 0) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setTooltip(null);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 400 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && meshInfo && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 14,
          top: tooltip.y - 10,
          background: "rgba(0,0,0,0.78)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 13,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          lineHeight: 1.6,
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          <div>Width: <b>{meshInfo.size.width} m</b></div>
          <div>Height: <b>{meshInfo.size.height} m</b></div>
          <div>Depth: <b>{meshInfo.size.depth} m</b></div>
        </div>
      )}
    </div>
  );
}
