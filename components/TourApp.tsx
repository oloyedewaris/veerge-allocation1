"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { ChevronDown, Menu as MenuIcon, Minus, Plus } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

const ASSET_ROOT = "/reference-assets/";

const siteLayers = [
  "date/objects3d/40/335-Plane_006.glb",
  "date/objects3d/51/mod/Outer_Fence.glb",
  "date/objects3d/55/mod/road.glb",
  "date/objects3d/60/mod/marking.glb",
  "date/objects3d/36/206-g_Building 2 Scaled.glb",
  "date/objects3d/19/90-g_three_palms.glb",
  "date/objects3d/5/mod/g_Building_.glb",
  "date/objects3d/10/86-g_three_1.glb",
  "date/objects3d/11/87-g_three_2.glb",
  "date/objects3d/12/mod/g_three_3.glb",
  "date/objects3d/13/mod/g_three_1.glb"
];

const villaLayers = [
  { type: "A", path: "date/objects3d/21/256-ga0.glb" },
  { type: "A", path: "date/objects3d/24/259-ga1.glb" },
  { type: "B", path: "date/objects3d/27/261-gb1.glb" },
  { type: "B", path: "date/objects3d/30/263-gb0.glb" },
  { type: "C", path: "date/objects3d/33/265-gc0.glb" },
  { type: "C", path: "date/objects3d/37/267-gc1.glb" }
];

type TextureSpec = { path: string; repeat?: [number, number] };
type TextureMap = Record<string, TextureSpec>;

// The original tour stores materials outside its geometry-only GLBs. These
// mappings reproduce the custom loader's object -> material -> texture step.
const siteTextures: Record<string, TextureMap> = {
  "date/objects3d/40/335-Plane_006.glb": {
    "*": { path: "date/textures/35/365-364-icon.png", repeat: [20, -20] }
  },
  "date/objects3d/51/mod/Outer_Fence.glb": {
    "*": { path: "date/textures/59/454-FENCE.jpg", repeat: [0.3, 0.3] }
  },
  "date/objects3d/55/mod/road.glb": {
    parking: { path: "date/textures/61/458-parking.jpg", repeat: [0.3, 0.3] },
    sidewalk: { path: "date/textures/63/468-sidewalk.jpg", repeat: [0.3, 0.3] },
    roads: { path: "date/textures/62/465-roads.jpg", repeat: [0.1, 0.1] },
    grass: { path: "date/textures/60/456-grass.png", repeat: [0.1, 0.1] },
    border_drainage: { path: "date/textures/58/452-border_drainage.jpg", repeat: [0.3, 0.3] }
  },
  "date/objects3d/36/206-g_Building 2 Scaled.glb": {
    g_Hospital_Web_object: { path: "date/textures/15/79-GenPlan_Hospital_Web_Color.jpg" },
    g_Mall_Web_object: { path: "date/textures/16/85-icon.png" },
    g_GenPlan_Building_2_2_Web_object: { path: "date/textures/18/91-GenPlan_Building_2_2_Web_Color.jpg" },
    g_GenPlan_Building_2_1_Web_object: { path: "date/textures/17/92-GenPlan_Building_2_1_Web_Color.jpg" },
    Mosque_Web002: { path: "date/textures/23/121-Mosque_Web_Color.jpg" }
  },
  "date/objects3d/5/mod/g_Building_.glb": {
    "*": { path: "date/textures/4/11-icon.png" }
  }
};

const villaTextures: Record<string, TextureMap> = {
  A: { "*": { path: "date/textures/20/471-Type_A_Web_Color.jpg" } },
  B: { "*": { path: "date/textures/21/99-icon.png" } },
  C: { "*": { path: "date/textures/1/4-icon.png" } }
};

function ModelScene({ path, visible, textures, loadedTextures }: { path: string; visible: boolean; textures: TextureMap; loadedTextures: THREE.Texture[] }) {
  const gltf = useGLTF(`${ASSET_ROOT}${encodeURI(path)}`);
  const entries = useMemo(() => Object.entries(textures), [textures]);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // The legacy object's root override lowers the baked map below all 3D
    // geometry, preventing coplanar depth conflicts.
    if (path === "date/objects3d/40/335-Plane_006.glb") clone.position.y = -10;
    const textureByMesh = new Map(entries.map(([name, spec], index) => {
      const texture = loadedTextures[index];
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      if (spec.repeat) texture.repeat.set(...spec.repeat);
      texture.needsUpdate = true;
      return [name, texture] as const;
    }));
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const map = textureByMesh.get(object.name) ?? textureByMesh.get("*");
        if (map) {
          const previous = Array.isArray(object.material) ? object.material[0] : object.material;
          object.material = new THREE.MeshPhongMaterial({
            map,
            color: "#ffffff",
            specular: new THREE.Color("#181818"),
            shininess: 18,
            side: previous?.side ?? THREE.FrontSide
          });
        } else if (/tree|palm/i.test(object.name)) {
          const material = Array.isArray(object.material) ? object.material[0] : object.material;
          object.material = material.clone();
          object.material.color.set("#486b25");
        }
      }
    });
    return clone;
  }, [entries, gltf.scene, loadedTextures]);
  return <primitive object={scene} visible={visible} />;
}

