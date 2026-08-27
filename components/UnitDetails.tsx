"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Minus,
  Plus,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

const ROOT = "/reference-assets/";
const VIRTUAL_TOUR_URLS = {
  A: "https://3dtour.ua/files/tilal/narjis/3dtour/typea/",
  B: "https://3dtour.ua/files/tilal/narjis/3dtour/typeb/",
  C: "https://3dtour.ua/files/tilal/narjis/3dtour/typec/",
} as const;
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
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.04}
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  );
}

export default function UnitDetails({ unitId }: { unitId: string }) {
  const [unit, setUnit] = useState<Unit | null>(null),
    [view, setView] = useState<"exterior" | "tour">(() =>
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "tour" ? "tour" : "exterior",
    );
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    fetch(`${ROOT}units.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load units (${response.status})`);
        return response.json() as Promise<Unit[]>;
      })
      .then((units) =>
        setUnit(units.find((item) => item.id === unitId) ?? null),
      );
  }, [unitId]);
  const type = (unit?.model?.trim()[0] || "B") as ModelType,
    variant = unit?.model.match(/\(([^)]+)\)/)?.[1] ?? unit?.model ?? "Villa";
  const status =
    unit?.availability.trim() === "Availabel." ? "Available" : "Reserved";
  const salesSubject = encodeURIComponent(`Myxellia villa ${unitId}`);
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
    <main className="unit-detail-page">
      <aside className="unit-detail-sidebar">
        <header className="unit-detail-brandbar">
          <button onClick={() => (window.location.href = "/?map3d")} aria-label="Back to masterplan">
            <ArrowLeft />
          </button>
        </header>

        <section className="unit-detail-summary">
          <div className="unit-detail-heading">
            <small>Tilal Al Ghaf · Narjis</small>
            <h1>{unitId}</h1>
            <p>Type {type} · {variant}</p>
          </div>

          <dl className="unit-detail-facts">
            <div><dt>Block</dt><dd>{unit?.block ?? "—"}</dd></div>
            <div><dt>Direction</dt><dd>{unit?.direction ?? "—"}</dd></div>
            <div><dt>Bedrooms</dt><dd>{unit?.bedrooms ?? "—"}</dd></div>
            <div><dt>Bathrooms</dt><dd>{unit?.bathrooms ?? "—"}</dd></div>
            <div><dt>Land area</dt><dd>{unit ? unit.landArea + " m²" : "—"}</dd></div>
            <div><dt>Status</dt><dd className={status === "Available" ? "status-available" : "status-reserved"}>{status}</dd></div>
          </dl>

          <div className="unit-detail-price">
            <span>Built-up area</span>
            <strong>{unit ? unit.buildArea + " m²" : "—"}</strong>
          </div>

          <dl className="unit-detail-extras">
            <div><dt>Master bedroom</dt><dd>{unit ? unit.master + " m²" : "—"}</dd></div>
            <div><dt>Living room</dt><dd>{unit ? unit.living + " m²" : "—"}</dd></div>
            <div><dt>Kitchen</dt><dd>{unit ? unit.kitchen + " m²" : "—"}</dd></div>
            <div><dt>Guest room</dt><dd>{unit ? unit.guest + " m²" : "—"}</dd></div>
          </dl>

          <nav className="unit-detail-resource-links" aria-label="Unit views">
            <button onClick={() => setViewMode("exterior")}>◇ View 3D exterior</button>
            <button onClick={() => setViewMode("tour")}>◈ Explore virtual tour</button>
          </nav>
        </section>
      </aside>

      <section className="unit-detail-viewer" id="unit-stage">
        <nav className="unit-view-tabs" aria-label="Unit view">
          <button className={view === "exterior" ? "selected" : ""} onClick={() => setViewMode("exterior")}>3D Exterior</button>
          <button className={view === "tour" ? "selected" : ""} onClick={() => setViewMode("tour")}>Virtual Tour</button>
        </nav>

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
            <div className="unit-view-zoom">
              <button onClick={() => zoom(0.82)} aria-label="Zoom in"><Plus /></button>
              <button onClick={() => zoom(1.22)} aria-label="Zoom out"><Minus /></button>
            </div>
          </div>
        ) : (
          <div className="virtual-tour">
            <iframe
              src={VIRTUAL_TOUR_URLS[type]}
              title={`Type ${type} virtual tour`}
              allow="fullscreen"
              allowFullScreen
            />
          </div>
        )}
      </section>

      <aside className="unit-sales-panel">
        <section className="unit-reservation-block">
          <small>Your new home</small>
          <h2>Reserve villa {unitId}<br />in your name</h2>
          <p>Tell us a few things about yourself, review the unit details and payment options, and decide from there.</p>
          <a className="unit-primary-button" href={"mailto:sales@myxellia.io?subject=" + salesSubject}>
            Reserve this unit <span aria-hidden="true">→</span>
          </a>
        </section>

        <section className="unit-sales-contact">
          <small>Your sales contact</small>
          {[
            { name: "Ahmed Ibraheem", role: "Customer Relations Manager", email: "ahmed@myxellia.io", phone: "2348020001188", image: "/assets/ahmed.jpg" },
            { name: "David Peter", role: "Sales Manager", email: "david@myxellia.io", phone: "2348094420071", image: "/assets/peter.png" },
          ].map((contact) => (
            <article className="unit-contact-card" key={contact.name}>
              <img src={contact.image} alt="" />
              <div>
                <h3>{contact.name}</h3>
                <p>{contact.role}</p>
                <a href={"mailto:" + contact.email + "?subject=" + salesSubject}>{contact.email}</a>
              </div>
              <nav>
                <a href={"https://wa.me/" + contact.phone + "?text=I%20am%20interested%20in%20villa%20" + unitId} aria-label={"Message " + contact.name}><MessageCircle /></a>
                <a href={"mailto:" + contact.email + "?subject=" + salesSubject} aria-label={"Email " + contact.name}><Mail /></a>
              </nav>
            </article>
          ))}
          <a className="unit-share-link" href={"mailto:?subject=" + salesSubject + "&body=Take%20a%20look%20at%20villa%20" + unitId}>Send to a friend</a>
        </section>
      </aside>
    </main>
  );
}
