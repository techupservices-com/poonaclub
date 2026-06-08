"use client";

import { useEffect } from "react";

export function useVisiblePolling(intervalMs: number, callback: () => void | Promise<void>) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval || document.visibilityState !== "visible") return;
      interval = setInterval(() => {
        void callback();
      }, intervalMs);
    }

    function stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback, intervalMs]);
}
