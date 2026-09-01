import type { Metadata } from "next";
import "./globals.css";
import "@/components/UnitDetails/reservation.css";

import { getEsubDetails } from "@/lib/units";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Myxellia Allocation",
  description: "Interactive 3D model for myxellia properties allocations",
  icons: {
    icon: [{ url: "/assets/icon.svg", type: "image/svg+xml" }],
    shortcut: "/assets/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const esubDetails = await getEsubDetails();
  console.log("esubDetails", esubDetails);

  return (
    <html lang="en">
      <body>
        <Providers esubDetails={esubDetails}>{children}</Providers>
      </body>
    </html>
  );
}
