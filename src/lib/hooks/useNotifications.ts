"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return "denied";
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    // Si l'utilisateur est sur la page, afficher un toast
    if (document.hasFocus()) {
      toast(title, {
        icon: "💬",
        duration: 4000,
      });
      return;
    }

    // Sinon, afficher une notification système
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "chat-message",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  return {
    permission,
    requestPermission,
    showNotification,
  };
}
