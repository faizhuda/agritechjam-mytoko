-- Helpful toggle implementation with per-user uniqueness

-- 1) Join table to track user likes on reviews
create table if not exists public.review_helpfuls (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (review_id, user_id)
);

alter table public.review_helpfuls enable row level security;

-- Allow users to read, insert, and delete only their own helpful rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'review_helpfuls' and policyname = 'read own helpful flags'
  ) then
    create policy "read own helpful flags" on public.review_helpfuls for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'review_helpfuls' and policyname = 'insert own helpful flag'
  ) then
    create policy "insert own helpful flag" on public.review_helpfuls for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'review_helpfuls' and policyname = 'delete own helpful flag'
  ) then
    create policy "delete own helpful flag" on public.review_helpfuls for delete using (user_id = auth.uid());
  end if;
end $$;

grant select, insert, delete on table public.review_helpfuls to authenticated;

-- 2) Toggle RPC: add/remove user's helpful, adjust counter, and return state
drop function if exists public.toggle_review_helpful(uuid);

create or replace function public.toggle_review_helpful(p_review_id uuid)
returns table(helpful_count integer, liked boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_inserted int := 0;
  v_helpful int := 0;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Try to insert a like; if it already exists, we'll delete instead
  insert into public.review_helpfuls(review_id, user_id)
  values (p_review_id, v_user)
  on conflict do nothing;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  if v_inserted = 1 then
    update public.reviews
      set helpful = coalesce(helpful, 0) + 1
      where id = p_review_id
      returning helpful into v_helpful;
    return query select v_helpful, true;
  else
    delete from public.review_helpfuls
      where review_id = p_review_id and user_id = v_user;
    update public.reviews
      set helpful = GREATEST(coalesce(helpful, 0) - 1, 0)
      where id = p_review_id
      returning helpful into v_helpful;
    return query select v_helpful, false;
  end if;
end;
$$;

grant execute on function public.toggle_review_helpful(uuid) to authenticated;
