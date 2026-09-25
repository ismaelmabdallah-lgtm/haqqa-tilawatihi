"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    console.log("PWARegister component loaded");

    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker is not supported");
      return;
    }

    console.log("Service Worker is supported");
    console.log("Current environment:", process.env.NODE_ENV);

    if (process.env.NODE_ENV !== "production") {
      console.log("Service Worker registration skipped: development mode");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log("Attempting to register /sw.js...");

        const registration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
          }
        );

        console.log(
          "PWA Service Worker registered successfully:",
          registration.scope
        );
      } catch (error) {
        console.error(
          "PWA Service Worker registration failed:",
          error
        );
      }
    };

    if (document.readyState === "loading") {
      window.addEventListener("load", registerServiceWorker, {
        once: true,
      });

      return () => {
        window.removeEventListener("load", registerServiceWorker);
      };
    }

    registerServiceWorker();
  }, []);

  return null;
}