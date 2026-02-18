"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Oups ! Erreur sur la gestion du tournoi.</h2>
            <p className="text-red-500 bg-red-50 p-4 rounded mb-6 font-mono text-sm max-w-lg overflow-auto">
                {error.message}
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()}>Réessayer</Button>
                <Link href="/tournois">
                    <Button variant="outline">Retour à la liste</Button>
                </Link>
            </div>
        </div>
    );
}
