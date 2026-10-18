import { apiRequest, withPathParams } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  AdminAirportInput,
  AdminAnalytics,
  AdminAuditLog,
  AdminRbacAuditRow,
  AdminRoleRow,
  AdminAnnouncement,
  AdminBankAccount,
  AdminBankAccountInput,
  AdminBooking,
  AdminDiscount,
  AdminFlight,
  AdminList,
  AdminRefund,
  AdminTransaction,
  AdminUser,
  Airport,
} from '../types';

const EP = API_ENDPOINTS.ADMIN;

export interface AdminListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

function buildQuery(query: AdminListQuery, searchParam = 'search'): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set(searchParam, query.search);
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : '';
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const analytics = await apiRequest<AdminAnalytics>(EP.REVENUE);
  return {
    ...analytics,
    monthly: analytics.monthly ?? [],
    routes: analytics.routes ?? [],
    classSplit: analytics.classSplit ?? [],
  };
}

// ─── Airports ───────────────────────────────────────────────────────────────

export function listAirports(query: AdminListQuery = {}) {
  // Airports and announcements read the search term from `q`, unlike the rest.
  return apiRequest<AdminList<'airports', Airport>>(`${EP.AIRPORTS}${buildQuery(query, 'q')}`);
}

export function createAirport(input: AdminAirportInput) {
  return apiRequest<{ success: boolean; airport: Airport }>(EP.AIRPORTS, {
    method: 'POST',
    body: input,
  });
}

export function updateAirport(id: string, input: Partial<AdminAirportInput>) {
  return apiRequest<{ success: boolean; airport: Airport }>(withPathParams(EP.AIRPORT, { id }), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteAirport(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.AIRPORT, { id }), {
    method: 'DELETE',
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function listUsers(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'users', AdminUser>>(`${EP.USERS}${buildQuery(query)}`);
}

export function updateUser(id: string, input: Partial<AdminUser>) {
  return apiRequest<{ success: boolean; user?: AdminUser; message?: string }>(
    withPathParams(EP.USER, { id }),
    { method: 'PATCH', body: input }
  );
}

export function deleteUser(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.USER, { id }), { method: 'DELETE' });
}

// ─── Flights ────────────────────────────────────────────────────────────────

export function listAdminFlights(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'flights', AdminFlight>>(`${EP.FLIGHTS}${buildQuery(query)}`);
}

export function createAdminFlight(input: Partial<AdminFlight>) {
  return apiRequest<{ success: boolean; flight: AdminFlight }>(EP.FLIGHTS, {
    method: 'POST',
    body: input,
  });
}

export function updateAdminFlight(id: string, input: Partial<AdminFlight>) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.FLIGHT, { id }), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteAdminFlight(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.FLIGHT, { id }), { method: 'DELETE' });
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export function listAdminBookings(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'bookings', AdminBooking>>(`${EP.BOOKINGS}${buildQuery(query)}`);
}

export interface AdminInvoiceInput {
  booking_id: string;
  amount: number;
  method: string;
  status?: string;
}

export function createAdminInvoice(input: AdminInvoiceInput) {
  return apiRequest<{ success: boolean; payment: unknown }>(EP.BOOKING_INVOICE, {
    method: 'POST',
    body: input,
  });
}

// ─── Discounts ──────────────────────────────────────────────────────────────

export function listDiscounts(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'discounts', AdminDiscount>>(`${EP.DISCOUNTS}${buildQuery(query)}`);
}

export function createDiscount(input: Partial<AdminDiscount>) {
  return apiRequest<{ success: boolean; discount: AdminDiscount }>(EP.DISCOUNTS, {
    method: 'POST',
    body: input,
  });
}

export function updateDiscount(id: string, input: Partial<AdminDiscount>) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.DISCOUNT, { id }), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteDiscount(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.DISCOUNT, { id }), {
    method: 'DELETE',
  });
}

// ─── Bank accounts ──────────────────────────────────────────────────────────

