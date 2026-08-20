"use client";

import dynamic from "next/dynamic";

const TourApp = dynamic(() => import("@/components/TourApp"), { ssr: false });

export default function Page() {
  return <TourApp />;
}
