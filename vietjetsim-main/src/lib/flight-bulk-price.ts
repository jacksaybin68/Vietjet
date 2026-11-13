/**
 * Pure pricing helpers for the admin "bulk price adjust" endpoint.
 *
 * These live outside the route file on purpose. Next 16 generates a typed
 * `Route` declaration for every route module and it constrains the module's
 * exports to the HTTP methods plus a fixed config shape — an extra `export`
 * (a helper, a type alias, an interface) makes `next build` fail the type
 * check with:
 *
 *   error TS2344: Type 'OmitWithTag<typeof import(".../route"), ...>'
 *   does not satisfy the constraint '{ [x: string]: never; }'.
 *
 * So the route keeps only `POST`, and the logic it shares with the test suite
 * is imported from here.
 */

import { MIN_TICKET_PRICE_FLOOR, FARE_LADDER_RATIO } from '@/lib/openclaw/web-collection';

export type PriceAdjustAction =
  | 'discount_fixed'
  | 'increase_fixed'
  | 'discount_percent'
  | 'increase_percent'
  | 'set_fixed';

export interface BulkPriceAdjustFilter {
  from_code?: string;
  to_code?: string;
  from_date?: string;
  to_date?: string;
  flight_no?: string;
  class?: 'all' | 'economy' | 'business';
}

export interface BulkPriceAdjustPayload {
  filter?: BulkPriceAdjustFilter;
  action: PriceAdjustAction;
  amount: number;
  dryRun?: boolean;
}

/**
 * Recompute the economy/business fare ladder for one flight under a bulk
 * price action.
 *
 * The ladder is `business = round(economy × FARE_LADDER_RATIO)` (migration
 * 030), so every action moves the economy side and the business side follows.
 * Discounts and `set_fixed` clamp at `MIN_TICKET_PRICE_FLOOR`; increases do
 * not, because there is no upper bound on a fare.
 */
export function computeAdjustedPrices(
  currentEco: number,
  currentBiz: number,
  currentClass: string,
  action: PriceAdjustAction,
  amount: number
): { newEco: number; newBiz: number; newPrice: number } {
  let newEco = currentEco;

  switch (action) {
    case 'discount_fixed':
      newEco = Math.max(MIN_TICKET_PRICE_FLOOR, Math.round(currentEco - amount));
      break;
    case 'increase_fixed':
      newEco = Math.round(currentEco + amount);
      break;
    case 'discount_percent':
      newEco = Math.max(
        MIN_TICKET_PRICE_FLOOR,
        Math.round(currentEco * (1.0 - Math.min(amount, 90) / 100.0))
      );
      break;
    case 'increase_percent':
      newEco = Math.round(currentEco * (1.0 + amount / 100.0));
      break;
    case 'set_fixed':
      newEco = Math.max(MIN_TICKET_PRICE_FLOOR, Math.round(amount));
      break;
  }

  const newBiz = Math.round(newEco * FARE_LADDER_RATIO);
  const newPrice = currentClass === 'business' ? newBiz : newEco;

  return { newEco, newBiz, newPrice };
}

/**
 * True when Postgres rejected the insert because a flight already occupies that
 * slot.
 *
 * Driver errors are not `instanceof Error` across the bundler boundary, so this
 * matches on the stable shape instead: SQLSTATE 23505 plus the unique index
 * name in `constraint`.
 *
 * `constraint` is the only field that can carry the name. Measured on Postgres
 * 16: a violation of a *constraint* reports the constraint name there, but
 * `flights` keeps its uniqueness on `(from_code, to_code, depart_time)` as a
 * plain unique *index* — and an index name also arrives in `constraint`, while
 * `routine` is always the C function that raised it (`_bt_check_unique` here).
 * An earlier version of this checked `err.routine` for the index name as a
 * fallback; that branch could never fire, and reading the two fields back is
 * what made it look like the database used `routine` for the name.
 *
 * Both were undefined in local development even so, because the HTTP bridge
 * used to forward five error fields and drop the rest — see
 * `src/test/neon-bridge-error.test.ts`, which pins the whole field set.
 */
export function isDuplicateFlightSchedule(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; constraint?: unknown };
  return err.code === '23505' && err.constraint === 'idx_flights_route_depart_time';
}