export function listBankAccounts() {
  return apiRequest<{ accounts: AdminBankAccount[] }>(EP.BANK_ACCOUNTS);
}

export function createBankAccount(input: AdminBankAccountInput) {
  return apiRequest<{ success: boolean; account: AdminBankAccount }>(EP.BANK_ACCOUNTS, {
    method: 'POST',
    body: input,
  });
}

export function updateBankAccount(id: string, input: Partial<AdminBankAccount>) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.BANK_ACCOUNT, { id }), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteBankAccount(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.BANK_ACCOUNT, { id }), {
    method: 'DELETE',
  });
}

// ─── Announcements ──────────────────────────────────────────────────────────

export function listAnnouncements(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'announcements', AdminAnnouncement>>(
    `${EP.ANNOUNCEMENTS}${buildQuery(query, 'q')}`
  );
}

export function createAnnouncement(input: Partial<AdminAnnouncement>) {
  return apiRequest<{ success: boolean; announcement: AdminAnnouncement }>(EP.ANNOUNCEMENTS, {
    method: 'POST',
    body: input,
  });
}

export function updateAnnouncement(id: string, input: Partial<AdminAnnouncement>) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.ANNOUNCEMENT, { id }), {
    method: 'PATCH',
    body: input,
  });
}

export function deleteAnnouncement(id: string) {
  return apiRequest<{ success: boolean }>(withPathParams(EP.ANNOUNCEMENT, { id }), {
    method: 'DELETE',
  });
}

// ─── Refunds & transactions ─────────────────────────────────────────────────

export function listRefunds(query: AdminListQuery = {}) {
  return apiRequest<AdminList<'refunds', AdminRefund> & { refundFeatureEnabled?: boolean }>(
    `${EP.REFUNDS}${buildQuery(query)}`
  );
}

export function updateRefund(input: { refundId: string; status: string; admin_note?: string }) {
  return apiRequest<{ success: boolean }>(EP.REFUNDS, { method: 'PATCH', body: input });
}

/** Show or hide a single ticket on the customer's screen. */
export function setRefundVisibility(input: { refundId: string; visible: boolean }) {
  return apiRequest<{ success: boolean; refund: AdminRefund }>(EP.REFUNDS, {
    method: 'PATCH',
    body: { action: 'set_visibility', ...input },
  });
}

/** Correct the payout details recorded on a ticket. */
export function updateRefundDetails(input: {
  refundId: string;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  phone?: string;
  reason?: string;
  admin_note?: string;
}) {
  const { refundId, ...fields } = input;
  return apiRequest<{ success: boolean; refund: AdminRefund }>(EP.REFUNDS, {
    method: 'PATCH',
    body: {
      action: 'update_details',
      refundId,
      bank_info: {
        ...(fields.bank_name !== undefined ? { bank_name: fields.bank_name } : {}),
        ...(fields.account_number !== undefined ? { account_number: fields.account_number } : {}),
        ...(fields.account_holder !== undefined ? { account_holder: fields.account_holder } : {}),
      },
      ...fields,
    },
  });
}

/** Pause or resume refund requests for every customer. */
export function setRefundFeatureLock(enabled: boolean) {
  return apiRequest<{ success: boolean; refundFeatureEnabled: boolean }>(EP.REFUNDS, {
    method: 'PATCH',
    body: { action: 'set_feature_lock', enabled },
  });
}

export function listTransactions(query: AdminListQuery = {}) {
  return apiRequest<AdminTransaction[]>(`${EP.TRANSACTIONS}${buildQuery(query)}`);
}

// ─── System settings ────────────────────────────────────────────────────────

export interface SettingsObject {
  [key: string]: { value: string; description?: string };
}

export function getSystemSettings() {
  return apiRequest<{ settings: unknown[]; settingsObject: SettingsObject }>(EP.SETTINGS);
}

export function updateSystemSettings(input: { settings: SettingsObject }) {
  return apiRequest<{ success: boolean }>(EP.SETTINGS, { method: 'PATCH', body: input });
}

