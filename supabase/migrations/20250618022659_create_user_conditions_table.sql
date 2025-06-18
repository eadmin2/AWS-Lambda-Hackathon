create table if not exists public.user_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  summary text,
  body_system text,
  keywords text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);
