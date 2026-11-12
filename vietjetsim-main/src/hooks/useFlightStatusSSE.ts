'use client';
import { useEffect, useState, useRef } from 'react';

export interface FlightStatusEvent {
  flightId: string;
  flightNo: string;
  status: 'active' | 'delayed' | 'cancelled' | 'completed' | 'departed';
  departTime: string;
  arriveTime: string;
  updatedAt: string;
}

export function useFlightStatusSSE(flightId: string | null) {
  const [data, setData] = useState<FlightStatusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!flightId || typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const es = new EventSource(`/api/sse/trang-thai-chuyen-bay?flightId=${flightId}`);
    esRef.current = es;

    es.addEventListener('flight-status', (e) => {
      try {
        setData(JSON.parse(e.data));
        setError(null);
      } catch {
        // malformed JSON — ignore
      }
    });

    es.addEventListener('ping', () => {
      // keep-alive heartbeat — no-op
    });

    es.onerror = () => setError('Mất kết nối realtime');

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [flightId]);

  return { data, error };
}
