"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ChevronRight, Grid2X2, Map } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Hotspot = {
  id: string;
  ath: number;
  atv: number;
  target: string;
  lookAt: number;
  rotate: number;
};
type TourScene = {
  id: string;
  title: string;
  floor: number;
  hlookat: number;
  vlookat: number;
  fov: number;
  hotspots: Hotspot[];
};
type Manifest = { type: string; initialScene: string; scenes: TourScene[] };
type View = { yaw: number; pitch: number; fov: number };

const FACE_ORDER = ["r", "l", "u", "d", "f", "b"];

function direction(ath: number, atv: number, radius = 10) {
  const horizontal = THREE.MathUtils.degToRad(ath),
    vertical = THREE.MathUtils.degToRad(atv);
  return new THREE.Vector3(
    -Math.sin(horizontal) * Math.cos(vertical) * radius,
    -Math.sin(vertical) * radius,
    -Math.cos(horizontal) * Math.cos(vertical) * radius,
  );
}

function PanoramaScene({
  base,
  scene,
  view,
  onMove,
  onReady,
}: {
  base: string;
  scene: TourScene;
  view: React.RefObject<View>;
  onMove: (hotspot: Hotspot) => void;
  onReady: (sceneId: string) => void;
}) {
  const { camera } = useThree();
  const [cubeTexture, setCubeTexture] = useState<THREE.CubeTexture | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const texture = new THREE.CubeTextureLoader().load(
      FACE_ORDER.map((face) => `${base}/scenes/${scene.id}/${face}.jpg`),
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        if (active) {
          setCubeTexture(loaded);
          onReady(scene.id);
        }
      },
    );
    return () => {
      active = false;
      texture.dispose();
    };
  }, [base, onReady, scene.id]);
  useFrame(() => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = THREE.MathUtils.degToRad(view.current.yaw);
    camera.rotation.x = THREE.MathUtils.degToRad(-view.current.pitch);
    if (camera instanceof THREE.PerspectiveCamera) {
      const verticalFov = THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(THREE.MathUtils.degToRad(view.current.fov / 2)) /
              Math.max(1, camera.aspect),
          ),
      );
      if (Math.abs(camera.fov - verticalFov) > 0.01) {
        camera.fov = verticalFov;
        camera.updateProjectionMatrix();
      }
    }
  });
  return (
    <>
      {cubeTexture && <primitive attach="background" object={cubeTexture} />}{" "}
      {scene.hotspots.map((hotspot) => (
        <Html
          key={hotspot.id}
          position={direction(hotspot.ath, hotspot.atv)}
          center
          transform={false}
          zIndexRange={[4, 0]}
        >
          <button
            className="pano-hotspot"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onMove(hotspot);
            }}
            aria-label={`Move to ${hotspot.target}`}
          >
            <span />
            <ChevronRight />
          </button>
        </Html>
      ))}
    </>
  );
}

export default function PanoramaTour({ type }: { type: "A" | "B" | "C" }) {
  const base = `/panorama/type${type.toLowerCase()}`;
  const [manifest, setManifest] = useState<Manifest | null>(null),
    [sceneId, setSceneId] = useState(""),
    [mapOpen, setMapOpen] = useState(true),
    [transition, setTransition] = useState(false);
  const view = useRef<View>({ yaw: 0, pitch: 0, fov: 90 }),
    drag = useRef<{ x: number; y: number; moved: boolean } | null>(null),
    moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pendingLookAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    fetch(`${base}/manifest.json`)
      .then((response) => response.json())
      .then((data: Manifest) => {
        setManifest(data);
        setSceneId(data.initialScene);
      });
  }, [base]);
  const scene = manifest?.scenes.find((item) => item.id === sceneId),
    floors = useMemo(
      () =>
        [...new Set(manifest?.scenes.map((item) => item.floor) ?? [])].sort(),
      [manifest],
    );
  useEffect(() => {
    if (scene) {
      view.current = {
        yaw: pendingLookAt.current ?? scene.hlookat,
        pitch: scene.vlookat,
        fov: scene.fov,
      };
      pendingLookAt.current = undefined;
    }
  }, [scene]);
  const move = (target: string, lookAt?: number) => {
    if (!manifest?.scenes.some((item) => item.id === target)) return;
    if (target === sceneId || transition) return;
    setTransition(true);
    pendingLookAt.current = lookAt;
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => {
      setSceneId(target);
    }, 180);
  };
  useEffect(
    () => () => {
      if (moveTimer.current) clearTimeout(moveTimer.current);
    },
    [],
  );
  const pointerDown = (event: React.PointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x,
      dy = event.clientY - drag.current.y;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      moved: drag.current.moved || Math.abs(dx) + Math.abs(dy) > 2,
    };
    view.current.yaw -= dx * 0.11;
    view.current.pitch = THREE.MathUtils.clamp(
      view.current.pitch - dy * 0.11,
      -85,
      85,
    );
  };
  const zoom = (amount: number) => {
    view.current.fov = THREE.MathUtils.clamp(
      view.current.fov + amount,
      70,
      140,
    );
  };
  const handleSceneReady = useCallback(
    (loadedSceneId: string) => {
      if (loadedSceneId !== sceneId) return;
      requestAnimationFrame(() => setTransition(false));
    },
    [sceneId],
  );
  if (!manifest || !scene)
    return (
      <div className="pano-loading">
        <i />
        <span>Loading interior tour…</span>
      </div>
    );
  return (
    <div
      className="pano-viewer"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onWheel={(event) => zoom(event.deltaY * 0.025)}
    >
      <Canvas
        camera={{
          fov: view.current.fov,
          near: 0.1,
          far: 100,
          position: [0, 0, 0],
        }}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <PanoramaScene
          base={base}
          scene={scene}
          view={view}
          onMove={(hotspot) => move(hotspot.target, hotspot.lookAt)}
          onReady={handleSceneReady}
        />
      </Canvas>
      <div className={`pano-fade ${transition ? "active" : ""}`} />
      <div className="pano-controls">
        <button
          className={mapOpen ? "active" : ""}
          onClick={() => setMapOpen(!mapOpen)}
        >
          <Map />
        </button>
        <button>
          <Grid2X2 />
        </button>
      </div>
      {mapOpen && (
        <aside
          className="pano-map"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="pano-floors">
            {[...floors].reverse().map((floor) => (
              <button
                key={floor}
                className={scene.floor === floor ? "active" : ""}
                onClick={() => {
                  const first = manifest.scenes.find(
                    (item) => item.floor === floor,
                  );
                  if (first) move(first.id);
                }}
              >
                {floor === 0 ? "GF" : floor}
              </button>
            ))}
          </div>
          <div className="pano-plan">
            <img
              src={`${base}/plan${scene.floor}.jpg`}
              alt={`Floor ${scene.floor} plan`}
            />
            <div className="pano-room-list">
              {manifest.scenes
                .filter((item) => item.floor === scene.floor)
                .map((item, index) => (
                  <button
                    key={item.id}
                    style={{
                      left: `${12 + ((index * 29) % 78)}%`,
                      top: `${22 + ((index * 37) % 62)}%`,
                    }}
                    className={item.id === scene.id ? "active" : ""}
                    onClick={() => move(item.id)}
                    aria-label={item.title}
                  />
                ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
