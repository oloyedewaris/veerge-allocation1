import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilal Narjis | Interactive 3D Map",
  description: "Interactive Three.js community map for Tilal Narjis"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
