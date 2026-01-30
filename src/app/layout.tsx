import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pétanque",
  description: "Application de pétanque",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
