"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ScanLine, AlertCircle, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function ScannerPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [manualInput, setManualInput] = useState(false);
    const [tournamentCode, setTournamentCode] = useState("");
    const streamRef = useRef<MediaStream | null>(null);
    const scannerRef = useRef<any>(null);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => {});
            } catch (e) {}
            scannerRef.current = null;
        }
    };

    const startNativeCamera = async () => {
        try {
            // Check if we're on HTTPS or localhost
            const isSecure = window.location.protocol === 'https:' ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

            if (!isSecure) {
                setError("Le scanner nécessite une connexion sécurisée (HTTPS). Utilisez la saisie manuelle ci-dessous.");
                setManualInput(true);
                return;
            }

            // Request camera with getUserMedia directly
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setScanning(true);

                // Start QR detection loop
                detectQRCode();
            }
        } catch (err: any) {
            console.error("Camera error:", err);
            stopCamera();

            if (err.name === "NotAllowedError") {
                setError("Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setError("Aucune caméra détectée sur cet appareil.");
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                setError("La caméra est utilisée par une autre application.");
            } else if (err.message?.includes("not supported") || err.name === "NotSupportedError") {
                setError("Votre navigateur ne supporte pas l'accès à la caméra. Essayez avec Chrome ou Safari.");
            } else {
                setError("Impossible d'accéder à la caméra. Utilisez la saisie manuelle ci-dessous.");
            }
            setManualInput(true);
        }
    };

    const detectQRCode = () => {
        if (!videoRef.current || !canvasRef.current || !scanning) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Try to use BarcodeDetector if available
            if ('BarcodeDetector' in window) {
                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                barcodeDetector.detect(canvas)
                    .then((barcodes: any[]) => {
                        if (barcodes.length > 0) {
                            handleQRCodeDetected(barcodes[0].rawValue);
                        } else {
                            requestAnimationFrame(detectQRCode);
                        }
                    })
                    .catch(() => {
                        requestAnimationFrame(detectQRCode);
                    });
            } else {
                // Fallback: just keep showing camera, user will need manual input
                requestAnimationFrame(detectQRCode);
            }
        } else {
            requestAnimationFrame(detectQRCode);
        }
    };

    const handleQRCodeDetected = (text: string) => {
        if (text.includes("/tournois/") && text.includes("/inscription")) {
            stopCamera();
            try {
                const urlObj = new URL(text);
                router.push(urlObj.pathname);
            } catch {
                const match = text.match(/\/tournois\/([^/]+)\/inscription/);
                if (match) {
                    router.push(match[0]);
                }
            }
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tournamentCode.trim()) {
            // Check if it's a full URL or just a code
            if (tournamentCode.includes("/tournois/")) {
                try {
                    const urlObj = new URL(tournamentCode);
                    router.push(urlObj.pathname);
                } catch {
                    const match = tournamentCode.match(/\/tournois\/([^/]+)/);
                    if (match) {
                        router.push(`/tournois/${match[1]}/inscription`);
                    }
                }
            } else {
                // Assume it's just the tournament ID
                router.push(`/tournois/${tournamentCode.trim()}/inscription`);
            }
        }
    };

    useEffect(() => {
        startNativeCamera();

        return () => {
            stopCamera();
        };
    }, []);

    const retryCamera = () => {
        setError(null);
        setManualInput(false);
        startNativeCamera();
    };

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-4">
                    <Link href="/mon-profil">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-white">Scanner un QR code</h1>
                </div>
            </div>

            {/* Camera View */}
            <div className="relative w-full h-screen flex items-center justify-center">
                {error ? (
                    <Card className="m-4 max-w-md">
                        <CardContent className="py-8">
                            <div className="text-center mb-6">
                                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                                <p className="text-foreground mb-4">{error}</p>
                                <Button onClick={retryCamera} variant="outline" className="gap-2 mb-4">
                                    <RefreshCw className="h-4 w-4" />
                                    Réessayer la caméra
                                </Button>
                            </div>

                            {manualInput && (
                                <div className="border-t pt-6">
                                    <h3 className="font-semibold text-foreground mb-3 text-center">
                                        Saisie manuelle
                                    </h3>
                                    <form onSubmit={handleManualSubmit} className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Code du tournoi ou URL"
                                            value={tournamentCode}
                                            onChange={(e) => setTournamentCode(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground"
                                        />
                                        <Button type="submit" className="w-full">
                                            Accéder au tournoi
                                        </Button>
                                    </form>
                                </div>
                            )}

                            <div className="mt-6 space-y-2">
                                <Link href="/tournois">
                                    <Button variant="outline" className="w-full">
                                        Voir les tournois disponibles
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="relative w-full h-full">
                        {/* Video element */}
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Scanning overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative">
                                {/* Scan frame */}
                                <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                                    {/* Corner accents */}
                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />

                                    {/* Scanning line animation */}
                                    {scanning && (
                                        <div className="absolute inset-x-4 h-0.5 bg-primary animate-bounce" style={{ top: '50%' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-10">
                            <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full">
                                <ScanLine className="h-5 w-5" />
                                <span>Placez le QR code dans le cadre</span>
                            </div>
                        </div>

                        {/* Manual input button */}
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setError("Saisie manuelle activée");
                                    setManualInput(true);
                                }}
                                className="gap-2"
                            >
                                <Camera className="h-4 w-4" />
                                Saisir le code manuellement
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
