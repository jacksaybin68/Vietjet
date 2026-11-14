import { apiRequest } from '@/shared/services';
import type { DashboardSummary } from '../types/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await apiRequest<DashboardSummary>('/api/quan-tri/dashboard/summary');
  return data;
}
