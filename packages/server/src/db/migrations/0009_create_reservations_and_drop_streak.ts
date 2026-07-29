import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// UNIQUE (user_id, event_id) enforces at most one Reservation per Event (the
// two-stage intent model, ADR-0007). `outcome`/`placed_room_id` stay null until
// composition resolves the row at the Cutoff (#E). `drop_streak` is the fairness
// counter composition reads and maintains — consecutive drops since a user's
// last placement, defaulting to 0 (ADR-0008).
export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TYPE reservation_outcome AS ENUM ('PLACED', 'DROPPED');

    CREATE TABLE reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
        reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        outcome reservation_outcome,
        placed_room_id UUID REFERENCES rooms (id),
        UNIQUE (user_id, event_id)
    );

    CREATE INDEX reservations_event_id_idx ON reservations (event_id);

    ALTER TABLE users
        ADD COLUMN drop_streak INTEGER NOT NULL DEFAULT 0;
  `,
);
