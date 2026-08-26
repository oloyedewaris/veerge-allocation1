"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import {
  ChevronDown,
  Menu as MenuIcon,
  MessageCircle,
  Minus,
  Phone,
  Plus,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import UnitDetails from "./UnitDetails";

const ASSET_ROOT = "/reference-assets/";
type UnitRecord = { id: string; model: string; availability: string };
type UnitStatus = "available" | "allocated";

function getUnitStatus(availability: string): UnitStatus {
  return availability.trim() === "Availabel." ? "available" : "allocated";
}

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
  "date/objects3d/13/mod/g_three_1.glb",
];

const villaLayers = [
  {
    type: "A",
    placement: "date/objects3d/21/json_27.json",
    model: "date/objects3d/22/151-g_Type_A_L_object.glb",
  },
  {
    type: "A",
    placement: "date/objects3d/24/json_0.json",
    model: "date/objects3d/25/167-g_Type_A_R_object.glb",
  },
  {
    type: "B",
    placement: "date/objects3d/27/json_25.json",
    model: "date/objects3d/28/236-g_Type_B_L_object.glb",
  },
  {
    type: "B",
    placement: "date/objects3d/30/json_80.json",
    model: "date/objects3d/31/240-g_Type_B_R_object.glb",
  },
  {
    type: "C",
    placement: "date/objects3d/33/json_53.json",
    model: "date/objects3d/34/212-g_Type_C_L_object.glb",
  },
  {
    type: "C",
    placement: "date/objects3d/37/json_66.json",
    model: "date/objects3d/38/221-g_Type_C_R_object.glb",
  },
] as const;

type TextureSpec = {
  path: string;
  repeat?: [number, number];
  color?: string;
  emissive?: string;
  shininess?: number;
  specular?: string;
};
type TextureMap = Record<string, TextureSpec>;

// The original tour stores materials outside its geometry-only GLBs. These
// mappings reproduce the custom loader's object -> material -> texture step.
const siteTextures: Record<string, TextureMap> = {
  "date/objects3d/40/335-Plane_006.glb": {
    "*": { path: "date/textures/35/365-364-icon.png", repeat: [20, -20] },
  },
  "date/objects3d/51/mod/Outer_Fence.glb": {
    "*": { path: "date/textures/59/454-FENCE.jpg", repeat: [0.3, 0.3] },
  },
  "date/objects3d/55/mod/road.glb": {
    parking: { path: "date/textures/61/458-parking.jpg", repeat: [0.3, 0.3] },
    sidewalk: { path: "date/textures/63/468-sidewalk.jpg", repeat: [0.3, 0.3] },
    roads: { path: "date/textures/62/465-roads.jpg", repeat: [0.1, 0.1] },
    grass: {
      path: "date/textures/60/456-grass.png",
      repeat: [0.1, 0.1],
      color: "#ffffff",
    },
    border_drainage: {
      path: "date/textures/58/452-border_drainage.jpg",
      repeat: [0.3, 0.3],
    },
  },
  "date/objects3d/36/206-g_Building 2 Scaled.glb": {
    g_Hospital_Web_object: {
      path: "date/textures/15/83-icon.png",
      emissive: "#242424",
    },
    g_Mall_Web_object: {
      path: "date/textures/16/85-icon.png",
      emissive: "#242424",
    },
    g_GenPlan_Building_2_2_Web_object: {
      path: "date/textures/18/89-icon.png",
      specular: "#242424",
    },
    g_GenPlan_Building_2_1_Web_object: {
      path: "date/textures/17/87-icon.png",
      emissive: "#242424",
    },
    Mosque_Web002: { path: "date/textures/23/121-Mosque_Web_Color.jpg" },
  },
  "date/objects3d/5/mod/g_Building_.glb": {
    "*": { path: "date/textures/4/11-icon.png", emissive: "#161616" },
  },
};

const villaTextures: Record<string, TextureMap> = {
  A: { "*": { path: "date/textures/20/471-Type_A_Web_Color.jpg" } },
  B: { "*": { path: "date/textures/21/99-icon.png" } },
  C: { "*": { path: "date/textures/1/4-icon.png" } },
};

// The masterplan vegetation GLBs are also geometry-only, so their original
// external solid colours still have to be restored by the loader. Unlike the
// previous treatment, their source transforms are left untouched.
const foliageColors: Record<string, string> = {
  "date/objects3d/10/86-g_three_1.glb": "#52683d",
  "date/objects3d/11/87-g_three_2.glb": "#485f35",
  "date/objects3d/12/mod/g_three_3.glb": "#566d3e",
  "date/objects3d/13/mod/g_three_1.glb": "#445b32",
  "date/objects3d/19/90-g_three_palms.glb": "#53683c",
};

