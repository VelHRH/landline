import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// Rooms stop being standalone prototypes and become the output of composition:
// they belong to one Event and carry the age bracket they were composed within
// (ADR-0007, ADR-0008). The prototype rows have no Event to attach to, so they
// (and their chats, via ON DELETE CASCADE) are discarded; `placed_room_id` is
// cleared first because it references them. ON DELETE CASCADE on `event_id`
// keeps a deleted Event from stranding its Rooms.
export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    UPDATE reservations
    SET
        placed_room_id = NULL
    WHERE
        placed_room_id IS NOT NULL;

    DELETE FROM rooms;

    ALTER TABLE rooms
        DROP COLUMN name,
        DROP COLUMN is_active,
        ADD COLUMN event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
        ADD COLUMN age_bracket TEXT NOT NULL;

    CREATE INDEX rooms_event_id_idx ON rooms (event_id);
  `,
);
