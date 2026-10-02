-- 031_unique_flight_numbers.sql
--
-- The flight seeds built `flight_no` with `LPAD(x, 3, '0')`, and LPAD
-- *truncates* an input longer than the requested length. Every block that ran
-- past 999 therefore lost its last digit: 027's 440 rows a day reach 1040, and
-- 028's 156 rows reach 1256, so "VJ 1040" was stored as "VJ 104" and "VJ 1256"
-- as "VJ 125". Four routes a day then shared one number, and the results page
-- — which prints `flight_no` next to the route — showed the same service
-- number for Hanoi–Osaka and a domestic hop. That is exactly the failure 025
-- documented and 028's own comment set out to avoid.
--
-- The seed files are corrected (014/024/025/026/027/028 pad to the number's own
-- length now), but the rows already in a migrated database keep their truncated
-- values: the seeds finish with `ON CONFLICT DO NOTHING`, so re-running them
-- updates nothing. This file repairs the data.
--
-- Only the *surplus* rows of a collision are renumbered, so a number that is
-- already unique keeps the value it has and had already shown a customer. The
-- replacements come from a block no seed uses (2001+), numbered within the day,
-- which is the unit the number has to be unique in: the same service number may
-- repeat on different days, as 027's comment explains.
--
-- Re-running is a no-op — after the first pass no (day, flight_no) pair covers
-- more than one route, so `surplus` is empty.
--
-- `check_in.flight_no` is a snapshot written at check-in, not a join, and no
-- row exists in this database; a check-in taken against a renumbered flight
-- would need the same rewrite, which belongs here if such rows ever appear.

WITH numbered AS (
  SELECT
    id,
    (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
    row_number() OVER (
      PARTITION BY (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, flight_no
      ORDER BY from_code, to_code, depart_time, id
    ) AS position_within_number
  FROM flights
),
surplus AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY day ORDER BY id) AS replacement
  FROM numbered
  WHERE position_within_number > 1
)
UPDATE flights f
SET flight_no = 'VJ ' || (2000 + s.replacement)::text
FROM surplus s
WHERE f.id = s.id;
