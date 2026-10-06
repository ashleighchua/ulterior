CREATE TABLE public.game_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'LOBBY',
  current_act int NOT NULL DEFAULT 0,
  intro_ends_at timestamptz,
  act_ends_at timestamptz,
  transition_ends_at timestamptz,
  act_duration_sec int NOT NULL DEFAULT 900,
  creator_player_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_tables TO anon, authenticated;
GRANT ALL ON public.game_tables TO service_role;
ALTER TABLE public.game_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public table state readable" ON public.game_tables FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  seat int NOT NULL,
  submitted_act int NOT NULL DEFAULT 0,
  accused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX players_table_name_uq ON public.players (table_id, lower(name));
GRANT SELECT ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seated players readable" ON public.players FOR SELECT TO anon, authenticated USING (true);

-- Private tables: service role only (accessed via verified server functions)
CREATE TABLE public.player_secrets (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  token_hash text NOT NULL
);
GRANT ALL ON public.player_secrets TO service_role;
ALTER TABLE public.player_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.motives (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  motive text NOT NULL
);
GRANT ALL ON public.motives TO service_role;
ALTER TABLE public.motives ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agenda_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  act int NOT NULL,
  is_special boolean NOT NULL DEFAULT false,
  agenda_id text NOT NULL,
  text text NOT NULL,
  difficulty int NOT NULL DEFAULT 1,
  requires_player boolean NOT NULL DEFAULT false,
  result text,
  involved_player_id uuid,
  submitted_at timestamptz,
  UNIQUE (player_id, act, is_special)
);
GRANT ALL ON public.agenda_assignments TO service_role;
ALTER TABLE public.agenda_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.suspicions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  act int NOT NULL,
  suspect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, act)
);
GRANT ALL ON public.suspicions TO service_role;
ALTER TABLE public.suspicions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accusations (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.game_tables(id) ON DELETE CASCADE,
  accused_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.accusations TO service_role;
ALTER TABLE public.accusations ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;