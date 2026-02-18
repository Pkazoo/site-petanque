"use client";

import Link from "next/link";
import { Target } from "lucide-react";

const footerLinks = {
    plateforme: [
        { name: "Tournois", href: "/tournois" },
        { name: "Classement", href: "/classement" },
    ],
    communaute: [
        { name: "À propos", href: "/a-propos" },
        { name: "Contact", href: "/contact" },
        { name: "FAQ", href: "/faq" },
    ],
    legal: [
        { name: "CGU", href: "/cgu" },
        { name: "Confidentialité", href: "/confidentialite" },
        { name: "Cookies", href: "/cookies" },
    ],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-muted/30 mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <Target className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold text-foreground">
                                Pétanque<span className="text-primary">Manager</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            La plateforme de référence pour les passionnés de pétanque.
                            Organisez, participez et progressez !
                        </p>
                    </div>

                    {/* Plateforme */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Plateforme</h3>
                        <ul className="space-y-2">
                            {footerLinks.plateforme.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Communauté */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Communauté</h3>
                        <ul className="space-y-2">
                            {footerLinks.communaute.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Légal */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Légal</h3>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} PétanqueManager. Tous droits réservés.</p>
                    <button
                        onClick={() => {
                            if (confirm("⚠️ ATTENTION : Cela va effacer TOUS vos tournois, joueurs et matchs locaux pour réparer l'application. Continuer ?")) {
                                localStorage.clear();
                                window.location.href = "/";
                            }
                        }}
                        className="mt-4 text-xs opacity-20 hover:opacity-100 text-red-500 transition-opacity"
                    >
                        SOS: Réinitialiser l&apos;application
                    </button>
                </div>
            </div>
        </footer>
    );
}
