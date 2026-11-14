import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardSummary } from '../services/dashboard.service';
import type { DashboardSummary } from '../types/dashboard';

export function useAdminDashboard(pollIntervalMs = 30000) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const result = await getDashboardSummary();
      if (isMountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu bảng điều khiển';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current && !isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    if (pollIntervalMs > 0) {
      const intervalId = setInterval(() => {
        fetchData(true);
      }, pollIntervalMs);
      return () => {
        isMountedRef.current = false;
        clearInterval(intervalId);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData, pollIntervalMs]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchData(false),
  };
}
