-- 033_flight_update_logs.sql
--
-- Per-flight change history, separate from `audit_logs` (009). That table
-- records *what an admin did* (`action`, `target_type`, `target_id`) and is
-- written by the admin endpoints; `flight_update_logs` records *what the row
-- looked like before*, holding the previous snapshot and the field-by-field
-- diff so a price change can be reversed and attributed.
--
-- `db.ts` has read and written this table since it gained `getFlightUpdateLogs`
-- / `insertFlightUpdateLog`, but no migration ever created it: every
-- `PATCH /api/quan-tri/chuyen-bay/[id]` answered 200 while the insert below
-- failed with `relation "flight_update_logs" does not exist`, which the route
-- catches and only logs. Fare edits were therefore unaudited and
-- unreversible — the same class of mistake as `createFlight` omitting the
-- columns 030 made NOT NULL, in a different direction: there, a column the
-- code needed was missing; here, a table the code needed was missing.
--
-- `flight_no` is a snapshot, not a foreign key: 031 renumbered rows in place,
-- and a check-in written under the old number must keep reading back as the
-- number the passenger actually held. The FK is on `flight_id`, so the history
-- follows the row across a renumber instead of orphaning.

CREATE TABLE IF NOT EXISTS flight_update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  flight_no VARCHAR(20) NOT NULL,
  updated_by TEXT,
  changes_json TEXT,
  previous_snapshot TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- `getFlightUpdateLogs` reads a single flight's history and, separately, the
-- whole table in reverse chronological order; both are unusable without these.
CREATE INDEX IF NOT EXISTS idx_flight_update_logs_flight_id
  ON flight_update_logs(flight_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_update_logs_created_at
  ON flight_update_logs(created_at DESC);

COMMENT ON TABLE flight_update_logs IS
  'Lịch sử thay đổi từng chuyến bay: ảnh chụp dòng trước khi sửa và diff từng trường. Khác audit_logs (009) vốn chỉ ghi "admin làm gì".';