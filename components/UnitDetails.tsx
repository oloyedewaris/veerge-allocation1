"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  ChevronDown,
  Cuboid,
  Menu as MenuIcon,
  Minus,
  Plus,
  Rotate3D,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import dynamic from "next/dynamic";
import * as THREE from "three";

const ROOT = "/reference-assets/";
const PanoramaTour = dynamic(() => import("./PanoramaTour"), {
  ssr: false,
  loading: () => <div className="pano-loading"><i /><span>Loading interior tour…</span></div>,
});
type Unit = {
  block: string;
  id: string;
  model: string;
  landArea: string;
  buildArea: string;
  bedrooms: string;
  bathrooms: string;
  master: string;
  living: string;
  kitchen: string;
  guest: string;
  direction: string;
  availability: string;
};

const MODEL_DATA = {
  A: {
    model: "date/objects3d/43/345-Type A.glb",
    textures: [
      "date/textures/36/251-Type_A_Building_web.jpg",
      "date/textures/37/254-Type_A_Details_web.jpg",
      "date/textures/38/263-Type_A_Inner_Walls_web.jpg",
      "date/textures/39/266-Type_A_Tree_web.jpg",
    ],
    order: [
      "building",
      "details",
      "metal",
      "glass",
      "metalDark",
      "clear",
      "tree",
      "inside",
    ],
  },
  B: {
    model: "date/objects3d/44/312-Type_B.glb",
    textures: [
      "date/textures/41/273-Type_B_Building_web.jpg",
      "date/textures/42/274-Type_B_Details_web.jpg",
      "date/textures/43/277-Type_B_Inner_Walls_web.jpg",
      "date/textures/44/280-Type_B_Tree_web.jpg",
    ],
    order: [
      "details",
      "metal",
      "glass",
      "metalDark",
      "tree",
      "clear",
      "building",
      "inside",
    ],
  },
  C: {
    model: "date/objects3d/45/314-Type_C.glb",
    textures: [
      "date/textures/45/283-Type_C_Building_web.jpg",
      "date/textures/46/286-Type_C_Details_web.jpg",
      "date/textures/47/290-Type_C_Inner_Walls_web.jpg",
      "date/textures/48/293-Type_C_Tree_web.jpg",
    ],
    order: [
      "building",
      "details",
      "glass",
      "metal",
      "clear",
      "metalDark",
      "inside",
      "tree",
    ],
  },
} as const;
type ModelType = keyof typeof MODEL_DATA;

function VillaModel({ type }: { type: ModelType }) {
  const data = MODEL_DATA[type];
  const gltf = useGLTF(`${ROOT}${encodeURI(data.model)}`);
  const maps = useLoader(
    THREE.TextureLoader,
    data.textures.map((path) => `${ROOT}${encodeURI(path)}`),
  );
  const scene = useMemo(() => {
    maps.forEach((map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.flipY = false;
      map.needsUpdate = true;
    });
    const textured = (map: THREE.Texture) =>
      new THREE.MeshPhongMaterial({
        map,
        color: "#fff",
        specular: "#111",
        shininess: 30,
      });
    const materials: Record<string, THREE.Material> = {
      building: textured(maps[0]),
      details: textured(maps[1]),
      inside: textured(maps[2]),
      tree: textured(maps[3]),
      metal: new THREE.MeshStandardMaterial({
        color: "#050505",
        roughness: 0,
        metalness: 1,
      }),
      metalDark: new THREE.MeshStandardMaterial({
        color: "#3f3f3f",
        emissive: "#3f3f3f",
        roughness: 0,
        metalness: 1,
      }),
      glass: new THREE.MeshPhongMaterial({
        color: "#fff",
        specular: "#fff",
        shininess: 0,
        opacity: 0.2,
        transparent: true,
      }),
      clear: new THREE.MeshPhongMaterial({
        color: "#cfcfcf",
        specular: "#30a7ff",
        shininess: 27.6,
        opacity: 0.25,
        transparent: true,
      }),
    };
    const clone = gltf.scene.clone(true);
    let index = 0;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = data.order[index++] ?? "building";
        child.material = materials[name];
        child.castShadow = name !== "glass" && name !== "clear";
        child.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone),
      center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    const scale = 7.3 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(scale);
    clone.position.copy(center).multiplyScalar(-scale);
    clone.position.y += size.y * scale * 0.03;
    return clone;
  }, [data, gltf.scene, maps]);
  return <primitive object={scene} />;
}

function UnitScene({
  type,
  controls,
}: {
  type: ModelType;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  return (
    <>
      <ambientLight intensity={1.35} />
      <hemisphereLight intensity={0.85} color="#fff" groundColor="#555" />
      <directionalLight
        castShadow
        intensity={1.5}
        position={[-6, 10, 9]}
        shadow-mapSize={[2048, 2048]}
      />
      <Suspense fallback={null}>
        <VillaModel type={type} />
      </Suspense>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 0.45, 0]}
        minDistance={5}
        maxDistance={22}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  );
}

