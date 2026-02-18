"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Map,
  BarChart3,
  Users,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  getTopPlayers,
} from "@/lib/mock/data";
import { useAuth } from "@/lib/context/AuthContext";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";

const features = [
  {
    icon: Trophy,
    title: "Tournois",
    description:
      "Créez et participez à des tournois près de chez vous. Triplettes, doublettes ou tête-à-tête.",
    href: "/tournois",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Map,
    title: "Carte Interactive",
    description:
      "Trouvez les tournois et les joueurs autour de vous grâce à notre carte en temps réel.",
    href: "/carte",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Classement",
    description:
      "Suivez votre progression avec le système ELO et grimpez dans le classement national.",
    href: "/classement",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Communauté",
    description:
      "Échangez avec d'autres passionnés via notre système de messagerie intégré.",
    href: "/messages",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const topPlayers = getTopPlayers(5);

  useEffect(() => {
    if (!loading && user) {
      router.push('/mon-profil');
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect logged-in users to their profile
  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-24 md:pb-32">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.08),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(var(--secondary-rgb),0.1),transparent_50%)]" />
        {/* Subtle grid pattern (CSS only, no external request) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full hidden md:block opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 49px, currentColor 49px, currentColor 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, currentColor 49px, currentColor 50px)', backgroundSize: '50px 50px' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Badge variant="outline" className="px-4 py-1.5 border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
              L'Elite de la Pétanque
            </Badge>
            <h1 className="text-4xl md:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Organisez, jouez, <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-accent animate-gradient">
                faites-vous plaisir
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              La plateforme tout-en-un pour les passionnés de pétanque.
              Gérez vos tournois, suivez vos scores et rejoignez la communauté.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link href="/tournois">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-bold bg-background/50 backdrop-blur-sm border-border/40 hover:bg-muted/50 transition-all gap-2">
                  <Trophy className="h-5 w-5" />
                  Voir les tournois
                </Button>
              </Link>
              <Link href="/inscription">
                <Button size="lg" className="rounded-full px-8 h-14 text-base font-bold shadow-xl shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/40 transition-all">
                  Créer un compte
                </Button>
              </Link>
            </div>

            {/* QR Code Section */}
            <div className="mt-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
              <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-primary/20 transform hover:scale-105 transition-transform duration-300 border-4 border-white/50 backdrop-blur-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getMobileUrl('/inscription'))}`}
                  alt="QR Code Inscription"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-muted-foreground font-medium text-sm bg-background/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/50">
                Scannez pour créer un compte rapidement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce qu&apos;il vous faut pour briller
            </h2>
            <p className="text-lg text-muted-foreground">
              Une expérience premium pensée pour les organisateurs et les compétiteurs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <Link key={feature.title} href={feature.href} className="group">
                <Card className="h-full border-border/40 bg-card transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/5 group-hover:-translate-y-2 overflow-hidden relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 transition-transform group-hover:scale-150 ${feature.bgColor}`} />
                  <CardHeader className="pt-8">
                    <div
                      className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-all duration-500 shadow-lg`}
                    >
                      <feature.icon className={`h-7 w-7 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-6 flex items-center font-bold text-sm text-primary group-hover:gap-2 transition-all opacity-0 group-hover:opacity-100">
                      En savoir plus <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Players */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
            <div className="max-w-xl">
              <Badge className="mb-4 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 border-none px-3 py-1">
                Classement National
              </Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
                Meilleurs joueurs
              </h2>
              <p className="text-lg text-muted-foreground mt-4">
                Découvrez l'élite de la communauté. Battez-vous pour atteindre le sommet du classement ELO.
              </p>
            </div>
            <Link href="/classement">
              <Button variant="ghost" className="group text-primary hover:text-primary hover:bg-primary/5 font-bold h-12">
                Voir le classement complet
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 max-w-4xl mx-auto">
            {topPlayers.map((player, index) => (
              <Link key={player.id} href={`/profil/${player.id}`}>
                <Card className="group border-border/40 bg-card/50 hover:bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-6 px-8">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (index + 1)}
                    </div>
                    <div className="relative">
                      <Avatar
                        src={player.avatar}
                        fallback={`${player.firstName[0]}${player.lastName[0]}`}
                        size="xl"
                        className="ring-4 ring-primary/5 group-hover:ring-primary/20 transition-all shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-background rounded-full border border-border shadow-sm">
                        <div className={`w-3 h-3 rounded-full ${index < 3 ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-2xl font-bold text-foreground">
                        {player.firstName} {player.lastName}
                      </h3>
                      <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          {player.location.city}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                      <div className="text-3xl font-black text-primary tabular-nums">
                        {player.eloRating}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Points ELO</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-br from-primary via-primary to-accent border-none text-white overflow-hidden relative shadow-[0_30px_70px_rgba(var(--primary-rgb),0.3)]">
            {/* Visual interest for CTA */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <CardContent className="py-20 md:py-28 text-center relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                Façonnez votre légende sur le terrain
              </h2>
              <p className="text-xl text-white/90 mb-12 leading-relaxed">
                Rejoignez des milliers de joueurs, organisez des tournois mémorables et suivez votre progression en temps réel.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link href="/inscription">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 h-16 px-10 rounded-2xl text-lg font-black shadow-xl gap-3 transition-transform hover:scale-105 active:scale-95"
                  >
                    Créer mon compte
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:border-white/40 hover:bg-white/10 h-16 px-10 rounded-2xl text-lg font-bold text-white transition-all"
                  >
                    Contacter le support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
