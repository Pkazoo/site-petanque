"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/context/AuthContext";

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
    <div className="flex flex-col min-h-screen relative">
      {/* Blobs décoratifs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/[0.07] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-secondary/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/[0.05] rounded-full blur-3xl" />
      </div>

      {/* Comment ça marche */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground text-center mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
              Deux modes de jeu pour s&apos;adapter à toutes vos parties.
            </p>

            <div className="grid md:grid-cols-2 gap-24">
              {/* Concours */}
              <div className="bg-card rounded-3xl border border-border/30 p-8 space-y-5 shadow-lg shadow-primary/5">
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
              <div className="bg-card rounded-3xl border border-border/30 p-8 space-y-5 shadow-lg shadow-primary/5">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
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
                      <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
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
          <div className="bg-gradient-to-br from-primary via-primary/90 to-accent/80 rounded-3xl p-12 md:p-16 text-center text-white relative overflow-hidden">
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
