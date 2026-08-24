import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myxellia Allocation",
  description: "Interactive 3D model for myxellia properties allocations",
  icons: {
    icon: [{ url: "/assets/icon.svg", type: "image/svg+xml" }],
    shortcut: "/assets/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
