/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — SSE Client Hook
   
   Connects to the Go engine's Server-Sent Events stream
   for real-time HAKA/HAKI tick data.
   ══════════════════════════════════════════════════════════════ */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SSE_URL = process.env.NEXT_PUBLIC_ENGINE_SSE_URL || 'http://localhost:8080/sse';

export interface TickData {
  time: string;
  emiten: string;
  price: number;
  volume: number;
  type: 'haka' | 'haki';
  broker_buy?: string;
  broker_sell?: string;
}

interface SSEState {
  connected: boolean;
  lastTick: TickData | null;
  ticks: TickData[];
  hakaCount: number;
  hakiCount: number;
  hakaVolume: number;
  hakiVolume: number;
  error: string | null;
}

export function useSSETicks(maxTicks = 100) {
  const [state, setState] = useState<SSEState>({
    connected: false,
    lastTick: null,
    ticks: [],
    hakaCount: 0,
    hakiCount: 0,
    hakaVolume: 0,
    hakiVolume: 0,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(SSE_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
      };

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'tick' && msg.data) {
            const tick = msg.data as TickData;
            setState(prev => {
              const ticks = [tick, ...prev.ticks].slice(0, maxTicks);
              return {
                ...prev,
                lastTick: tick,
                ticks,
                hakaCount: prev.hakaCount + (tick.type === 'haka' ? 1 : 0),
                hakiCount: prev.hakiCount + (tick.type === 'haki' ? 1 : 0),
                hakaVolume: prev.hakaVolume + (tick.type === 'haka' ? tick.volume : 0),
                hakiVolume: prev.hakiVolume + (tick.type === 'haki' ? tick.volume : 0),
              };
            });
          }
          // heartbeat messages are silently consumed
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        setState(prev => ({ ...prev, connected: false, error: 'Connection lost' }));
        es.close();
        eventSourceRef.current = null;

        // Auto-reconnect with backoff
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
    } catch (err) {
      setState(prev => ({
        ...prev,
        connected: false,
        error: err instanceof Error ? err.message : 'SSE connection failed',
      }));
    }
  }, [maxTicks]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const resetCounters = useCallback(() => {
    setState(prev => ({
      ...prev,
      hakaCount: 0,
      hakiCount: 0,
      hakaVolume: 0,
      hakiVolume: 0,
    }));
  }, []);

  return { ...state, resetCounters, reconnect: connect };
}