type PlacementNode = [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  unknown[],
];

function VillaInstances({
  placement,
  model,
  type,
  visible,
  unitStatuses,
  showAvailable,
  showAllocated,
}: {
  placement: string;
  model: string;
  type: string;
  visible: boolean;
  unitStatuses: Record<string, UnitStatus>;
  showAvailable: boolean;
  showAllocated: boolean;
}) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const gltf = useGLTF(`${ASSET_ROOT}${encodeURI(model)}`);
  const rawPlacement = useLoader(
    THREE.FileLoader,
    `${ASSET_ROOT}${encodeURI(placement)}`,
  );
  const textureSpec = villaTextures[type]["*"];
  const texture = useLoader(
    THREE.TextureLoader,
    `${ASSET_ROOT}${encodeURI(textureSpec.path)}`,
  );
  const [hoveredVilla, setHoveredVilla] = useState<string | null>(null);

  const instances = useMemo(() => {
    const raw =
      typeof rawPlacement === "string"
        ? rawPlacement
        : new TextDecoder().decode(rawPlacement as ArrayBuffer);
    const nodes = (JSON.parse(raw).three?.[10] ?? []) as PlacementNode[];
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = Math.min(16, maxAnisotropy);
    texture.needsUpdate = true;

    const buildingMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      color: "#ffffff",
      emissive: new THREE.Color("#17120e"),
      emissiveIntensity: 0.1,
      specular: new THREE.Color("#080706"),
      shininess: 10,
      side: THREE.DoubleSide,
    });
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: "#858585",
      specular: new THREE.Color("#080808"),
      shininess: 30,
      opacity: 0.68,
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    return nodes.map((node) => {
      const object = gltf.scene.clone(true);
      object.name = node[0];
      const unitId = object.name.match(/_(\d+)$/)?.[1] ?? "";
      const status = unitStatuses[unitId] ?? "allocated";
      object.userData.unitStatus = status;
      object.position.set(node[1] * 0.01, node[2] * 0.01, node[3] * 0.01);
      object.rotation.set(
        THREE.MathUtils.degToRad(node[4]),
        THREE.MathUtils.degToRad(node[5]),
        THREE.MathUtils.degToRad(node[6]),
      );
      object.scale.set(node[7], node[8], node[9]);
      let meshIndex = 0;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const isGlass = type === "C" ? meshIndex === 1 : meshIndex === 0;
          // Materials must be unique per villa so the hover treatment affects
          // only the unit beneath the pointer.
          child.material = (isGlass ? glassMaterial : buildingMaterial).clone();
          const material = child.material as THREE.MeshPhongMaterial;
          // Preserve the downloaded atlas exactly. Availability and hover are
          // interaction states and must not permanently grade the façade.
          material.color.set("#ffffff");
          material.userData.baseEmissive = material.emissive.getHex();
          material.userData.baseEmissiveIntensity = material.emissiveIntensity;
          child.castShadow = !isGlass;
          child.receiveShadow = true;
          meshIndex += 1;
        }
      });
      return object;
    });
  }, [gltf.scene, maxAnisotropy, rawPlacement, texture, type, unitStatuses]);

  useEffect(() => {
    instances.forEach((villa) =>
      villa.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((rawMaterial) => {
          const material = rawMaterial as THREE.MeshPhongMaterial;
          if (!material.emissive) return;
          const status = villa.userData.unitStatus as UnitStatus;
          const filteredByStatus =
            status === "available" ? !showAvailable : !showAllocated;
          const active =
            villa.name === hoveredVilla || !visible || filteredByStatus;
          material.emissive.setHex(
            active ? 0x10b39b : (material.userData.baseEmissive ?? 0x000000),
          );
          material.emissiveIntensity = active
            ? 0.62
            : (material.userData.baseEmissiveIntensity ?? 1);
          material.needsUpdate = true;
        });
      }),
    );
  }, [hoveredVilla, instances, showAllocated, showAvailable, visible]);

  const openUnit = (event: ThreeEvent<MouseEvent>, objectName: string) => {
    event.stopPropagation();
    // OrbitControls also receives pointer gestures. Only treat a short,
    // stationary gesture as a villa selection, not a drag across the map.
    if (event.delta > 5) return;
    const unitId = objectName.match(/_(\d+)$/)?.[1];
    if (unitId) window.location.assign(`/?villa=${unitId}`);
  };

  return (
    <group>
      {instances.map((object) => (
        <primitive
          key={object.name}
          object={object}
          onClick={(event: ThreeEvent<MouseEvent>) =>
            openUnit(event, object.name)
          }
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHoveredVilla(object.name);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHoveredVilla((current) =>
              current === object.name ? null : current,
            );
            document.body.style.cursor = "default";
          }}
        />
      ))}
    </group>
  );
}

