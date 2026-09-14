create table if not exists public.study_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  device_id text,
  updated_at timestamptz not null default now()
);

alter table public.study_states enable row level security;

revoke all on table public.study_states from anon, authenticated;
grant select, insert, update, delete on table public.study_states to authenticated;

drop policy if exists "read own study state" on public.study_states;
create policy "read own study state"
on public.study_states for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own study state" on public.study_states;
create policy "insert own study state"
on public.study_states for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own study state" on public.study_states;
create policy "update own study state"
on public.study_states for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "delete own study state" on public.study_states;
create policy "delete own study state"
on public.study_states for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.sync_study_state(
  p_state jsonb,
  p_expected_revision bigint,
  p_device_id text
)
returns table(new_revision bigint, synced_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_expected_revision = 0 then
    return query
    insert into public.study_states as current_state (
      user_id,
      state_json,
      revision,
      device_id,
      updated_at
    )
    values (
      (select auth.uid()),
      p_state,
      1,
      p_device_id,
      now()
    )
    on conflict (user_id) do update
    set
      state_json = excluded.state_json,
      revision = current_state.revision + 1,
      device_id = excluded.device_id,
      updated_at = now()
    where current_state.revision = 0
    returning current_state.revision, current_state.updated_at;
    return;
  end if;

  return query
  update public.study_states
  set
    state_json = p_state,
    revision = public.study_states.revision + 1,
    device_id = p_device_id,
    updated_at = now()
  where
    user_id = (select auth.uid())
    and revision = p_expected_revision
  returning public.study_states.revision, public.study_states.updated_at;
end;
$$;

revoke all on function public.sync_study_state(jsonb, bigint, text) from public, anon;
grant execute on function public.sync_study_state(jsonb, bigint, text) to authenticated;
