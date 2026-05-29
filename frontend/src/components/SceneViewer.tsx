import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Props {
  meshInfo?: any;
  shadowPolygon: number[][] | null;
  sunAzimuth: number;
  sunAltitude: number;
}

export default function SceneViewer({ shadowPolygon, sunAzimuth, sunAltitude }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    meshObj: THREE.Mesh | null;
    shadowMesh: THREE.Mesh | null;
    sunSphere: THREE.Mesh;
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

    const camera = new THREE.PerspectiveCamera(50, (w || 800) / (h || 500), 0.1, 500);
    camera.position.set(-20, 30, 25);
    camera.lookAt(0, 5, 0);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: 0x2d5a27, side: THREE.DoubleSide })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    scene.add(new THREE.GridHelper(60, 30, 0x444444, 0x333333));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    scene.add(sunSphere);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    scene.add(dirLight);

    const meshObj = new THREE.Mesh(
      new THREE.BoxGeometry(10, 20, 10),
      new THREE.MeshLambertMaterial({ color: 0x6688cc })
    );
    meshObj.position.y = 10;
    scene.add(meshObj);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 5, 0);
    controls.update();

    let shadowMesh: THREE.Mesh | null = null;
    let frameId = 0;
    let active = true;

    function render() {
      if (!active) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    }
    render();

    sceneRef.current = { renderer, scene, camera, controls, meshObj, shadowMesh, sunSphere, frameId };

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

  // Update sun position
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const az = (sunAzimuth * Math.PI) / 180;
    const alt = (sunAltitude * Math.PI) / 180;
    const r = 30;
    ctx.sunSphere.position.set(
      r * Math.sin(az) * Math.cos(alt),
      r * Math.sin(alt),
      -r * Math.cos(az) * Math.cos(alt)
    );
  }, [sunAzimuth, sunAltitude]);

  // Update shadow polygon
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
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sm = new THREE.Mesh(geo, mat);
    sm.rotation.x = Math.PI / 2;
    sm.position.y = 0.1;
    sm.renderOrder = 1;
    sm.frustumCulled = false;
    ctx.scene.add(sm);
    ctx.shadowMesh = sm;
  }, [shadowPolygon]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", minHeight: 400, display: "block" }}
    />
  );
}
