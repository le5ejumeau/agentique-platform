-- Schéma initial de la plateforme : projets, fil d'activité, entretien, livrables.
-- Miroir des types de packages/core/src/domain.ts. Les noms de valeurs restent en français.

create type project_target as enum ('web', 'ios', 'android');

-- Vrai si le tableau ne contient aucun doublon (une sous-requête est interdite dans un check).
create function targets_are_distinct(targets project_target[]) returns boolean
  language sql immutable
  as $$ select cardinality(targets) = (select count(distinct t) from unnest(targets) as t) $$;

create type project_stage as enum (
  'entretien', 'specification', 'validation_specs', 'conception',
  'prototypage', 'revue_prototype', 'valide'
);

create type agent_role as enum (
  'orchestrateur', 'analyste', 'redacteur', 'documentaliste', 'designer_ux',
  'developpeur_prototype', 'controleur_qualite'
);

create type project_event_type as enum (
  'projet_cree', 'etape_changee', 'tache_demarree', 'tache_terminee', 'message_entretien',
  'livrable_publie', 'validation_demandee', 'validation_donnee', 'erreur'
);

create type deliverable_kind as enum ('cahier_des_charges', 'backlog', 'documentation');

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  -- Au moins une plateforme, sans doublon.
  targets project_target[] not null check (cardinality(targets) >= 1 and targets_are_distinct(targets)),
  brief text not null default '',
  stage project_stage not null default 'entretien',
  active_agent agent_role,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on projects (owner_id, updated_at desc);

create table project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  type project_event_type not null,
  agent agent_role,
  message text not null,
  at timestamptz not null default now()
);

create index project_events_project_at_idx on project_events (project_id, at);

create table interview_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  author text not null check (author in ('client', 'analyste')),
  content text not null,
  at timestamptz not null default now()
);

create index interview_messages_project_at_idx on interview_messages (project_id, at);

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind deliverable_kind not null,
  version integer not null check (version > 0),
  title text not null,
  markdown text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, kind, version)
);

-- Sécurité : un client ne voit que ses projets. Les agents écrivent avec la clé service (RLS contournée).
alter table projects enable row level security;
alter table project_events enable row level security;
alter table interview_messages enable row level security;
alter table deliverables enable row level security;

create policy "le client lit ses projets" on projects
  for select using (owner_id = auth.uid());

create policy "le client crée ses projets" on projects
  for insert with check (owner_id = auth.uid());

create policy "le client lit le fil de ses projets" on project_events
  for select using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "le client lit l'entretien de ses projets" on interview_messages
  for select using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "le client répond dans l'entretien de ses projets" on interview_messages
  for insert with check (
    author = 'client'
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "le client lit les livrables de ses projets" on deliverables
  for select using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

-- Temps réel : l'interface s'abonne aux changements de ces tables.
alter publication supabase_realtime add table projects, project_events, interview_messages, deliverables;
