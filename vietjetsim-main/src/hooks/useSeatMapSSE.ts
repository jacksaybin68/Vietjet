'use client';
import { useEffect, useState, useRef } from 'react';

export interface SeatMapEvent {
  flightId: string;
  occupied: string[];
  locked: { seatId: string; expiresAt: string }[];
  updatedAt: string;
}

export function useSeatMapSSE(flightId: string | null) {
  const [data, setData] = useState<SeatMapEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!flightId || typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const es = new EventSource(`/api/sse/ghe-ngoi?flightId=${flightId}`);
    esRef.current = es;

    es.addEventListener('seats', (e) => {
      try {
        setData(JSON.parse(e.data));
      } catch {
        // malformed JSON — ignore
      }
    });

    es.onerror = () => {
      // silent reconnect; EventSource handles retry automatically
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [flightId]);

  return { data };
}
