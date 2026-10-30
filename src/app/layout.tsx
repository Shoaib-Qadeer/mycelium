import type { Metadata } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/hanken-grotesk/index.css";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mycelium",
  description: "Map the people you know, see where your network is strong or fragile, and find warm introductions through friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
