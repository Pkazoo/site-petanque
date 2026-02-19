"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Trophy,
    BarChart3,
    Home,
    Menu,
    X,
    Shield,
    LogIn,
    LogOut,
    Crown,
    Users,
    User,
    QrCode,
    Play
} from "lucide-react";
import { GlobalMessageListener } from "./GlobalMessageListener";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/context/AuthContext";
import { useTournament } from "@/lib/context/TournamentContext";
import { getMobileUrl } from "@/lib/utils/getMobileUrl";

const roleConfig: Record<string, { label: string; icon: typeof Crown; className: string }> = {
    admin: { label: "Admin", icon: Crown, className: "bg-red-100 text-red-800 border-red-200" },
    organisateur: { label: "Organisateur", icon: Users, className: "bg-orange-100 text-orange-800 border-orange-200" },
    organizer: { label: "Organisateur", icon: Users, className: "bg-orange-100 text-orange-800 border-orange-200" },
    joueur: { label: "Joueur", icon: User, className: "bg-blue-100 text-blue-800 border-blue-200" },
    player: { label: "Joueur", icon: User, className: "bg-blue-100 text-blue-800 border-blue-200" },
    user: { label: "Joueur", icon: User, className: "bg-blue-100 text-blue-800 border-blue-200" },
};

const navigation = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Tournois", href: "/tournois", icon: Trophy },
    { name: "Joueurs", href: "/admin", icon: Users, adminOnly: true },
    { name: "Classement", href: "/classement", icon: BarChart3 },
];