function ModelScene({
  path,
  visible,
  textures,
  loadedTextures,
}: {
  path: string;
  visible: boolean;
  textures: TextureMap;
  loadedTextures: THREE.Texture[];
}) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const gltf = useGLTF(`${ASSET_ROOT}${encodeURI(path)}`);
  const entries = useMemo(() => Object.entries(textures), [textures]);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // The legacy object's root override lowers the baked map below all 3D
    // geometry, preventing coplanar depth conflicts.
    if (path === "date/objects3d/40/335-Plane_006.glb") clone.position.y = -10;
    const textureByMesh = new Map(
      entries.map(([name, spec], index) => {
        const texture = loadedTextures[index];
        texture.colorSpace = THREE.SRGBColorSpace;
        // GLTF UVs use a bottom-left texture origin. TextureLoader defaults to
        // the opposite convention, which was putting the atlas' black padding
        // over roofs and facades.
        texture.flipY = false;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        if (spec.repeat) texture.repeat.set(...spec.repeat);
        texture.anisotropy = Math.min(16, maxAnisotropy);
        texture.needsUpdate = true;
        return [name, { texture, spec }] as const;
      }),
    );
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const mapped = textureByMesh.get(object.name) ?? textureByMesh.get("*");
        if (mapped) {
          const { texture: map, spec } = mapped;
          const previous = Array.isArray(object.material)
            ? object.material[0]
            : object.material;
          object.material = new THREE.MeshPhongMaterial({
            map,
            color: spec.color ?? "#ffffff",
            emissive: new THREE.Color(spec.emissive ?? "#000000"),
            emissiveIntensity: spec.emissive ? 0.72 : 1,
            specular: new THREE.Color(spec.specular ?? "#111111"),
            shininess: Math.min(spec.shininess ?? 20, 32),
            side: previous?.side ?? THREE.FrontSide,
          });
        } else if (/tree|palm/i.test(object.name)) {
          const material = Array.isArray(object.material)
            ? object.material[0]
            : object.material;
          object.material = material.clone();
          object.material.color.set(foliageColors[path] ?? "#46642d");
        }
      }
    });
    return clone;
  }, [entries, gltf.scene, loadedTextures, maxAnisotropy, path]);
  return <primitive object={scene} visible={visible} />;
}

function TexturedModel({
  path,
  visible,
  textures,
}: {
  path: string;
  visible: boolean;
  textures: TextureMap;
}) {
  const loadedTextures = useLoader(
    THREE.TextureLoader,
    Object.values(textures).map(
      (spec) => `${ASSET_ROOT}${encodeURI(spec.path)}`,
    ),
  );
  return (
    <ModelScene
      path={path}
      visible={visible}
      textures={textures}
      loadedTextures={loadedTextures}
    />
  );
}

function Model({
  path,
  visible = true,
  textures,
}: {
  path: string;
  visible?: boolean;
  textures?: TextureMap;
}) {
  if (textures && Object.keys(textures).length > 0) {
    return <TexturedModel path={path} visible={visible} textures={textures} />;
  }
  return (
    <ModelScene
      path={path}
      visible={visible}
      textures={{}}
      loadedTextures={[]}
    />
  );
}

function CameraRig({
  controls,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(-520, 375, 0);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return (
    <OrbitControls
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
    />
  );
}

function Masterplan({
  activeTypes,
  controls,
  unitStatuses,
  showAvailable,
  showAllocated,
}: {
  activeTypes: Set<string>;
  controls: React.RefObject<OrbitControlsImpl | null>;
  unitStatuses: Record<string, UnitStatus>;
  showAvailable: boolean;
  showAllocated: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <fog attach="fog" args={["#ffffff", 820, 2800]} />
      <ambientLight intensity={1.15} color="#ffffff" />
      <directionalLight
        castShadow
        intensity={0.65}
        color="#ffffff"
        position={[450, 900, -700]}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-750}
        shadow-camera-right={750}
        shadow-camera-top={750}
        shadow-camera-bottom={-750}
        shadow-camera-near={100}
        shadow-camera-far={2200}
        shadow-bias={-0.00025}
        shadow-normalBias={0.035}
        shadow-radius={1}
      />
      <group scale={0.82}>
        {siteLayers.map((path) => (
          <Suspense key={path} fallback={null}>
            <Model path={path} textures={siteTextures[path]} />
          </Suspense>
        ))}
        {villaLayers.map(({ type, placement, model }) => (
          <Suspense key={placement} fallback={null}>
            <VillaInstances
              placement={placement}
              model={model}
              type={type}
              visible={activeTypes.has(type)}
              unitStatuses={unitStatuses}
              showAvailable={showAvailable}
              showAllocated={showAllocated}
            />
          </Suspense>
        ))}
      </group>
      <CameraRig controls={controls} />
    </>
  );
}

