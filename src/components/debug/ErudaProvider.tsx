"use client";

import { useEffect } from "react";

export function ErudaProvider() {
  useEffect(() => {
    // Charger Eruda uniquement avec ?debug=true (pas automatiquement sur mobile)
    const hasDebugParam = new URLSearchParams(window.location.search).has("debug");

    if (hasDebugParam) {
      import("eruda").then((eruda) => {
        eruda.default.init();
        console.log("Eruda console de débogage activée");
      });
    }
  }, []);

  return null;
}
