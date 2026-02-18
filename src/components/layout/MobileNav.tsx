"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BarChart3, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navigation = [
    { name: "Tournois", href: "/tournois", icon: Trophy },
    { name: "Classement", href: "/classement", icon: BarChart3 },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    { name: "Profil", href: "/mon-profil", icon: User },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {navigation.map((item) => {
                    const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 transition-transform",
                                    isActive && "scale-110"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[10px] font-medium",
                                    isActive && "font-semibold"
                                )}
                            >
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
