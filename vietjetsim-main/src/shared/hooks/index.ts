// Shared hooks used across features.
//
// The implementations live in `src/hooks`; re-exporting here gives feature
// modules a single import surface without duplicating the logic.
export { useToast } from '@/hooks/useToast';
export type { ShowToastOptions } from '@/hooks/useToast';

export { useCsrf, refreshCsrfToken } from '@/hooks/useCsrf';