function TexturedModel({ path, visible, textures }: { path: string; visible: boolean; textures: TextureMap }) {
  const loadedTextures = useLoader(
    THREE.TextureLoader,
    Object.values(textures).map((spec) => `${ASSET_ROOT}${encodeURI(spec.path)}`)
  );
  return <ModelScene path={path} visible={visible} textures={textures} loadedTextures={loadedTextures} />;
}

function Model({ path, visible = true, textures }: { path: string; visible?: boolean; textures?: TextureMap }) {
  if (textures && Object.keys(textures).length > 0) {
    return <TexturedModel path={path} visible={visible} textures={textures} />;
  }
  return <ModelScene path={path} visible={visible} textures={{}} loadedTextures={[]} />;
}

function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(180, 320, 430);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return <OrbitControls
    ref={controls}
    makeDefault
    target={[0, 0, 0]}
    minDistance={260}
    maxDistance={2400}
    minPolarAngle={0.16}
    maxPolarAngle={1.38}
    enablePan
    screenSpacePanning
    enableDamping
    dampingFactor={0.075}
  />;
}

function Masterplan({ activeTypes, controls }: { activeTypes: Set<string>; controls: React.RefObject<OrbitControlsImpl | null> }) {
  return <>
    <color attach="background" args={["#cbb486"]} />
    <ambientLight intensity={0.62} />
    <hemisphereLight intensity={0.48} color="#fff4d6" groundColor="#5d6745" />
    <directionalLight
      castShadow
      intensity={1.65}
      color="#fff3d6"
      position={[700, 1200, 500]}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00015}
    />
    <group scale={0.82}>
      {siteLayers.map((path) => <Suspense key={path} fallback={null}><Model path={path} textures={siteTextures[path]} /></Suspense>)}
      {villaLayers.map(({ type, path }) => <Suspense key={path} fallback={null}><Model path={path} textures={villaTextures[type]} visible={activeTypes.has(type)} /></Suspense>)}
    </group>
    <Suspense fallback={null}><Environment files={`${ASSET_ROOT}date/scenes3d/2/38-sfer.jpg`} background={false} environmentIntensity={0.28} /></Suspense>
    <CameraRig controls={controls} />
  </>;
}

export default function TourApp() {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [activeTypes, setActiveTypes] = useState(() => new Set(["A", "B", "C"]));
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);

  const toggleType = (type: string) => setActiveTypes((current) => {
    const next = new Set(current);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });
  const zoom = (factor: number) => {
    const camera = controls.current?.object;
    if (!camera) return;
    const target = controls.current!.target;
    camera.position.sub(target).multiplyScalar(factor).add(target);
    controls.current?.update();
  };

  return <main className="masterplan-app" dir={language === "ar" ? "rtl" : "ltr"}>
    <div className="masterplan-canvas">
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.5]}
        performance={{ min: 0.6 }}
        camera={{ fov: 34, near: 1, far: 10000 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92
        }}
      >
        <Masterplan activeTypes={activeTypes} controls={controls} />
      </Canvas>
    </div>

    <div className="view-switch" aria-label="View mode">
      <button className="selected">Map</button><span>›</span><button>Area</button>
    </div>

    <section className="map-filters">
      <div className="type-filter"><span>Types</span>{["A", "B", "C"].map((type) => <button key={type} className={activeTypes.has(type) ? "active" : ""} onClick={() => toggleType(type)}>{type}</button>)}</div>
      <button className="filter-toggle" onClick={() => setFilterOpen(!filterOpen)}><b>Filter</b><ChevronDown className={filterOpen ? "open" : ""} /></button>
      {filterOpen && <div className="filter-panel"><span>Availability</span><label><input type="checkbox" defaultChecked /> Available units</label><label><input type="checkbox" /> Sold units</label></div>}
    </section>

    <img className="map-logo" src={`${ASSET_ROOT}date/info/96/117-Tilal_wht.svg`} alt="Tilal" />

    <div className="language-switch">
      <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
      <button className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>AR</button>
    </div>
    <div className="menu-wrap">
      <button className="main-menu" onClick={() => setMenuOpen(!menuOpen)}><MenuIcon /> <span>Menu</span></button>
      {menuOpen && <nav className="menu-panel"><button>Masterplan</button><button>About Tilal</button><button>Location</button><button>Contact</button></nav>}
    </div>

    <div className="zoom-tools"><button onClick={() => zoom(0.82)} aria-label="Zoom in"><Plus /></button><button onClick={() => zoom(1.22)} aria-label="Zoom out"><Minus /></button></div>
    <div className="compass" aria-label="Compass"><i>N</i><span>W</span><b>▲</b><span>E</span><i>S</i></div>
  </main>;
}

[...siteLayers, ...villaLayers.map((item) => item.path)].forEach((path) => useGLTF.preload(`${ASSET_ROOT}${encodeURI(path)}`));
