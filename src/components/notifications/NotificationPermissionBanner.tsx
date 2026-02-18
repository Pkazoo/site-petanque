"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNotifications } from "@/lib/hooks/useNotifications";

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const { permission, requestPermission } = useNotifications();

  useEffect(() => {
    // Afficher le banner si la permission n'a pas encore été demandée
    if (permission === "default") {
      setShow(true);
    }
  }, [permission]);

  const handleRequest = async () => {
    await requestPermission();
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    // Sauvegarder dans localStorage pour ne plus afficher
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  useEffect(() => {
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (dismissed === "true") {
      setShow(false);
    }
  }, []);

  if (!show || permission !== "default") {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-start gap-3">
        <Bell className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium mb-1">Activer les notifications</p>
          <p className="text-sm opacity-90 mb-3">
            Recevez une notification lorsque vous recevez un message de match.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRequest}
              className="text-xs"
            >
              Activer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs text-primary-foreground hover:bg-primary-foreground/10"
            >
              Plus tard
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
