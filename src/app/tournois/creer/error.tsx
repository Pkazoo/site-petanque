"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Oups ! Une erreur est survenue.</h2>
            <p className="text-red-500 bg-red-50 p-4 rounded mb-6 font-mono text-sm max-w-lg overflow-auto">
                {error.message}
            </p>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Réessayer
            </Button>
        </div>
    );
}
