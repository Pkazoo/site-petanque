import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { TournamentProvider } from "@/lib/context/TournamentContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { ErudaProvider } from "@/components/debug/ErudaProvider";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PétanqueManager - La plateforme des passionnés de pétanque",
  description:
    "Organisez des tournois, trouvez des joueurs près de chez vous et grimpez dans le classement national. Rejoignez la communauté PétanqueManager !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen flex flex-col antialiased">
        <ServiceWorkerRegister />
        <ErudaProvider />
        <AuthProvider>
          <TournamentProvider>
            <Header />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <Footer />
            <MobileNav />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
              }}
            />
          </TournamentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
