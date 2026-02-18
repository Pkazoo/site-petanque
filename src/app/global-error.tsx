"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: 40, fontFamily: 'system-ui' }}>
                    <h1>Erreur Critique Système</h1>
                    <p style={{ color: 'red', background: '#fff0f0', padding: 20 }}>
                        {error.message}
                    </p>
                    <button onClick={() => reset()} style={{ padding: '10px 20px', fontSize: 16 }}>
                        Redémarrer l&apos;application
                    </button>
                </div>
            </body>
        </html>
    );
}
