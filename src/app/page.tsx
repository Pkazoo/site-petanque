"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Users,
  ArrowRight,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/context/AuthContext";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) {
      router.push('/mon-profil');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative pt-16 pb-10 md:pt-28 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <img
              src="/logo-fanny.png"
              alt="PétanqueManager"
              className="w-24 h-24 mx-auto rounded-2xl shadow-lg object-cover"
            />
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Organisez vos concours{" "}
              <span className="text-primary">simplement</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tournois locaux, ligues entre amis : gérez tout depuis votre téléphone. Inscription par QR code, scores en direct, classement automatique.
            </p>
            <div className="pt-2">
              <Link href="/inscription">
                <Button size="lg" className="rounded-full px-8 h-14 text-base font-bold shadow-lg bg-primary hover:bg-primary/90 text-white transition-all">
                  Créer un compte
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* QR Code */}
      <section className="py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
              <QrCode className="h-4 w-4 text-primary" />
              <span>Inscription rapide</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getMobileUrl('/inscription'))}`}
                alt="QR Code Inscription"
                className="w-40 h-40 rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Scannez depuis votre téléphone pour créer un compte
            </p>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
              Deux modes de jeu pour s&apos;adapter à toutes vos parties.
            </p>

            <div className="grid md:grid-cols-2 gap-24">
              {/* Concours */}
              <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-5">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Concours locaux</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Créez des concours avec le format de votre choix : <strong className="text-foreground">poules</strong>, <strong className="text-foreground">élimination directe</strong> ou <strong className="text-foreground">consolante</strong>.
                </p>
                <ul className="space-y-3 pt-4">
                  {[
                    "Inscription des joueurs via QR code",
                    "Gestion automatique des terrains",
                    "Les équipes saisissent leurs propres scores",
                    "L'organisateur est libéré pour le reste",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ligues */}
              <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-5">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Ligues entre amis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Lancez une ligue sur <strong className="text-foreground">une journée</strong> ou sur <strong className="text-foreground">la période de votre choix</strong>.
                </p>
                <ul className="space-y-3 pt-4">
                  {[
                    "Mini-concours entre potes sur une journée",
                    "Ligue longue durée sur plusieurs semaines",
                    "Enregistrement des scores au fil des parties",
                    "Classement en temps réel",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Prêt à lancer votre concours ?
              </h2>
              <p className="text-white/80 mb-8 max-w-md mx-auto">
                Créez votre compte gratuitement et organisez votre premier tournoi en quelques minutes.
              </p>
              <Link href="/inscription">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 rounded-full px-8 h-14 text-base font-bold shadow-lg transition-transform hover:scale-105"
                >
                  Créer mon compte
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
