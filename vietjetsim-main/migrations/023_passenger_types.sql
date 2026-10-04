-- 023_passenger_types.sql
--
-- The booking form now sells three categories instead of one head count:
-- adults (12+), children (2-11) and infants (under 2, travelling on a lap).
-- Until now the wizard priced and seated every passenger identically, so there
-- was nowhere to record which category someone was.
--
-- Existing rows are backfilled to 'adult' rather than left NULL: every booking
-- created before this file was an all-adult booking, and a NOT NULL DEFAULT
-- keeps the column safe for any code path that omits the value.

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS passenger_type VARCHAR(20) NOT NULL DEFAULT 'adult';

-- `ADD CONSTRAINT ... CHECK` validates the rows already in the table straight
-- away, so on a database holding a category outside this list the ALTER aborts
-- — it does *not* "keep its data and report it". And because CI runs `psql -f`
-- with no `BEGIN`, the `ADD COLUMN` above has already committed by then, so the
-- file would leave behind exactly the half-migrated state it was meant to
-- avoid: the column present, the CHECK absent. `NOT VALID` is what actually
-- gets there: the CHECK is enforced for new writes and left unproven for the
-- rows already there, and the constraint is only validated once the data has
-- been cleared — which the DO block below does rather than assuming.
--
-- The guard filters by table, because a constraint name is unique per schema,
-- not per table: without `conrelid`, any constraint anywhere called
-- `passengers_passenger_type_check` would skip the whole block and leave
-- `passengers.passenger_type` permanently unchecked. 017 already does this.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'passengers_passenger_type_check'
       AND conrelid = 'passengers'::regclass
  ) THEN
    ALTER TABLE passengers
      ADD CONSTRAINT passengers_passenger_type_check
      CHECK (passenger_type IN ('adult', 'child', 'infant')) NOT VALID;

    -- Prove it against real data only after normalising: a booking made before
    -- this file could hold any legacy value, and 'adult' is what every such
    -- booking actually meant (see the header). Anything else is reported and
    -- left for an operator rather than silently rewritten.
    UPDATE passengers
       SET passenger_type = 'adult'
     WHERE passenger_type IS NULL
        OR passenger_type NOT IN ('adult', 'child', 'infant');

    ALTER TABLE passengers VALIDATE CONSTRAINT passengers_passenger_type_check;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_passengers_booking_type
  ON passengers (booking_id, passenger_type);