function parseUnits(csv: string): Unit[] {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const x = line.split(",");
      return {
        block: x[0],
        id: x[1],
        model: x[2],
        landArea: x[3],
        buildArea: x[4],
        bedrooms: x[5],
        bathrooms: x[6],
        master: x[7],
        living: x[8],
        kitchen: x[9],
        guest: x[10],
        direction: x[11],
        availability: x[12],
      };
    });
}

export default function UnitDetails({ unitId }: { unitId: string }) {
  const [unit, setUnit] = useState<Unit | null>(null),
    [detailsOpen, setDetailsOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [language, setLanguage] = useState<"en" | "ar">("en"),
    [view, setView] = useState<"exterior" | "tour">(() =>
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "tour" ? "tour" : "exterior",
    );
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    fetch(`${ROOT}xzLocalDoc.csv`)
      .then((r) => r.text())
      .then(parseUnits)
      .then((units) =>
        setUnit(units.find((item) => item.id === unitId) ?? null),
      );
  }, [unitId]);
  const type = (unit?.model?.trim()[0] || "B") as ModelType,
    variant = unit?.model.match(/\(([^)]+)\)/)?.[1] ?? unit?.model ?? "Villa";
  const zoom = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    c.object.position.sub(c.target).multiplyScalar(factor).add(c.target);
    c.update();
  };
  const setViewMode = (next: "exterior" | "tour") => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "tour") url.searchParams.set("view", "tour");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };
  return (
    <main className="unit-app" dir={language === "ar" ? "rtl" : "ltr"}>
      {view === "exterior" ? (
        <div className="unit-canvas">
          <Canvas
            shadows
            dpr={[1, 1.75]}
            camera={{ fov: 45, near: 0.1, far: 200, position: [5.4, 3.5, 9] }}
            gl={{
              antialias: true,
              alpha: true,
              outputColorSpace: THREE.SRGBColorSpace,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.12,
            }}
          >
            <UnitScene type={type} controls={controls} />
          </Canvas>
        </div>
      ) : (
        <div className="virtual-tour"><PanoramaTour type={type} /></div>
      )}
      <nav className="unit-breadcrumb">
        <button onClick={() => (location.href = "/?map3d")}>Map</button>
        <span>›</span>
        <button onClick={() => (location.href = "/?map3d")}>Area</button>
        <span>›</span>
        <button className="current">Villa</button>
      </nav>
      <section className="unit-tools">
        <button
          className="unit-summary"
          onClick={() => setDetailsOpen(!detailsOpen)}
        >
          <small>{unit?.direction ?? "—"}</small>
          <strong>
            № {unitId} <em>({variant})</em>
          </strong>
          <ChevronDown className={detailsOpen ? "open" : ""} />
        </button>
        {detailsOpen && unit && (
          <div className="unit-info">
            <div>
              <span>Type</span>
              <b>{type}</b>
            </div>
            <div>
              <span>Status</span>
              <b>{unit.availability}</b>
            </div>
            <div>
              <span>Land area</span>
              <b>{unit.landArea} m²</b>
            </div>
            <div>
              <span>Built-up area</span>
              <b>{unit.buildArea} m²</b>
            </div>
            <div>
              <span>Bedrooms</span>
              <b>{unit.bedrooms}</b>
            </div>
            <div>
              <span>Bathrooms</span>
              <b>{unit.bathrooms}</b>
            </div>
          </div>
        )}
        <div className="unit-actions">
          <button
            className={view === "exterior" ? "active" : ""}
            onClick={() => setViewMode("exterior")}
          >
            <Cuboid />
            3D Exterior
          </button>
          <button
            className={view === "tour" ? "active" : ""}
            onClick={() => setViewMode("tour")}
          >
            <Rotate3D />
            Virtual Tour
          </button>
        </div>
      </section>
      <img
        className="map-logo"
        src={`${ROOT}date/info/96/117-Tilal_wht.svg`}
        alt="Tilal"
      />
      <div className="language-switch">
        <button
          className={language === "en" ? "active" : ""}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
        <button
          className={language === "ar" ? "active" : ""}
          onClick={() => setLanguage("ar")}
        >
          AR
        </button>
      </div>
      <div className="menu-wrap">
        <button className="main-menu" onClick={() => setMenuOpen(!menuOpen)}>
          <MenuIcon />
          <span>Menu</span>
        </button>
        {menuOpen && (
          <nav className="menu-panel">
            <button onClick={() => (location.href = "/?map3d")}>
              Masterplan
            </button>
            <button>About Tilal</button>
            <button>Location</button>
            <button>Contact</button>
          </nav>
        )}
      </div>
      {view === "exterior" && (
        <>
          <div className="zoom-tools">
            <button onClick={() => zoom(0.82)} aria-label="Zoom in">
              <Plus />
            </button>
            <button onClick={() => zoom(1.22)} aria-label="Zoom out">
              <Minus />
            </button>
          </div>
          <div className="compass">
            <i>N</i>
            <span>W</span>
            <b>▲</b>
            <span>E</span>
            <i>S</i>
          </div>
        </>
      )}
    </main>
  );
}