// ─── RBAC ───────────────────────────────────────────────────────────────────

export function listRbacRoles() {
  return apiRequest<{ roles: AdminRoleRow[] }>(`${EP.RBAC}?section=roles`);
}

export function listRbacAudit(limit = 50) {
  return apiRequest<{ logs: AdminRbacAuditRow[] }>(`${EP.RBAC}?section=audit&limit=${limit}`);
}

export function assignRbacRole(input: { targetUserId: string; roleName: string }) {
  return apiRequest<{ success: boolean; message?: string }>(EP.RBAC, {
    method: 'POST',
    body: { action: 'assign_role', ...input },
  });
}

export function removeRbacRole(targetUserId: string) {
  return apiRequest<{ success: boolean; message?: string }>(EP.RBAC, {
    method: 'POST',
    body: { action: 'remove_role', targetUserId },
  });
}

// ─── SSTK tools ─────────────────────────────────────────────────────────────

export function listSstkTools() {
  return apiRequest<{ tools: unknown[]; categories: unknown[] }>(EP.TOOLS);
}

export function listSstkLogs() {
  return apiRequest<{ data: unknown[] }>(`${EP.TOOLS}?action=logs`);
}

export function executeSstkTool(input: { toolKey: string; params: Record<string, string> }) {
  return apiRequest<{
    success: boolean;
    toolKey: string;
    label: string;
    summary: string;
    status: 'success' | 'error' | 'partial';
    message?: string;
  }>(EP.TOOLS, { method: 'POST', body: input });
}

// ─── Audit logs ─────────────────────────────────────────────────────────────

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}

export function listAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('q', query.search);
  if (query.action) params.set('action', query.action);
  if (query.date_from) params.set('date_from', query.date_from);
  if (query.date_to) params.set('date_to', query.date_to);
  const suffix = params.toString();

  return apiRequest<
    AdminList<'logs', AdminAuditLog> & { filters?: { actions?: string[]; resources?: string[] } }
  >(`${EP.AUDIT_LOGS}${suffix ? `?${suffix}` : ''}`);
}

// ─── OpenClaw Data Collection ───────────────────────────────────────────────

export interface CollectNetworkResponse {
  added: Array<{ id?: string; code: string; name: string; city: string; country?: string }>;
  existing: string[];
  total: number;
  routesCount?: number;
  source: string;
  dryRun?: boolean;
}

export function collectAdminNetwork(dryRun = false) {
  return apiRequest<CollectNetworkResponse>(EP.COLLECT_NETWORK, {
    method: 'POST',
    body: { dryRun },
  });
}

export interface CollectScheduleInput {
  from: string;
  to: string;
  date: string;
  wafCookie?: string;
  importOnSuccess?: boolean;
}

export interface CollectedFlightItem {
  flightNo: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  price: number;
  fares: Array<{ cabin: string; amount: number }>;
}

export interface CollectScheduleResponse {
  reachable: boolean;
  route?: string;
  date?: string;
  flights?: CollectedFlightItem[];
  reason?: string;
  hint?: string;
  imported?: string[];
  skipped?: string[];
}

export function collectAdminSchedule(input: CollectScheduleInput) {
  return apiRequest<CollectScheduleResponse>(EP.COLLECT_SCHEDULE, {
    method: 'POST',
    body: input,
  });
}

export function importCollectedFlights(input: {
  from: string;
  to: string;
  date: string;
  flights: CollectedFlightItem[];
}) {
  return apiRequest<{
    success: boolean;
    imported: string[];
    skipped: string[];
  }>(EP.COLLECT_SCHEDULE, {
    method: 'POST',
    body: { ...input, action: 'import' },
  });
}

// ─── OpenClaw Bulk Collection ────────────────────────────────────────────────

export interface BulkCollectRoute {
  from: string;
  to: string;
}

