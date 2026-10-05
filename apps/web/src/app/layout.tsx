import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "hAIr consultation preview",
  description:
    "Create a private AI hairstyle visualization and a stylist-reviewed service direction.",
};

export const viewport = {
  colorScheme: "light",
  themeColor: "#f4efe7",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
