\restrict FJoickgRocJHjL1ZlRw7w8icPjfqT6fcqktREwGtKAHdkbfWYo1iVzLuXhljmD4

CREATE TYPE public.event_status AS ENUM (
    'SCHEDULED',
    'COMPOSED',
    'CANCELLED'
);

CREATE TYPE public.regime AS ENUM (
    'SPEED_BLIND_DATING'
);

CREATE TYPE public.reservation_outcome AS ENUM (
    'PLACED',
    'DROPPED'
);

CREATE TYPE public.user_gender AS ENUM (
    'MALE',
    'FEMALE',
    'NONBINARY'
);

CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADMIN'
);

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

CREATE TABLE public.chat_members (
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    geonames_id integer NOT NULL,
    name text NOT NULL,
    country text NOT NULL,
    timezone text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    population integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.effect_sql_migrations (
    migration_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id uuid NOT NULL,
    date date NOT NULL,
    regime public.regime DEFAULT 'SPEED_BLIND_DATING'::public.regime NOT NULL,
    status public.event_status DEFAULT 'SCHEDULED'::public.event_status NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    reservation_deadline timestamp with time zone NOT NULL,
    min_size integer,
    max_size integer,
    rounds integer,
    floor integer,
    lead_time_minutes integer,
    brackets jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    reserved_at timestamp with time zone DEFAULT now() NOT NULL,
    outcome public.reservation_outcome,
    placed_room_id uuid
);

CREATE TABLE public.room_members (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    event_id uuid NOT NULL,
    age_bracket text NOT NULL
);

CREATE TABLE public.sessions (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    date_of_birth date NOT NULL,
    gender public.user_gender NOT NULL,
    interested_in public.user_gender[] NOT NULL,
    city_id uuid NOT NULL,
    drop_streak integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_pkey PRIMARY KEY (chat_id, user_id);

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_geonames_id_key UNIQUE (geonames_id);

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.effect_sql_migrations
    ADD CONSTRAINT effect_sql_migrations_pkey PRIMARY KEY (migration_id);

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_city_id_date_regime_key UNIQUE (city_id, date, regime);

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_user_id_event_id_key UNIQUE (user_id, event_id);

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_pkey PRIMARY KEY (room_id, user_id);

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token_hash);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX chat_members_user_id_idx ON public.chat_members USING btree (user_id);

CREATE INDEX cities_name_lower_idx ON public.cities USING btree (lower(name) text_pattern_ops);

CREATE INDEX events_city_id_starts_at_idx ON public.events USING btree (city_id, starts_at);

CREATE INDEX events_status_reservation_deadline_idx ON public.events USING btree (status, reservation_deadline);

CREATE INDEX messages_chat_id_created_at_idx ON public.messages USING btree (chat_id, created_at);

CREATE INDEX reservations_event_id_idx ON public.reservations USING btree (event_id);

CREATE INDEX rooms_event_id_idx ON public.rooms USING btree (event_id);

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);

CREATE INDEX users_city_id_idx ON public.users USING btree (city_id);

CREATE TRIGGER cities_set_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_placed_room_id_fkey FOREIGN KEY (placed_room_id) REFERENCES public.rooms(id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);

\unrestrict FJoickgRocJHjL1ZlRw7w8icPjfqT6fcqktREwGtKAHdkbfWYo1iVzLuXhljmD4

\restrict 56p1eOo01LvysrveSnxgjTFJnbfWw07Fy9gR727bzDxzxTfepHSjKD1rzMD6WOr

INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (1, '2026-07-29 21:01:54.917946+00', 'create_rooms_table');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (2, '2026-07-29 21:01:54.917946+00', 'create_users_and_sessions_tables');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (3, '2026-07-29 21:01:54.917946+00', 'hash_session_tokens');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (4, '2026-07-29 21:01:54.917946+00', 'create_chat_tables');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (5, '2026-07-29 21:01:54.917946+00', 'create_cities_table');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (6, '2026-07-29 21:01:54.917946+00', 'add_user_profile_and_role');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (7, '2026-07-29 21:01:54.917946+00', 'role_gender_to_enums');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (8, '2026-07-29 21:01:54.917946+00', 'create_events_table');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (9, '2026-07-29 21:01:54.917946+00', 'create_reservations_and_drop_streak');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (10, '2026-07-29 21:01:54.917946+00', 'rooms_under_events');

\unrestrict 56p1eOo01LvysrveSnxgjTFJnbfWw07Fy9gR727bzDxzxTfepHSjKD1rzMD6WOr