-- One price per fare class, instead of the UI inventing the tiers.
--
-- The results page used to render four fare cards by adding hard-coded amounts
-- to the base fare (`basePrice + 1_200_000` for Business, `+ 800_000` for
-- SkyBOSS, `+ 300_000` for Deluxe, and the base fare for Eco). The server had no
-- idea about any of that: it only ever read `flights.price`, so a booking quoted
-- at one price on screen was charged a different one on save. The two numbers
-- had to come from one place.
--
-- These two columns hold what each cabin actually costs for that flight, so
-- the card and the charge read the same value. `class` stays as the cabin the
-- row itself seats (it decides which row a search returns), and the columns
-- below are what the traveller can choose to pay.

-- Seed the two new prices from the fare ladder the results page has always
-- drawn, so existing rows keep the prices customers were shown. The row's own
-- `price` is whichever cabin it sits in, and the other cabin is derived from it:
-- a business row's economy fare is the same ratio *down* that an economy row
-- steps *up*, so a flight priced 899,000 in economy and 2,490,000 in business
-- reads the same whether the search returns the economy row or the business one.
--
-- ROUND because a fare is whole đồng: the division otherwise leaves cents, and
-- `toLocaleString('vi-VN')` renders them ("898.916,97₫") on the fare card.
ALTER TABLE flights
  ADD COLUMN IF NOT EXISTS economy_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS business_price NUMERIC(12, 2);

UPDATE flights
SET
  economy_price = CASE
    WHEN class = 'business' THEN ROUND(price / 2.77)
    ELSE ROUND(price)
  END,
  business_price = CASE
    WHEN class = 'business' THEN ROUND(price)
    ELSE ROUND(price * 2.77)
  END
WHERE economy_price IS NULL OR business_price IS NULL;

-- A fare must never be missing: the results page shows all four cards, and the
-- booking API prices from these, so a NULL would surface as a NaN total.
ALTER TABLE flights
  ALTER COLUMN economy_price SET NOT NULL,
  ALTER COLUMN business_price SET NOT NULL;

-- And the ladder must not invert. The first version of this migration derived a
-- business row's economy fare by multiplying instead of dividing, which put
-- Business below Eco on the card for 713 flights. A constraint turns that class
-- of mistake into a failed write rather than a wrong price on screen.
--
-- Installed `NOT VALID` and proved afterwards, like 017 and 023: the UPDATE
-- above derives both fares from `price`, which is sound arithmetic but cannot
-- rescue a database that already carries an inverted pair — an operator who
-- hand-edited a fare, or a half-applied run of an earlier version of this file.
-- Validated eagerly the ADD aborts, and since CI runs each file with `psql -f`
-- and no `BEGIN`, the NOT NULL above would already be committed: two NOT NULL
-- columns and no CHECK, which is the half-migrated state the constraint exists
-- to rule out. So: block new inversions now, repair the old rows, then trust it.
ALTER TABLE flights
  DROP CONSTRAINT IF EXISTS flights_fare_ladder_ordered;
ALTER TABLE flights
  ADD CONSTRAINT flights_fare_ladder_ordered
  CHECK (economy_price <= business_price) NOT VALID;

-- Repair rather than delete: the flight is still a real departure with
-- passengers on it. Which side is wrong cannot be told from the row alone, so
-- the cheaper fare becomes Economy and the dearer one Business — the operator
-- sees the pair on the card and can correct it if the reverse was meant.
-- One UPDATE, so the CHECK never sees a half-swapped row.
UPDATE flights
SET economy_price  = LEAST(economy_price, business_price),
    business_price = GREATEST(economy_price, business_price)
WHERE economy_price > business_price;

ALTER TABLE flights VALIDATE CONSTRAINT flights_fare_ladder_ordered;

COMMENT ON COLUMN flights.economy_price IS
  'Giá vé Economy của chuyến bay này (VND). Nguồn giá duy nhất cho cả giao diện và API đặt vé.';
COMMENT ON COLUMN flights.business_price IS
  'Giá vé Business của chuyến bay này (VND). Nguồn giá duy nhất cho cả giao diện và API đặt vé.';
