"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Charge `url` puis le recharge à chaque changement signalé par le flux temps réel.
 * `projectId` limite le flux à un projet ; sans lui, tous les projets sont suivis.
 */
export function useLiveData<T>(url: string, projectId?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Erreur ${response.status}`);
      setData(body as T);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [url]);

  useEffect(() => {
    void reload();
    const source = new EventSource(projectId ? `/api/stream?projectId=${encodeURIComponent(projectId)}` : "/api/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = () => {
      // Plusieurs écritures arrivent souvent ensemble : un seul rechargement.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void reload(), 120);
    };
    return () => {
      source.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reload, projectId]);

  return { data, error, connected, reload };
}

export async function postJson(url: string, body: unknown = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `Erreur ${response.status}`);
  return result;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