export interface BulkCollectInput {
  routes: BulkCollectRoute[];
  dates: string[];
  wafCookie?: string;
  importOnSuccess?: boolean;
  concurrency?: number;
  discountVnd?: number;
}

export interface BulkCollectItem {
  from: string;
  to: string;
  date: string;
  route: string;
  status: 'success' | 'waf_blocked' | 'error' | 'empty';
  flights: CollectedFlightItem[];
  imported?: string[];
  skipped?: string[];
  reason?: string;
}

export interface BulkCollectResponse {
  total: number;
  succeeded: number;
  blocked: number;
  failed: number;
  imported: number;
  results: BulkCollectItem[];
}

export function collectAdminBulk(input: BulkCollectInput) {
  return apiRequest<BulkCollectResponse>(EP.COLLECT_BULK, {
    method: 'POST',
    body: input,
  });
}

// ─── OpenClaw Auto Sync Automation ──────────────────────────────────────────

export interface AutoSyncConfigData {
  enabled: boolean;
  networkIntervalHours: number;
  scheduleDaysAhead: number;
  keyRoutes: Array<{ from: string; to: string }>;
  autoImport: boolean;
  lastNetworkSync?: string;
  lastScheduleSync?: string;
}

export interface AutoSyncReportData {
  network: {
    status: 'skipped' | 'success' | 'error';
    airportsAdded?: number;
    totalAirports?: number;
    error?: string;
  };
  schedule: {
    status: 'skipped' | 'success' | 'partial' | 'error';
    totalCombos: number;
    successfulCombos: number;
    importedFlights: number;
    skippedFlights: number;
    details: Array<{ route: string; date: string; count: number; imported: number }>;
    error?: string;
  };
  executedAt: string;
}

export function getAdminAutoSyncConfig() {
  return apiRequest<{ success: boolean; config: AutoSyncConfigData }>(EP.COLLECT_AUTO);
}

export function updateAdminAutoSyncConfig(config: Partial<AutoSyncConfigData>) {
  return apiRequest<{ success: boolean; config: AutoSyncConfigData }>(EP.COLLECT_AUTO, {
    method: 'POST',
    body: { config },
  });
}

export function triggerAdminAutoSyncRunNow(force = false) {
  return apiRequest<{ success: boolean; report: AutoSyncReportData }>(EP.COLLECT_AUTO, {
    method: 'POST',
    body: { action: 'run_now', force },
  });
}

export function triggerAdminSolveWaf() {
  return apiRequest<{ success: boolean; message: string; tokenPreview?: string }>(
    EP.COLLECT_SOLVE_WAF,
    {
      method: 'POST',
    }
  );
}

// ─── Bulk Price Adjustment ──────────────────────────────────────────────────

export interface BulkPriceAdjustPreviewSample {
  id: string;
  flight_no: string;
  route: string;
  depart_time: string;
  class: string;
  old_economy_price: number;
  new_economy_price: number;
  old_business_price: number;
  new_business_price: number;
  old_price: number;
  new_price: number;
  diff: number;
}

export type PriceAdjustAction =
  | 'discount_fixed'
  | 'increase_fixed'
  | 'discount_percent'
  | 'increase_percent'
  | 'set_fixed';

export interface BulkPriceAdjustPayload {
  filter?: {
    from_code?: string;
    to_code?: string;
    from_date?: string;
    to_date?: string;
    flight_no?: string;
    class?: 'all' | 'economy' | 'business';
  };
  action: PriceAdjustAction;
  amount: number;
  dryRun?: boolean;
}

export interface BulkPriceAdjustResponse {
  success?: boolean;
  dryRun?: boolean;
  matchedCount?: number;
  updatedCount?: number;
  message?: string;
  samples?: BulkPriceAdjustPreviewSample[];
}

export function adjustAdminFlightPrices(input: BulkPriceAdjustPayload) {
  return apiRequest<BulkPriceAdjustResponse>(EP.ADJUST_FLIGHT_PRICES, {
    method: 'POST',
    body: input,
  });
}