function MasterplanApp() {
  const {
    active: assetsLoading,
    progress,
    loaded: loadedAssets,
    total: totalAssets,
  } = useProgress();
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [activeTypes, setActiveTypes] = useState(
    () => new Set(["A", "B", "C"]),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const [allocated, setAllocated] = useState(true);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [unitsReady, setUnitsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    fetch(`${ASSET_ROOT}units.json`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load units (${response.status})`);
        return response.json() as Promise<UnitRecord[]>;
      })
      .then(setUnits)
      .catch((error) => console.error(error))
      .finally(() => setUnitsReady(true));
  }, []);

  useEffect(() => {
    if (
      sceneReady ||
      !unitsReady ||
      assetsLoading ||
      totalAssets === 0 ||
      loadedAssets !== totalAssets
    )
      return;

    const frame = requestAnimationFrame(() => setSceneReady(true));
    return () => cancelAnimationFrame(frame);
  }, [
    assetsLoading,
    loadedAssets,
    sceneReady,
    totalAssets,
    unitsReady,
  ]);

  const unitStatuses = useMemo(
    () =>
      Object.fromEntries(
        units.map((unit) => [unit.id, getUnitStatus(unit.availability)]),
      ) as Record<string, UnitStatus>,
    [units],
  );
  const availableCount = units.filter(
    (unit) => getUnitStatus(unit.availability) === "available",
  ).length;
  const allocatedCount = units.length - availableCount;
  const typeCounts = useMemo(
    () =>
      Object.fromEntries(
        ["A", "B", "C"].map((type) => [
          type,
          units.filter((unit) => unit.model.trim().startsWith(type)).length,
        ]),
      ) as Record<string, number>,
    [units],
  );

  const toggleType = (type: string) =>
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  const zoom = (factor: number) => {
    const camera = controls.current?.object;
    if (!camera) return;
    const target = controls.current!.target;
    camera.position.sub(target).multiplyScalar(factor).add(target);
    controls.current?.update();
  };
  return (
    <main
      className={`masterplan-app ${sceneReady ? "scene-ready" : "scene-loading"}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {!sceneReady && (
        <div className="scene-loader" role="status" aria-live="polite">
          <span className="loader" />
          <small>{Math.round(progress)}%</small>
        </div>
      )}
      <div className="masterplan-canvas">
        <Canvas
          shadows="soft"
          frameloop="demand"
          dpr={[1, 2]}
          performance={{ min: 0.6 }}
          camera={{ fov: 45, near: 1, far: 10000 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            outputColorSpace: THREE.SRGBColorSpace,
            toneMapping: THREE.NoToneMapping,
            toneMappingExposure: 1,
          }}
        >
          <Masterplan
            activeTypes={activeTypes}
            controls={controls}
            unitStatuses={unitStatuses}
            showAvailable={available}
            showAllocated={allocated}
          />
        </Canvas>
      </div>

      {/* Replaced by the forthcoming homepage UI.
      <div className="view-switch" aria-label="View mode">
        <button className="selected">Map</button>
        <span>›</span>
        <button>Area</button>
      </div>

      <section className="map-filters">
        <div className="type-filter">
          <span>Types</span>
          {["A", "B", "C"].map((type) => (
            <button
              key={type}
              className={activeTypes.has(type) ? "active" : ""}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          className="filter-toggle"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <b>Filter</b>
          <ChevronDown className={filterOpen ? "open" : ""} />
        </button>
        {filterOpen && (
          <div className="filter-panel">
            <span>Availability</span>
            <label>
              <input type="checkbox" defaultChecked /> Available units
            </label>
            <label>
              <input type="checkbox" /> Sold units
            </label>
          </div>
        )}
      </section>
      */}

      <img
        className="map-logo homepage-logo"
        src="/assets/logo.svg"
        alt="Marasi"
      />

      <div className="allocation-ui" aria-label="Allocation controls">
        <aside className="allocation-left">
          <section className="allocation-card allocation-filter-card">
            <header>
              <h2>Filter</h2>
              <span>{units.length} plots</span>
            </header>

            <div className="allocation-card unit-types-card">
              <p className="allocation-kicker">Units</p>
              <div className="allocation-type-grid">
                {(["A", "B", "C"] as const).map((type) => (
                  <button
                    key={type}
                    className={activeTypes.has(type) ? "active" : ""}
                    onClick={() => toggleType(type)}
                  >
                    <b>Type {type}</b>
                    <span>{typeCounts[type] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="allocation-filter-body">
              <p className="allocation-kicker">Status</p>
              <label className="status-row">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(event) => setAvailable(event.target.checked)}
                />
                <i className="available" />
                <span>Available</span>
                <b>{availableCount}</b>
              </label>
              <label className="status-row">
                <input
                  type="checkbox"
                  checked={allocated}
                  onChange={(event) => setAllocated(event.target.checked)}
                />
                <i className="allocated" />
                <span>Allocated</span>
                <b>{allocatedCount}</b>
              </label>
            </div>
          </section>
        </aside>

        <aside className="allocation-right">
          <div className="allocation-menu-wrap">
            <button
              className="allocation-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MenuIcon />
              Menu
            </button>
            {menuOpen && (
              <nav className="allocation-menu-panel">
                <button>Masterplan</button>
                <button>About Tilal</button>
                <button>Location</button>
                <button>Contact</button>
              </nav>
            )}
          </div>

          <section className="allocation-card allocation-intro">
            <p className="allocation-kicker">Start here</p>
            <h1>Pick a plot, we will show you everything on it.</h1>
            <p>Then the exterior, every room. Then numbers.</p>
          </section>

          <section className="allocation-card sales-card">
            <p className="allocation-kicker">Your sales contact</p>
            {[
              {
                img: "/assets/ahmed.jpg",
                name: "Ahmed Ibraheem",
                phone: "+234 802 000 1188",
              },
              {
                img: "/assets/peter.png",
                name: "David Peter",
                phone: "+234 809 442 0071",
              },
            ].map((contact) => (
              <article key={contact.name}>
                <img src={contact.img} />
                <div>
                  <h3>{contact.name}</h3>
                  <a href={`tel:${contact.phone.replaceAll(" ", "")}`}>
                    {contact.phone}
                  </a>
                </div>
                <a
                  className="contact-action"
                  href={`tel:${contact.phone.replaceAll(" ", "")}`}
                  aria-label={`Call ${contact.name}`}
                >
                  <Phone />
                </a>
                <button
                  className="contact-action"
                  aria-label={`Message ${contact.name}`}
                >
                  <MessageCircle />
                </button>
              </article>
            ))}
            <footer>
              <i /> Sales desk is open now · until 6pm WAT
            </footer>
          </section>
        </aside>

        <div className="allocation-map-tools">
          <button onClick={() => zoom(0.82)} aria-label="Zoom in">
            <Plus />
          </button>
          <button onClick={() => zoom(1.22)} aria-label="Zoom out">
            <Minus />
          </button>
        </div>
        <p className="allocation-hint">
          Drag to rotate · Scroll to zoom · Click a plot
        </p>
      </div>

      {/* Replaced by the forthcoming homepage UI.
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
      */}
      {/* Replaced by the forthcoming homepage UI.
      <div className="menu-wrap">
        <button className="main-menu" onClick={() => setMenuOpen(!menuOpen)}>
          <MenuIcon /> <span>Menu</span>
        </button>
        {menuOpen && (
          <nav className="menu-panel">
            <button>Masterplan</button>
            <button>About Tilal</button>
            <button>Location</button>
            <button>Contact</button>
          </nav>
        )}
      </div>
      */}

      {/* Replaced by the forthcoming homepage UI.
      <div className="zoom-tools">
        <button onClick={() => zoom(0.82)} aria-label="Zoom in">
          <Plus />
        </button>
        <button onClick={() => zoom(1.22)} aria-label="Zoom out">
          <Minus />
        </button>
      </div>
      */}
      <div className="compass" aria-label="Compass">
        <i>N</i>
        <span>W</span>
        <b>▲</b>
        <span>E</span>
        <i>S</i>
      </div>
    </main>
  );
}

export default function TourApp() {
  const [villaId] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("villa"),
  );
  return villaId ? <UnitDetails unitId={villaId} /> : <MasterplanApp />;
}
