'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_URL, ApiError, tokenStore } from './api';

/** Fetch-on-mount with manual reload. `silent` reloads keep current data visible (used for live updates). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [meta, setMeta] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!path) return;
    const mySeq = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const r = await api<T>(path);
      if (mySeq === seq.current) { setData(r.data); setMeta(r.meta ?? null); setError(null); }
    } catch (e) {
      if (mySeq === seq.current) setError(e as ApiError);
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, meta, error, loading, reload: load, setData };
}

type StreamEvent = { type: 'ticket.created' | 'ticket.updated' | 'message.created'; ticketId: number; [k: string]: unknown };

/**
 * Subscribes to server-sent events. Falls back to polling (via onEvent with a synthetic event)
 * if the stream can't be established, so the UI still feels live behind restrictive proxies.
 */
export function useTicketStream(onEvent: (e: StreamEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;
    let poll: ReturnType<typeof setInterval> | null = null;
    const es = new EventSource(`${API_URL}/api/v1/stream?token=${encodeURIComponent(token)}`);
    const types: StreamEvent['type'][] = ['ticket.created', 'ticket.updated', 'message.created'];
    for (const t of types) es.addEventListener(t, (ev) => handler.current({ type: t, ...JSON.parse((ev as MessageEvent).data) }));
    es.addEventListener('ready', () => { setConnected(true); if (poll) { clearInterval(poll); poll = null; } });
    es.onerror = () => {
      setConnected(false);
      // EventSource retries automatically; poll meanwhile so updates still arrive.
      if (!poll) poll = setInterval(() => handler.current({ type: 'ticket.updated', ticketId: -1, poll: true }), 15000);
    };
    return () => { es.close(); if (poll) clearInterval(poll); };
  }, []);

  return { connected };
}
