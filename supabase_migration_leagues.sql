-- migration: ligue entre amis
-- à exécuter dans supabase sql editor

-- 1. Tables
create table if not exists leagues (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    participant_ids text[] default '{}',
    created_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists league_participants (
    id uuid primary key default gen_random_uuid(),
    league_id uuid references leagues(id) on delete cascade,
    player_id text references tournament_players(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(league_id, player_id)
);

create table if not exists league_matches (
    id uuid primary key default gen_random_uuid(),
    league_id uuid references leagues(id) on delete cascade,
    type text check (type in ('tete-a-tete', 'doublette', 'triplettes')),
    team1_player_ids text[] not null,
    team2_player_ids text[] not null,
    score1 integer,
    score2 integer,
    winner_team_index integer,
    status text default 'pending' check (status in ('pending', 'ongoing', 'completed')),
    team1_proposed_score1 integer,
    team1_proposed_score2 integer,
    team1_validated boolean default false,
    team2_proposed_score1 integer,
    team2_proposed_score2 integer,
    team2_validated boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sécurité (RLS)
alter table leagues enable row level security;
alter table league_participants enable row level security;
alter table league_matches enable row level security;

-- 3. Nettoyage des politiques (ignorez les erreurs si elles n'existent pas)
drop policy if exists "Leagues are viewable by everyone" on leagues;
drop policy if exists "Leagues are insertable by everyone" on leagues;
drop policy if exists "Leagues are updatable by owners" on leagues;
drop policy if exists "League participants are viewable by everyone" on league_participants;
drop policy if exists "League participants are manageable by league creator" on league_participants;
drop policy if exists "League matches are viewable by everyone" on league_matches;
drop policy if exists "League matches are insertable by league participants" on league_matches;
drop policy if exists "League matches are updatable by league participants" on league_matches;

-- 4. Nouvelles politiques
create policy "Leagues are viewable by everyone" on leagues for select using (true);
create policy "Leagues are insertable by everyone" on leagues for insert with check ((created_by is null) or (auth.uid() = created_by));
create policy "Leagues are updatable by owners" on leagues for update using (auth.uid() = created_by);

create policy "League participants are viewable by everyone" on league_participants for select using (true);
create policy "League participants are manageable by league creator" on league_participants
    for all using (exists (select 1 from leagues where leagues.id = league_participants.league_id and leagues.created_by = auth.uid()));

create policy "League matches are viewable by everyone" on league_matches for select using (true);
create policy "League matches are insertable by league participants" on league_matches
    for insert with check (exists (select 1 from league_participants join tournament_players on tournament_players.id = league_participants.player_id where league_participants.league_id = league_matches.league_id and tournament_players.user_id = auth.uid()));
create policy "League matches are updatable by league participants" on league_matches
    for update using (exists (select 1 from league_participants join tournament_players on tournament_players.id = league_participants.player_id where league_participants.league_id = league_matches.league_id and tournament_players.user_id = auth.uid()));

-- 5. Realtime (Optionnel - peut générer des erreurs si déjà configuré, c'est normal)
-- alter publication supabase_realtime add table leagues;
-- alter publication supabase_realtime add table league_participants;
-- alter publication supabase_realtime add table league_matches;
