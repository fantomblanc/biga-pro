create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy user_roles_own_read on public.user_roles for select to authenticated using (auth.uid() = user_id);
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.grant_admin_by_email() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(NEW.email) = 'fantomblanc@gmail.com' then
    insert into public.user_roles(user_id, role) values (NEW.id, 'admin') on conflict do nothing;
  end if;
  return NEW;
end; $$;
create trigger on_auth_user_admin after insert on auth.users for each row execute function public.grant_admin_by_email();
insert into public.user_roles(user_id, role) select id, 'admin' from auth.users where lower(email)='fantomblanc@gmail.com' on conflict do nothing;

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  app_name text not null default 'CarpiBiga Pro',
  paypal_email text not null default 'fantomblanc@gmail.com',
  buy_me_a_coffee_username text not null default '',
  contact_email text not null default 'fantomblanc@gmail.com',
  banner_message text not null default '',
  banner_active boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
create policy app_settings_admin_update on public.app_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger app_settings_touch before update on public.app_settings for each row execute function public.touch_updated_at();
insert into public.app_settings(id) values (1);

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'suggestion' check (type in ('bug','suggestion','autre')),
  message text not null check (char_length(message) between 1 and 5000),
  user_email text check (user_email is null or char_length(user_email) <= 255),
  created_at timestamptz not null default now()
);
grant insert on public.feedback_reports to anon, authenticated;
grant select, delete on public.feedback_reports to authenticated;
grant all on public.feedback_reports to service_role;
alter table public.feedback_reports enable row level security;
create policy feedback_insert on public.feedback_reports for insert to anon, authenticated with check (true);
create policy feedback_admin_read on public.feedback_reports for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy feedback_admin_delete on public.feedback_reports for delete to authenticated using (public.has_role(auth.uid(),'admin'));