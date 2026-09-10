-- The homepage calendar: the user's own planner entries and the Philippine holidays they sit
-- among, in one table so a single query answers "what is on this day" and so the briefing
-- workflow has one endpoint to read.
--
-- `kind` is what separates them. PERSONAL rows are created, edited and deleted through the API;
-- HOLIDAY rows are reference data seeded here and rejected by the write endpoints, so a stray
-- DELETE from the UI cannot quietly remove Christmas.
CREATE TABLE calendar_events (
    id         UUID PRIMARY KEY,
    event_date DATE NOT NULL,
    -- NULL means all day. A planner entry with a time sorts within its day; a holiday never
    -- has one.
    start_time TIME,
    title      TEXT NOT NULL,
    notes      TEXT,
    kind       TEXT NOT NULL CHECK (kind IN ('PERSONAL', 'HOLIDAY')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is a date range ("this month", "the next seven days"), in day then time order.
CREATE INDEX idx_calendar_events_date ON calendar_events (event_date, start_time NULLS FIRST);

-- One holiday per name per day, so re-seeding a year cannot double it up.
CREATE UNIQUE INDEX uq_calendar_holiday ON calendar_events (event_date, title)
    WHERE kind = 'HOLIDAY';

-- Philippine holidays for 2026 and 2027.
--
-- Regular holidays and the fixed-date special days are set by law (RA 9492 as amended), so they
-- are safe to seed years ahead. The movable Christian dates are derived from Easter (5 April
-- 2026, 28 March 2027) and National Heroes Day is the last Monday of August.
--
-- Deliberately absent: Chinese New Year, Eid'l Fitr and Eid'l Adha. Those are declared by
-- presidential proclamation each year rather than fixed by law, and a wrong date on the
-- calendar is worse than a missing one — add them as personal entries when they are announced.
INSERT INTO calendar_events (id, event_date, title, notes, kind) VALUES
    (gen_random_uuid(), DATE '2026-01-01', 'New Year''s Day',                     'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-04-02', 'Maundy Thursday',                     'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-04-03', 'Good Friday',                         'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-04-04', 'Black Saturday',                      'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-04-09', 'Araw ng Kagitingan',                  'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-05-01', 'Labor Day',                           'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-06-12', 'Independence Day',                    'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-08-21', 'Ninoy Aquino Day',                    'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-08-31', 'National Heroes Day',                 'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-11-01', 'All Saints'' Day',                    'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-11-30', 'Bonifacio Day',                       'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-12-08', 'Feast of the Immaculate Conception',  'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-12-25', 'Christmas Day',                       'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-12-30', 'Rizal Day',                           'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2026-12-31', 'Last Day of the Year',                'Special non-working day',  'HOLIDAY'),

    (gen_random_uuid(), DATE '2027-01-01', 'New Year''s Day',                     'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-03-25', 'Maundy Thursday',                     'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-03-26', 'Good Friday',                         'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-03-27', 'Black Saturday',                      'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-04-09', 'Araw ng Kagitingan',                  'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-05-01', 'Labor Day',                           'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-06-12', 'Independence Day',                    'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-08-21', 'Ninoy Aquino Day',                    'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-08-30', 'National Heroes Day',                 'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-11-01', 'All Saints'' Day',                    'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-11-30', 'Bonifacio Day',                       'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-12-08', 'Feast of the Immaculate Conception',  'Special non-working day',  'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-12-25', 'Christmas Day',                       'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-12-30', 'Rizal Day',                           'Regular holiday',          'HOLIDAY'),
    (gen_random_uuid(), DATE '2027-12-31', 'Last Day of the Year',                'Special non-working day',  'HOLIDAY');