export function Header() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);

    // Generate QR code URL for mobile connection
    const getConnectionUrl = () => {
        return getMobileUrl('/connexion');
    };
    const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);
    const { user, userAccount, isAdmin, signOut, loading } = useAuth();
    const { getPlayerByUserId, matches, getTeam } = useTournament();
    // Get player avatar
    const playerProfile = user ? getPlayerByUserId(user.id) : null;
    const avatarSrc = playerProfile?.avatar || (user?.email ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}` : undefined);

    // Trouver le match en cours pour le joueur connecté
    const currentMatch = matches.find(m => {
        if (m.status !== 'ongoing' || !user || !playerProfile) return false;

        const team1 = m.team1Id ? getTeam(m.team1Id) : null;
        const team2 = m.team2Id ? getTeam(m.team2Id) : null;

        const isParticipant = (team: any) => team?.playerIds?.includes(playerProfile.id);

        return isParticipant(team1) || isParticipant(team2);
    });

    const handleMouseEnter = () => {
        if (dropdownTimeout.current) {
            clearTimeout(dropdownTimeout.current);
            dropdownTimeout.current = null;
        }
        setDropdownOpen(true);
    };

    const handleMouseLeave = () => {
        // Ferme immédiatement quand la souris quitte la zone
        if (dropdownTimeout.current) {
            clearTimeout(dropdownTimeout.current);
        }
        dropdownTimeout.current = setTimeout(() => {
            setDropdownOpen(false);
        }, 150); // Délai court pour une meilleure UX
    };

    return (
        <>
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo + QR Code */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                            <img src="/logo-fanny.png" alt="Pétanque Manager" className="h-10 w-10 object-cover" />
                        </div>
                        <span className="hidden sm:block text-xl font-bold text-foreground">
                            Pétanque<span className="text-primary">Manager</span>
                        </span>
                    </Link>

                    {/* QR Code Button */}
                    <button
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        title="QR Code de connexion mobile"
                    >
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Navigation Desktop */}
                <nav className="hidden md:flex items-center gap-1">
                    {navigation.map((item) => {
                        // Skip if item is adminOnly and current user is not admin
                        if (item.adminOnly && !isAdmin) return null;

                        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                pathname === "/admin"
                                    ? "bg-red-100 text-red-800"
                                    : "text-muted-foreground hover:bg-red-50 hover:text-red-700"
                            )}
                        >
                            <Shield className="h-4 w-4" />
                            Admin
                        </Link>
                    )}

                    {/* Raccourci Match en cours */}
                    {currentMatch && (
                        <Link
                            href={`/mes-tournois/${currentMatch.tournamentId}#match-en-cours`}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white hover:bg-green-600 animate-pulse transition-colors ml-2 shadow-lg ring-2 ring-green-300 ring-offset-2"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Mon match en cours
                        </Link>
                    )}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Profile / Auth */}
                    {loading ? (
                        <Link href="/connexion" className="hidden sm:block">
                            <Button variant="default" size="sm" className="gap-2">
                                <LogIn className="h-4 w-4" />
                                Connexion
                            </Button>
                        </Link>
                    ) : user ? (
                        <div className="hidden sm:flex items-center gap-3">
                            {/* User Dropdown */}
                            <div
                                className="relative"
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors">
                                            <Avatar
                                                src={avatarSrc}
                                                fallback={userAccount?.display_name?.substring(0, 2).toUpperCase() || "U"}
                                                size="md"
                                                className={cn(
                                                    "ring-2 transition-all cursor-pointer",
                                                    dropdownOpen ? "ring-primary/50" : "ring-primary/20"
                                                )}
                                            />
                                        </button>

                                        {/* Dropdown Menu */}
                                        <div className={cn(
                                            "absolute right-0 top-full mt-2 w-64 transition-all duration-200 z-50",
                                            dropdownOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                                        )}>
                                            <div className="bg-background border border-border rounded-xl shadow-xl p-4">
                                                {/* User Info */}
                                                <div className="flex items-center gap-3 pb-3 border-b border-border">
                                                    <Avatar
                                                        src={avatarSrc}
                                                        fallback={userAccount?.display_name?.substring(0, 2).toUpperCase() || "U"}
                                                        size="lg"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {userAccount?.display_name || "Utilisateur"}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Role Badge */}
                                                {userAccount?.role && roleConfig[userAccount.role] && (
                                                    <div className="py-3 border-b border-border">
                                                        <p className="text-xs text-muted-foreground mb-1.5">Statut</p>
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border",
                                                            roleConfig[userAccount.role].className
                                                        )}>
                                                            {(() => {
                                                                const RoleIcon = roleConfig[userAccount.role].icon;
                                                                return <RoleIcon className="h-4 w-4" />;
                                                            })()}
                                                            {roleConfig[userAccount.role].label}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="pt-3 space-y-1">
                                                    <Link
                                                        href="/mon-profil"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <User className="h-4 w-4" />
                                                        Mon profil
                                                    </Link>
                                                    {isAdmin && (
                                                        <Link
                                                            href="/admin"
                                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                            Admin
                                                        </Link>
                                                    )}
                                                    <button
                                                        onClick={() => signOut()}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors w-full text-left"
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                        Se déconnecter
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                            </div>
                        </div>
                    ) : (
                        <Link href="/connexion" className="hidden sm:block">
                            <Button variant="default" size="sm" className="gap-2">
                                <LogIn className="h-4 w-4" />
                                Connexion
                            </Button>
                        </Link>
                    )}

                    {/* Mobile Logout Button */}
                    {!loading && user && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-destructive"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    )}

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* QR Code Popup */}
            {showQrCode && (
                <div className="absolute top-16 left-4 z-50 animate-fade-in">
                    <div className="bg-background border border-border rounded-xl shadow-xl p-4 w-72">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">Connexion Mobile</h3>
                            <button
                                onClick={() => setShowQrCode(false)}
                                className="p-1 rounded hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-border flex justify-center">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getConnectionUrl())}`}
                                alt="QR Code de connexion"
                                className="w-44 h-44"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-3">
                            Scannez ce QR code avec votre téléphone pour accéder à la page de connexion
                        </p>
                        <p className="text-xs text-primary font-mono text-center mt-2 break-all">
                            {getConnectionUrl()}
                        </p>
                    </div>
                </div>
            )}

            <GlobalMessageListener />
        </header>

        {/* Mobile Menu - fixed overlay outside header for proper scrolling */}
        {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
                <nav className="container mx-auto px-4 py-4 flex flex-col gap-2 pb-24">
                    {navigation.map((item) => {
                        // Skip if item is adminOnly and current user is not admin
                        if (item.adminOnly && !isAdmin) return null;

                        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}

                    {/* Mobile Match Shortcut */}
                    {currentMatch && (
                        <Link
                            href={`/mes-tournois/${currentMatch.tournamentId}#match-en-cours`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-bold bg-green-500 text-white hover:bg-green-600 animate-pulse transition-colors"
                        >
                            <Play className="h-5 w-5 fill-current" />
                            Mon match en cours
                        </Link>
                    )}

                    <div className="border-t border-border my-2" />
                    {user ? (
                        <>
                            {/* Role Badge Mobile */}
                            {userAccount?.role && roleConfig[userAccount.role] && (
                                <div className="px-4 py-2">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border",
                                        roleConfig[userAccount.role].className
                                    )}>
                                        {(() => {
                                            const RoleIcon = roleConfig[userAccount.role].icon;
                                            return <RoleIcon className="h-4 w-4" />;
                                        })()}
                                        {roleConfig[userAccount.role].label}
                                    </div>
                                </div>
                            )}
                            <Link
                                href="/mon-profil"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Avatar
                                    src={avatarSrc}
                                    fallback={userAccount?.display_name?.substring(0, 2).toUpperCase() || "U"}
                                    size="sm"
                                />
                                Mon profil
                            </Link>
                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-700 hover:bg-red-50"
                                >
                                    <Shield className="h-5 w-5" />
                                    Admin
                                </Link>
                            )}
                            <button
                                onClick={() => {
                                    signOut();
                                    setMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full text-left"
                            >
                                <LogOut className="h-5 w-5" />
                                Se deconnecter
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/connexion"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <LogIn className="h-5 w-5" />
                            Connexion
                        </Link>
                    )}
                </nav>
            </div>
        )}
        </>
    );
}
