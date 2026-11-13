begin;
create table public.reminders (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 120), message text not null check(length(message) between 1 and 4000),
 schedule_type text not null check(schedule_type in ('once','daily','weekly')), scheduled_at timestamptz, time_of_day time, day_of_week int check(day_of_week between 0 and 6),
 next_run_at timestamptz not null, enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((schedule_type='once' and scheduled_at is not null) or (schedule_type='daily' and time_of_day is not null) or (schedule_type='weekly' and time_of_day is not null and day_of_week is not null))
);
create table public.deliveries (
 id uuid primary key default gen_random_uuid(),reminder_id uuid references public.reminders(id) on delete set null,scheduled_for timestamptz not null,
 status text not null check(status in ('sending','accepted','uncertain')),attempt_count int not null default 1 check(attempt_count=1),provider_message_id text,error_message text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(reminder_id,scheduled_for)
);
create index reminders_due on public.reminders(next_run_at) where enabled;
create index deliveries_history on public.deliveries(created_at desc);
create function public.touch_updated() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now();return new;end $$;
create trigger reminders_updated before update on public.reminders for each row execute function public.touch_updated();
create trigger deliveries_updated before update on public.deliveries for each row execute function public.touch_updated();
alter table public.reminders enable row level security;
alter table public.deliveries enable row level security;
revoke all on public.reminders,public.deliveries from anon,authenticated;
create function public.claim_due() returns table(delivery_id uuid,message text) language plpgsql security definer set search_path=public as $$
declare r public.reminders; d uuid; candidate timestamp; local_now timestamp;
begin
 select * into r from public.reminders where enabled and next_run_at<=now() order by next_run_at for update skip locked limit 1;
 if not found then return;end if;
 insert into public.deliveries(reminder_id,scheduled_for,status) values(r.id,r.next_run_at,'sending') on conflict(reminder_id,scheduled_for) do nothing returning id into d;
 if r.schedule_type='once' then update public.reminders set enabled=false where id=r.id;
 else
  local_now:=now() at time zone 'Asia/Kathmandu';candidate:=local_now::date+r.time_of_day;
  if candidate<=local_now then candidate:=candidate+interval '1 day';end if;
  if r.schedule_type='weekly' then
   while extract(dow from candidate)::int<>r.day_of_week loop candidate:=candidate+interval '1 day';end loop;
  end if;
  update public.reminders set next_run_at=candidate at time zone 'Asia/Kathmandu' where id=r.id;
 end if;
 if d is not null then return query select d,r.message;end if;
end $$;
revoke all on function public.claim_due() from public,anon,authenticated;
grant execute on function public.claim_due() to service_role;
commit;
