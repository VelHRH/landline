import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// Native enums so the value sets are enforced by the DB. `starts_at` and
// `reservation_deadline` are stored resolved (UTC instants); the composition
// params are nullable overrides (null = inherit the regime default), consumed
// when rooms are composed at the Cutoff. UNIQUE (city_id, date, regime) enforces
// one Event per city per date. The (status, reservation_deadline) index serves
// the reconciliation worker that composes due Events.
export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TYPE regime AS ENUM ('SPEED_BLIND_DATING');

    CREATE TYPE event_status AS ENUM ('SCHEDULED', 'COMPOSED', 'CANCELLED');

    CREATE TABLE events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id UUID NOT NULL REFERENCES cities (id),
        date DATE NOT NULL,
        regime regime NOT NULL DEFAULT 'SPEED_BLIND_DATING',
        status event_status NOT NULL DEFAULT 'SCHEDULED',
        starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
        reservation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
        min_size INTEGER,
        max_size INTEGER,
        rounds INTEGER,
        floor INTEGER,
        lead_time_minutes INTEGER,
        brackets JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        UNIQUE (city_id, date, regime)
    );

    CREATE INDEX events_city_id_starts_at_idx ON events (city_id, starts_at);

    CREATE INDEX events_status_reservation_deadline_idx ON events (status, reservation_deadline);

    CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `,
);
