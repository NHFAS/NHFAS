-- NHFAS - Supabase starter schema
-- Run this file in Supabase SQL Editor after creating a project.
-- Authentication is provided by Supabase Auth (auth.users).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum (
  'client', 'service_provider', 'heavy_operator', 'fleet_manager', 'admin'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('pending', 'active', 'suspended', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_type as enum ('artisan_service', 'haulage', 'custom_build');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum (
  'draft', 'posted', 'matching', 'offered', 'confirmed', 'en_route',
  'in_progress', 'completed', 'cancelled', 'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_mode as enum ('instant', 'fixed_rate', 'quote', 'auction');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.vehicle_status as enum ('active', 'inactive', 'maintenance', 'retired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_status as enum ('offered', 'accepted', 'declined', 'expired');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Users and organizations
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'client',
  status public.account_status not null default 'pending',
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'am', 'om', 'sw')),
  low_literacy_mode boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null default 'logistics_company'
    check (organization_type in ('logistics_company', 'artisan_guild', 'other')),
  registration_number text,
  status public.account_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member'
    check (member_role in ('owner', 'manager', 'operator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------------
-- Service providers and fleet
-- ---------------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category_type text not null default 'artisan'
    check (category_type in ('artisan', 'haulage', 'custom_build', 'art')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  years_experience integer check (years_experience >= 0),
  kyc_status text not null default 'pending'
    check (kyc_status in ('pending', 'approved', 'rejected', 'expired')),
  is_searchable boolean not null default true,
  service_radius_km numeric(8,2) not null default 15 check (service_radius_km > 0),
  average_rating numeric(3,2) check (average_rating between 1 and 5),
  rating_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rated_payload_kg integer not null check (rated_payload_kg > 0),
  max_gvw_kg integer not null check (max_gvw_kg >= rated_payload_kg),
  axle_count smallint not null check (axle_count > 0)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  vehicle_class_id uuid not null references public.vehicle_classes(id),
  plate_number text not null unique,
  make text,
  model text,
  model_year integer check (model_year between 1950 and 2100),
  rated_payload_kg integer check (rated_payload_kg > 0),
  tare_weight_kg integer check (tare_weight_kg > 0),
  status public.vehicle_status not null default 'active',
  maintenance_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id is not null or organization_id is not null)
);

-- ---------------------------------------------------------------------
-- Jobs and dispatch
-- ---------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number bigint generated always as identity unique,
  client_id uuid not null references public.profiles(id),
  provider_id uuid references public.profiles(id),
  operator_id uuid references public.profiles(id),
  vehicle_id uuid references public.vehicles(id),
  organization_id uuid references public.organizations(id),
  category_id uuid references public.service_categories(id),
  job_type public.job_type not null,
  booking_mode public.booking_mode not null default 'quote',
  status public.job_status not null default 'draft',
  title text not null,
  description text,
  service_address text,
  pickup_address text,
  dropoff_address text,
  agreed_price numeric(14,2) check (agreed_price >= 0),
  currency char(3) not null default 'ETB',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_id is null or operator_id is null),
  check (job_type = 'haulage' or vehicle_id is null),
  check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start)
);

create index if not exists jobs_client_idx on public.jobs (client_id, created_at desc);
create index if not exists jobs_status_idx on public.jobs (status, created_at desc);
create index if not exists jobs_provider_idx on public.jobs (provider_id, status);
create index if not exists jobs_operator_idx on public.jobs (operator_id, status);

create table if not exists public.job_stops (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  stop_order smallint not null check (stop_order > 0),
  stop_type text not null check (stop_type in ('pickup', 'dropoff', 'service', 'waypoint')),
  address text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  planned_arrival timestamptz,
  arrived_at timestamptz,
  notes text,
  unique (job_id, stop_order),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table if not exists public.dispatch_offers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  provider_id uuid references public.profiles(id),
  operator_id uuid references public.profiles(id),
  vehicle_id uuid references public.vehicles(id),
  rank smallint not null check (rank > 0),
  match_score numeric(6,5) check (match_score between 0 and 1),
  status public.offer_status not null default 'offered',
  expires_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(provider_id, operator_id) = 1),
  unique (job_id, rank)
);

create table if not exists public.job_status_history (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  from_status public.job_status,
  to_status public.job_status not null,
  changed_by uuid references public.profiles(id),
  reason text,
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Cargo, payments, ratings, messaging and notifications
-- ---------------------------------------------------------------------
create table if not exists public.cargo_specifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  description text not null,
  weight_kg numeric(10,2) not null check (weight_kg > 0),
  length_m numeric(8,2) check (length_m > 0),
  width_m numeric(8,2) check (width_m > 0),
  height_m numeric(8,2) check (height_m > 0),
  is_hazardous boolean not null default false,
  is_oversize boolean not null default false
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  payer_id uuid not null references public.profiles(id),
  payee_id uuid references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'ETB',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  provider text,
  provider_reference text unique,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  rater_id uuid not null references public.profiles(id),
  ratee_id uuid not null references public.profiles(id),
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, rater_id),
  check (rater_id <> ratee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'in_app',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SRS extensions: compliance, safety, auctions and provider workflow
-- ---------------------------------------------------------------------
create table if not exists public.provider_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null check (verification_type in ('identity', 'license', 'skill', 'background_check', 'insurance')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  document_url text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (provider_id, verification_type)
);

create table if not exists public.regulatory_permits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  permit_type text not null,
  permit_number text,
  issuing_authority text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  document_url text,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  reporter_id uuid not null references public.profiles(id),
  incident_type text not null check (incident_type in ('accident', 'damage', 'injury', 'fraud', 'abuse', 'other')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
  emergency_sos boolean not null default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table if not exists public.auction_listings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  starting_price numeric(14,2) not null check (starting_price >= 0),
  reserve_price numeric(14,2) check (reserve_price >= starting_price),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed', 'cancelled')),
  anti_sniping_seconds integer not null default 120 check (anti_sniping_seconds >= 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_listings(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'winning', 'outbid', 'withdrawn', 'rejected')),
  fraud_score numeric(5,4) check (fraud_score between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.job_quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  provider_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount >= 0),
  estimated_days integer check (estimated_days > 0),
  proposal text,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected', 'withdrawn', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SRS extensions: tracking, route optimization and fleet intelligence
-- ---------------------------------------------------------------------
create table if not exists public.job_tracking_points (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  driver_id uuid not null references public.profiles(id),
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m numeric(8,2) check (accuracy_m >= 0),
  speed_kph numeric(8,2) check (speed_kph >= 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.route_plans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  algorithm text not null default 'multi_stop_optimization',
  distance_km numeric(10,2) check (distance_km >= 0),
  estimated_minutes integer check (estimated_minutes >= 0),
  load_consolidation_key text,
  route_geometry jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_type text not null,
  description text,
  odometer_km numeric(12,2) check (odometer_km >= 0),
  scheduled_at timestamptz,
  completed_at timestamptz,
  cost numeric(14,2) check (cost >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'overdue')),
  created_at timestamptz not null default now()
);

create table if not exists public.telematics_events (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create table if not exists public.pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  service_category_id uuid references public.service_categories(id),
  origin_area text,
  destination_area text,
  base_price numeric(14,2) not null check (base_price >= 0),
  surge_multiplier numeric(8,4) not null default 1 check (surge_multiplier > 0),
  fair_price_min numeric(14,2) check (fair_price_min >= 0),
  fair_price_max numeric(14,2) check (fair_price_max >= fair_price_min),
  calculated_at timestamptz not null default now()
);

create table if not exists public.cost_estimates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  model_version text not null default 'v1',
  labor_cost numeric(14,2) not null default 0 check (labor_cost >= 0),
  materials_cost numeric(14,2) not null default 0 check (materials_cost >= 0),
  transport_cost numeric(14,2) not null default 0 check (transport_cost >= 0),
  total_estimate numeric(14,2) generated always as (labor_cost + materials_cost + transport_cost) stored,
  inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cost_estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.cost_estimates(id) on delete cascade,
  item_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  subtotal numeric(14,2) generated always as (quantity * unit_price) stored
);

-- ---------------------------------------------------------------------
-- SRS extensions: payments, communication, insurance and credentials
-- ---------------------------------------------------------------------
create table if not exists public.escrow_accounts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),
  payee_id uuid references public.profiles(id),
  currency char(3) not null default 'ETB',
  funded_amount numeric(14,2) not null default 0 check (funded_amount >= 0),
  released_amount numeric(14,2) not null default 0 check (released_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'funded', 'partially_released', 'released', 'refunded', 'disputed')),
  created_at timestamptz not null default now(),
  check (released_amount <= funded_amount)
);

create table if not exists public.escrow_milestones (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid not null references public.escrow_accounts(id) on delete cascade,
  title text not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  sequence_number integer not null check (sequence_number > 0),
  status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'released', 'rejected')),
  due_at timestamptz,
  completed_at timestamptz,
  unique (escrow_id, sequence_number)
);

create table if not exists public.escrow_releases (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.escrow_milestones(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  released_by uuid not null references public.profiles(id),
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text,
  language_code text not null default 'en',
  audio_url text,
  attachment_url text,
  created_at timestamptz not null default now(),
  check (body is not null or audio_url is not null or attachment_url is not null)
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  opened_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  provider text not null,
  policy_number text unique,
  coverage_amount numeric(14,2) not null check (coverage_amount >= 0),
  premium numeric(14,2) not null check (premium >= 0),
  status text not null default 'quoted' check (status in ('quoted', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  filed_by uuid not null references public.profiles(id),
  description text not null,
  claimed_amount numeric(14,2) not null check (claimed_amount >= 0),
  approved_amount numeric(14,2) check (approved_amount >= 0),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'paid')),
  created_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  account_reference text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, account_reference)
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payee_id uuid not null references public.profiles(id),
  payout_account_id uuid not null references public.payout_accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'ETB',
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  provider_reference text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.financing_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  purpose text not null,
  provider text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'disbursed', 'repaid')),
  created_at timestamptz not null default now()
);

create table if not exists public.digital_certificates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  owner_id uuid not null references public.profiles(id),
  certificate_type text not null check (certificate_type in ('authenticity', 'completion', 'skill', 'apprenticeship')),
  certificate_number text not null unique,
  qr_payload text not null,
  blockchain_anchor text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.skill_certifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  issuing_body text,
  certificate_url text,
  issued_at date,
  expires_at date,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'expired'))
);

create table if not exists public.apprenticeship_enrollments (
  id uuid primary key default gen_random_uuid(),
  apprentice_id uuid not null references public.profiles(id),
  mentor_id uuid references public.profiles(id),
  skill_name text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  started_at date not null default current_date,
  completed_at date
);

create table if not exists public.sustainability_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  distance_km numeric(10,2) check (distance_km >= 0),
  fuel_litres numeric(10,2) check (fuel_litres >= 0),
  co2e_kg numeric(10,2) check (co2e_kg >= 0),
  calculation_method text,
  created_at timestamptz not null default now()
);

create index if not exists job_tracking_points_job_idx on public.job_tracking_points (job_id, recorded_at desc);
create index if not exists auction_bids_auction_idx on public.auction_bids (auction_id, amount desc, created_at);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists telematics_events_vehicle_idx on public.telematics_events (vehicle_id, recorded_at desc);

-- ---------------------------------------------------------------------
-- Utility triggers and profile creation
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
drop trigger if exists provider_profiles_updated_at on public.provider_profiles;
create trigger provider_profiles_updated_at before update on public.provider_profiles
for each row execute function public.set_updated_at();
drop trigger if exists vehicles_updated_at on public.vehicles;
create trigger vehicles_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  selected_role public.user_role;
begin
  selected_role := case
    when new.raw_user_meta_data ->> 'role' in ('service_provider', 'heavy_operator')
      then (new.raw_user_meta_data ->> 'role')::public.user_role
    else 'client'::public.user_role
  end;

  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'NHFAS user'), '@', 1)),
    new.phone
  ) on conflict (id) do nothing;

  update public.profiles set role = selected_role where id = new.id;

  if selected_role in ('service_provider', 'heavy_operator') then
    insert into public.provider_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.vehicle_classes enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_stops enable row level security;
alter table public.dispatch_offers enable row level security;
alter table public.job_status_history enable row level security;
alter table public.cargo_specifications enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.provider_verifications enable row level security;
alter table public.regulatory_permits enable row level security;
alter table public.safety_incidents enable row level security;
alter table public.auction_listings enable row level security;
alter table public.auction_bids enable row level security;
alter table public.job_quotes enable row level security;
alter table public.job_tracking_points enable row level security;
alter table public.route_plans enable row level security;
alter table public.vehicle_maintenance_records enable row level security;
alter table public.telematics_events enable row level security;
alter table public.pricing_snapshots enable row level security;
alter table public.cost_estimates enable row level security;
alter table public.cost_estimate_items enable row level security;
alter table public.escrow_accounts enable row level security;
alter table public.escrow_milestones enable row level security;
alter table public.escrow_releases enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.disputes enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.insurance_claims enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.financing_requests enable row level security;
alter table public.digital_certificates enable row level security;
alter table public.skill_certifications enable row level security;
alter table public.apprenticeship_enrollments enable row level security;
alter table public.sustainability_records enable row level security;

-- CREATE POLICY has no IF NOT EXISTS form, so remove known policies first.
create or replace function public.drop_policy_if_exists(target_table text, policy_name text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', policy_name, target_table);
end;
$$;

select public.drop_policy_if_exists('profiles', 'profiles_select');
select public.drop_policy_if_exists('profiles', 'profiles_update_own');
select public.drop_policy_if_exists('organizations', 'organizations_members_select');
select public.drop_policy_if_exists('organizations', 'organizations_insert_own');
select public.drop_policy_if_exists('organization_members', 'organization_members_select');
select public.drop_policy_if_exists('organization_members', 'organization_members_insert_manager');
select public.drop_policy_if_exists('provider_profiles', 'provider_profiles_public_select');
select public.drop_policy_if_exists('provider_profiles', 'provider_profiles_manage_own');
select public.drop_policy_if_exists('vehicles', 'vehicles_select_related');
select public.drop_policy_if_exists('vehicles', 'vehicles_manage_owner');
select public.drop_policy_if_exists('vehicles', 'vehicles_insert_operator');
select public.drop_policy_if_exists('jobs', 'jobs_select_participant');
select public.drop_policy_if_exists('jobs', 'jobs_insert_client');
select public.drop_policy_if_exists('jobs', 'jobs_update_participant');
select public.drop_policy_if_exists('job_stops', 'job_stops_participant');
select public.drop_policy_if_exists('dispatch_offers', 'offers_candidate_or_client');
select public.drop_policy_if_exists('job_status_history', 'job_history_participant');
select public.drop_policy_if_exists('cargo_specifications', 'cargo_participant');
select public.drop_policy_if_exists('payments', 'payments_participant');
select public.drop_policy_if_exists('ratings', 'ratings_participant');
select public.drop_policy_if_exists('ratings', 'ratings_insert_rater');
select public.drop_policy_if_exists('notifications', 'notifications_owner');
select public.drop_policy_if_exists('provider_verifications', 'provider_verifications_owner');
select public.drop_policy_if_exists('provider_verifications', 'provider_verifications_submit');
select public.drop_policy_if_exists('provider_verifications', 'provider_verifications_admin_update');
drop policy if exists provider_documents_owner_insert on storage.objects;
drop policy if exists provider_documents_owner_read on storage.objects;
drop policy if exists provider_documents_admin_read on storage.objects;
select public.drop_policy_if_exists('regulatory_permits', 'regulatory_permits_participant');
select public.drop_policy_if_exists('regulatory_permits', 'regulatory_permits_submit');
select public.drop_policy_if_exists('regulatory_permits', 'regulatory_permits_admin_update');
select public.drop_policy_if_exists('regulatory_permits', 'regulatory_permits_admin_select');
select public.drop_policy_if_exists('safety_incidents', 'safety_incidents_participant');
select public.drop_policy_if_exists('auction_listings', 'auction_listings_authenticated');
select public.drop_policy_if_exists('auction_bids', 'auction_bids_participant');
select public.drop_policy_if_exists('job_quotes', 'job_quotes_participant');
select public.drop_policy_if_exists('job_tracking_points', 'tracking_participant');
select public.drop_policy_if_exists('job_tracking_points', 'tracking_insert_driver');
select public.drop_policy_if_exists('route_plans', 'routes_participant');
select public.drop_policy_if_exists('vehicle_maintenance_records', 'maintenance_vehicle_owner');
select public.drop_policy_if_exists('vehicle_maintenance_records', 'maintenance_vehicle_select');
select public.drop_policy_if_exists('vehicle_maintenance_records', 'maintenance_vehicle_insert');
select public.drop_policy_if_exists('telematics_events', 'telematics_vehicle_owner');
select public.drop_policy_if_exists('pricing_snapshots', 'pricing_authenticated');
select public.drop_policy_if_exists('cost_estimates', 'estimates_participant');
select public.drop_policy_if_exists('cost_estimate_items', 'estimate_items_participant');
select public.drop_policy_if_exists('escrow_accounts', 'escrow_participant');
select public.drop_policy_if_exists('escrow_milestones', 'milestones_participant');
select public.drop_policy_if_exists('escrow_releases', 'releases_participant');
select public.drop_policy_if_exists('conversations', 'conversations_member');
select public.drop_policy_if_exists('conversation_members', 'conversation_members_member');
select public.drop_policy_if_exists('messages', 'messages_member');
select public.drop_policy_if_exists('disputes', 'disputes_participant');
select public.drop_policy_if_exists('disputes', 'disputes_insert_participant');
select public.drop_policy_if_exists('insurance_policies', 'insurance_participant');
select public.drop_policy_if_exists('insurance_claims', 'claims_participant');
select public.drop_policy_if_exists('insurance_claims', 'claims_submit');
select public.drop_policy_if_exists('insurance_claims', 'claims_admin_update');
select public.drop_policy_if_exists('payout_accounts', 'payout_accounts_owner');
select public.drop_policy_if_exists('payouts', 'payouts_owner');
select public.drop_policy_if_exists('financing_requests', 'financing_owner');
select public.drop_policy_if_exists('digital_certificates', 'certificates_owner');
select public.drop_policy_if_exists('skill_certifications', 'skills_owner');
select public.drop_policy_if_exists('apprenticeship_enrollments', 'apprenticeship_participant');
select public.drop_policy_if_exists('sustainability_records', 'sustainability_participant');
select public.drop_policy_if_exists('auction_listings', 'auction_listings_insert_owner');
select public.drop_policy_if_exists('auction_bids', 'auction_bids_insert_owner');
select public.drop_policy_if_exists('safety_incidents', 'safety_incidents_insert_reporter');
select public.drop_policy_if_exists('messages', 'messages_insert_member');
select public.drop_policy_if_exists('payout_accounts', 'payout_accounts_manage_owner');
select public.drop_policy_if_exists('service_categories', 'service_categories_read');
select public.drop_policy_if_exists('vehicle_classes', 'vehicle_classes_read');

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy service_categories_read on public.service_categories for select to authenticated using (is_active = true);
create policy vehicle_classes_read on public.vehicle_classes for select to authenticated using (true);

create policy organizations_members_select on public.organizations for select to authenticated
using (created_by = auth.uid() or exists (
  select 1 from public.organization_members m
  where m.organization_id = organizations.id and m.user_id = auth.uid()
));
create policy organizations_insert_own on public.organizations for insert to authenticated
with check (created_by = auth.uid());

create policy organization_members_select on public.organization_members for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.organization_members m
  where m.organization_id = organization_members.organization_id and m.user_id = auth.uid()
));
create policy organization_members_insert_manager on public.organization_members for insert to authenticated
with check (exists (
  select 1 from public.organization_members m
  where m.organization_id = organization_members.organization_id
    and m.user_id = auth.uid() and m.member_role in ('owner', 'manager')
));

create policy provider_profiles_public_select on public.provider_profiles for select to authenticated
using (is_searchable = true or user_id = auth.uid());
create policy provider_profiles_manage_own on public.provider_profiles for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vehicles_select_related on public.vehicles for select to authenticated
using (owner_id = auth.uid() or exists (
  select 1 from public.organization_members m
  where m.organization_id = vehicles.organization_id and m.user_id = auth.uid()
));
create policy vehicles_insert_operator on public.vehicles for insert to authenticated
with check (owner_id = auth.uid() and status = 'active' and maintenance_blocked = false and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'heavy_operator'
));

create policy jobs_select_participant on public.jobs for select to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or operator_id = auth.uid()
  or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  or (status in ('posted', 'matching') and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and p.role in ('service_provider', 'heavy_operator', 'admin')
  )));
create policy jobs_insert_client on public.jobs for insert to authenticated
with check (client_id = auth.uid() and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'client'
) and status in ('posted', 'matching'));

create policy job_stops_participant on public.job_stops for all to authenticated
using (exists (select 1 from public.jobs j where j.id = job_stops.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())))
with check (exists (select 1 from public.jobs j where j.id = job_stops.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())));

create policy offers_candidate_or_client on public.dispatch_offers for select to authenticated
using (provider_id = auth.uid() or operator_id = auth.uid() or exists (
  select 1 from public.jobs j where j.id = dispatch_offers.job_id and j.client_id = auth.uid()
));

create policy job_history_participant on public.job_status_history for select to authenticated
using (exists (select 1 from public.jobs j where j.id = job_status_history.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())));

create policy cargo_participant on public.cargo_specifications for select to authenticated
using (exists (select 1 from public.jobs j where j.id = cargo_specifications.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())));

create policy payments_participant on public.payments for select to authenticated
using (payer_id = auth.uid() or payee_id = auth.uid());

create policy ratings_participant on public.ratings for select to authenticated
using (rater_id = auth.uid() or (created_at <= now() - interval '7 days' and exists (
  select 1 from public.jobs j where j.id = ratings.job_id
    and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())
)));

create policy notifications_owner on public.notifications for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared authorization helpers keep SRS extension policies consistent.
create or replace function public.is_job_participant(target_job_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = target_job_id
      and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())
  );
$$;

create or replace function public.is_vehicle_owner(target_vehicle_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = target_vehicle_id and (v.owner_id = auth.uid()
      or exists (select 1 from public.organization_members m
        where m.organization_id = v.organization_id and m.user_id = auth.uid()))
  );
$$;

create or replace function public.complete_vehicle_maintenance(target_record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_vehicle_id uuid;
begin
  select vehicle_id into target_vehicle_id from public.vehicle_maintenance_records
    where id = target_record_id for update;
  if not found or not public.is_vehicle_owner(target_vehicle_id) then
    raise exception 'You cannot update this maintenance record';
  end if;
  update public.vehicle_maintenance_records
    set status = 'completed', completed_at = now()
    where id = target_record_id and status <> 'completed';
end;
$$;

create policy provider_verifications_owner on public.provider_verifications for select to authenticated
using (provider_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy provider_verifications_submit on public.provider_verifications for insert to authenticated
with check (provider_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null);
create policy provider_verifications_admin_update on public.provider_verifications for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-verification', 'provider-verification', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy provider_documents_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'provider-verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy provider_documents_owner_read on storage.objects for select to authenticated
using (bucket_id = 'provider-verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy provider_documents_admin_read on storage.objects for select to authenticated
using (bucket_id = 'provider-verification' and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));
create policy regulatory_permits_participant on public.regulatory_permits for select to authenticated
using (public.is_job_participant(job_id));
create policy regulatory_permits_admin_select on public.regulatory_permits for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy regulatory_permits_submit on public.regulatory_permits for insert to authenticated
with check (public.is_job_participant(job_id) and status = 'pending');
create policy regulatory_permits_admin_update on public.regulatory_permits for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy safety_incidents_participant on public.safety_incidents for select to authenticated
using (reporter_id = auth.uid() or public.is_job_participant(job_id));
create policy safety_incidents_insert_reporter on public.safety_incidents for insert to authenticated
with check (reporter_id = auth.uid() and (job_id is null or public.is_job_participant(job_id)));
create policy auction_listings_authenticated on public.auction_listings for select to authenticated using (true);
create policy auction_bids_participant on public.auction_bids for select to authenticated
using (bidder_id = auth.uid() or exists (select 1 from public.auction_listings a where a.id = auction_id and a.seller_id = auth.uid()));
create policy job_quotes_participant on public.job_quotes for select to authenticated
using (provider_id = auth.uid() or public.is_job_participant(job_id));
create policy tracking_participant on public.job_tracking_points for select to authenticated
using (public.is_job_participant(job_id));
create policy tracking_insert_driver on public.job_tracking_points for insert to authenticated
with check (driver_id = auth.uid() and exists (
  select 1 from public.jobs j where j.id = job_tracking_points.job_id
    and (j.provider_id = auth.uid() or j.operator_id = auth.uid())
));
create policy routes_participant on public.route_plans for all to authenticated
using (public.is_job_participant(job_id)) with check (public.is_job_participant(job_id));
create policy maintenance_vehicle_select on public.vehicle_maintenance_records for select to authenticated
using (public.is_vehicle_owner(vehicle_id));
create policy maintenance_vehicle_insert on public.vehicle_maintenance_records for insert to authenticated
with check (public.is_vehicle_owner(vehicle_id) and status = 'scheduled');
create policy telematics_vehicle_owner on public.telematics_events for select to authenticated
using (public.is_vehicle_owner(vehicle_id));
create policy pricing_authenticated on public.pricing_snapshots for select to authenticated using (true);
create policy estimates_participant on public.cost_estimates for all to authenticated
using (requested_by = auth.uid() or public.is_job_participant(job_id))
with check (requested_by = auth.uid());
create policy estimate_items_participant on public.cost_estimate_items for all to authenticated
using (exists (select 1 from public.cost_estimates e where e.id = estimate_id and (e.requested_by = auth.uid() or public.is_job_participant(e.job_id))))
with check (exists (select 1 from public.cost_estimates e where e.id = estimate_id and e.requested_by = auth.uid()));
create policy escrow_participant on public.escrow_accounts for select to authenticated
using (payer_id = auth.uid() or payee_id = auth.uid() or public.is_job_participant(job_id));
create policy milestones_participant on public.escrow_milestones for select to authenticated
using (exists (select 1 from public.escrow_accounts e where e.id = escrow_id and (e.payer_id = auth.uid() or e.payee_id = auth.uid())));
create policy releases_participant on public.escrow_releases for select to authenticated
using (exists (select 1 from public.escrow_milestones m join public.escrow_accounts e on e.id = m.escrow_id
  where m.id = milestone_id and (e.payer_id = auth.uid() or e.payee_id = auth.uid())));
create policy conversations_member on public.conversations for select to authenticated
using (exists (select 1 from public.conversation_members m where m.conversation_id = conversations.id and m.user_id = auth.uid()));
create policy conversation_members_member on public.conversation_members for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.conversation_members m where m.conversation_id = conversation_members.conversation_id and m.user_id = auth.uid()));
create policy messages_member on public.messages for select to authenticated
using (exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
create policy messages_insert_member on public.messages for insert to authenticated
with check (sender_id = auth.uid() and exists (select 1 from public.conversation_members m where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
create policy disputes_participant on public.disputes for select to authenticated
using (public.is_job_participant(job_id));
create policy disputes_insert_participant on public.disputes for insert to authenticated
with check (opened_by = auth.uid() and public.is_job_participant(job_id) and status = 'open');
create policy insurance_participant on public.insurance_policies for select to authenticated
using (public.is_job_participant(job_id));
create policy claims_participant on public.insurance_claims for select to authenticated
using (filed_by = auth.uid() or exists (select 1 from public.insurance_policies p where p.id = policy_id and public.is_job_participant(p.job_id)))
;
create policy claims_submit on public.insurance_claims for insert to authenticated
with check (filed_by = auth.uid() and status = 'submitted');
create policy claims_admin_update on public.insurance_claims for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy payout_accounts_owner on public.payout_accounts for select to authenticated using (user_id = auth.uid());
create policy payout_accounts_manage_owner on public.payout_accounts for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payouts_owner on public.payouts for select to authenticated using (payee_id = auth.uid());
create policy financing_owner on public.financing_requests for all to authenticated
using (applicant_id = auth.uid()) with check (applicant_id = auth.uid());
create policy certificates_owner on public.digital_certificates for select to authenticated using (owner_id = auth.uid());
create policy skills_owner on public.skill_certifications for all to authenticated
using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy apprenticeship_participant on public.apprenticeship_enrollments for select to authenticated
using (apprentice_id = auth.uid() or mentor_id = auth.uid());
create policy sustainability_participant on public.sustainability_records for select to authenticated
using (public.is_job_participant(job_id) or public.is_vehicle_owner(vehicle_id));

revoke update on public.profiles from authenticated;
grant update (full_name, phone, preferred_language, low_literacy_mode, avatar_url)
  on public.profiles to authenticated;
revoke update on public.provider_profiles from authenticated;
grant update (bio, years_experience, is_searchable, service_radius_km)
  on public.provider_profiles to authenticated;
revoke insert, update, delete on public.service_categories, public.vehicle_classes from anon, authenticated;
grant select on public.service_categories, public.vehicle_classes to authenticated;
revoke update, delete on public.vehicles from authenticated;
revoke update, delete on public.vehicle_maintenance_records from authenticated;

create or replace function public.create_job_request(
  request_title text,
  request_description text,
  request_job_type public.job_type,
  request_mode public.booking_mode,
  target_category_id uuid default null,
  request_service_address text default null,
  request_pickup_address text default null,
  request_dropoff_address text default null,
  request_price numeric default null,
  request_scheduled_start timestamptz default null,
  request_cargo_description text default null,
  request_cargo_weight_kg numeric default null,
  request_cargo_length_m numeric default null,
  request_cargo_width_m numeric default null,
  request_cargo_height_m numeric default null,
  request_cargo_hazardous boolean default false,
  request_cargo_oversize boolean default false
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'client'
  ) then
    raise exception 'A client account is required to post a service request';
  end if;
  if nullif(trim(request_title), '') is null then
    raise exception 'A request title is required';
  end if;
  if request_job_type = 'haulage' and (
    nullif(trim(request_pickup_address), '') is null
    or nullif(trim(request_dropoff_address), '') is null
    or nullif(trim(request_cargo_description), '') is null
    or request_cargo_weight_kg is null or request_cargo_weight_kg <= 0
  ) then
    raise exception 'Haulage requests need cargo details, weight, pickup, and drop-off';
  end if;

  insert into public.jobs (
    client_id, category_id, job_type, booking_mode, status, title, description,
    service_address, pickup_address, dropoff_address, agreed_price, scheduled_start
  ) values (
    actor_id, target_category_id, request_job_type, request_mode, 'posted', trim(request_title),
    nullif(trim(request_description), ''), nullif(trim(request_service_address), ''),
    nullif(trim(request_pickup_address), ''), nullif(trim(request_dropoff_address), ''),
    request_price, request_scheduled_start
  ) returning * into job_row;

  if request_job_type = 'haulage' then
    insert into public.cargo_specifications (
      job_id, description, weight_kg, length_m, width_m, height_m, is_hazardous, is_oversize
    ) values (
      job_row.id, trim(request_cargo_description), request_cargo_weight_kg,
      request_cargo_length_m, request_cargo_width_m, request_cargo_height_m,
      coalesce(request_cargo_hazardous, false), coalesce(request_cargo_oversize, false)
    );
  end if;

  insert into public.job_status_history (job_id, to_status, changed_by)
    values (job_row.id, 'posted', actor_id);
  return job_row;
end;
$$;

create or replace function public.accept_job(target_job_id uuid, target_vehicle_id uuid default null)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.user_role;
  job_row public.jobs%rowtype;
  previous_status public.job_status;
  cargo_weight numeric;
  vehicle_capacity numeric;
begin
  if actor_id is null then
    raise exception 'Sign in before accepting a job';
  end if;

  select role into actor_role from public.profiles where id = actor_id;
  if actor_role not in ('service_provider', 'heavy_operator') then
    raise exception 'Only verified providers and operators can accept jobs';
  end if;

  if not exists (
    select 1 from public.provider_profiles pp
    join public.provider_verifications pv on pv.provider_id = pp.user_id
    where pp.user_id = actor_id and pp.kyc_status = 'approved'
      and pv.verification_type = 'identity' and pv.status = 'approved'
  ) then
    raise exception 'Identity verification must be approved before accepting jobs';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if not found or job_row.status not in ('posted', 'matching') then
    raise exception 'This job is no longer available';
  end if;
  if job_row.booking_mode = 'quote' or job_row.booking_mode = 'auction' then
    raise exception 'This request requires a quote or auction award';
  end if;

  if job_row.job_type = 'haulage' then
    if actor_role <> 'heavy_operator' or target_vehicle_id is null then
      raise exception 'A heavy operator must select an eligible vehicle';
    end if;

    select coalesce(sum(weight_kg), 0) into cargo_weight
      from public.cargo_specifications where job_id = target_job_id;
    if cargo_weight <= 0 then
      raise exception 'Cargo weight is required before dispatch';
    end if;

    select least(coalesce(v.rated_payload_kg, vc.rated_payload_kg), vc.rated_payload_kg)
      into vehicle_capacity
      from public.vehicles v
      join public.vehicle_classes vc on vc.id = v.vehicle_class_id
      where v.id = target_vehicle_id
        and (v.owner_id = actor_id or exists (
          select 1 from public.organization_members om
          where om.organization_id = v.organization_id and om.user_id = actor_id
        ))
        and v.status = 'active' and not v.maintenance_blocked
        and not exists (
          select 1 from public.vehicle_maintenance_records mr where mr.vehicle_id = v.id
            and (mr.status = 'overdue' or (mr.status = 'scheduled' and mr.scheduled_at < now()))
        );

    if vehicle_capacity is null then
      raise exception 'Select an active vehicle you are authorized to dispatch';
    end if;
    if cargo_weight > vehicle_capacity then
      raise exception 'Cargo exceeds this vehicle payload capacity';
    end if;
  elsif actor_role <> 'service_provider' then
    raise exception 'This request requires a service provider';
  end if;

  previous_status := job_row.status;
  update public.jobs
    set provider_id = case when job_row.job_type = 'haulage' then null else actor_id end,
        operator_id = case when job_row.job_type = 'haulage' then actor_id else null end,
        vehicle_id = case when job_row.job_type = 'haulage' then target_vehicle_id else null end,
        status = 'confirmed'
    where id = target_job_id
    returning * into job_row;

  insert into public.job_status_history (job_id, from_status, to_status, changed_by)
    values (target_job_id, previous_status, 'confirmed', actor_id);
  return job_row;
end;
$$;

create or replace function public.update_job_status(target_job_id uuid, next_status public.job_status)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
  previous_status public.job_status;
  can_change boolean := false;
begin
  if actor_id is null then
    raise exception 'Sign in before updating a job';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if not found then
    raise exception 'Job not found';
  end if;
  previous_status := job_row.status;

  if next_status = 'cancelled' and job_row.client_id = actor_id
    and previous_status in ('draft', 'posted', 'matching', 'confirmed') then
    can_change := true;
  elsif job_row.provider_id = actor_id or job_row.operator_id = actor_id then
    can_change := (previous_status = 'confirmed' and next_status = 'en_route')
      or (previous_status = 'en_route' and next_status = 'in_progress')
      or (previous_status = 'in_progress' and next_status = 'completed');
  end if;

  if not can_change then
    raise exception 'That status change is not permitted';
  end if;

  update public.jobs set status = next_status where id = target_job_id returning * into job_row;
  insert into public.job_status_history (job_id, from_status, to_status, changed_by)
    values (target_job_id, previous_status, next_status, actor_id);
  return job_row;
end;
$$;

create or replace function public.report_safety_incident(
  target_job_id uuid,
  incident_type text,
  severity text,
  incident_description text,
  incident_latitude numeric default null,
  incident_longitude numeric default null,
  is_emergency boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  incident_id uuid;
  previous_status public.job_status;
begin
  if actor_id is null or not public.is_job_participant(target_job_id) then
    raise exception 'Only a job participant can report an incident';
  end if;

  select status into previous_status from public.jobs where id = target_job_id for update;
  insert into public.safety_incidents (
    job_id, reporter_id, incident_type, severity, description,
    latitude, longitude, emergency_sos
  ) values (
    target_job_id, actor_id, incident_type, severity, incident_description,
    incident_latitude, incident_longitude, is_emergency
  ) returning id into incident_id;

  update public.jobs set status = 'disputed' where id = target_job_id and status <> 'disputed';
  if previous_status <> 'disputed' then
    insert into public.job_status_history (job_id, from_status, to_status, changed_by, reason)
      values (target_job_id, previous_status, 'disputed', actor_id, 'Safety incident reported');
  end if;
  update public.escrow_accounts set status = 'disputed' where job_id = target_job_id
    and status in ('pending', 'funded', 'partially_released');
  insert into public.notifications (user_id, title, body, notification_type, data)
    select p.id, 'Safety incident reported', incident_description, 'safety_incident',
      jsonb_build_object('job_id', target_job_id, 'incident_id', incident_id)
    from public.profiles p where p.role = 'admin';

  return incident_id;
end;
$$;

create or replace function public.review_provider_verification(
  target_verification_id uuid,
  decision text,
  reviewer_notes text default null,
  document_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  verification_row public.provider_verifications%rowtype;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles where id = actor_id and role = 'admin'
  ) then
    raise exception 'Administrator access is required to review verification';
  end if;
  if decision not in ('approved', 'rejected', 'expired') then
    raise exception 'Choose an approved, rejected, or expired decision';
  end if;

  select * into verification_row from public.provider_verifications
    where id = target_verification_id for update;
  if not found then
    raise exception 'Verification record not found';
  end if;

  update public.provider_verifications
    set status = decision, reviewed_by = actor_id, reviewed_at = now(),
        expires_at = document_expires_at, notes = reviewer_notes
    where id = target_verification_id;

  if verification_row.verification_type = 'identity' then
    update public.provider_profiles set kyc_status = decision
      where user_id = verification_row.provider_id;
  end if;

  insert into public.notifications (user_id, title, body, notification_type, data)
    values (verification_row.provider_id, 'Verification reviewed',
      coalesce(reviewer_notes, 'Your verification status is ' || decision || '.'),
      'provider_verification', jsonb_build_object('verification_id', target_verification_id, 'status', decision));
end;
$$;

create or replace function public.submit_job_quote(
  target_job_id uuid,
  quote_amount numeric,
  quote_days integer default null,
  quote_proposal text default null
)
returns public.job_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
  quote_row public.job_quotes%rowtype;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles p join public.provider_profiles pp on pp.user_id = p.id
    join public.provider_verifications pv on pv.provider_id = p.id
    where p.id = actor_id and p.role = 'service_provider' and pp.kyc_status = 'approved'
      and pv.verification_type = 'identity' and pv.status = 'approved'
  ) then
    raise exception 'Approved provider verification is required to submit a quote';
  end if;
  if quote_amount <= 0 then
    raise exception 'Quote amount must be greater than zero';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if not found or job_row.status not in ('posted', 'matching')
    or (job_row.job_type <> 'custom_build' and job_row.booking_mode <> 'quote')
    or job_row.client_id = actor_id then
    raise exception 'This request is not accepting quotes';
  end if;

  insert into public.job_quotes (job_id, provider_id, amount, estimated_days, proposal)
    values (target_job_id, actor_id, quote_amount, quote_days, quote_proposal)
    returning * into quote_row;
  return quote_row;
end;
$$;

create or replace function public.accept_job_quote(target_quote_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  quote_row public.job_quotes%rowtype;
  job_row public.jobs%rowtype;
  previous_status public.job_status;
begin
  if actor_id is null then
    raise exception 'Sign in before accepting a quote';
  end if;
  select * into quote_row from public.job_quotes where id = target_quote_id for update;
  if not found or quote_row.status <> 'submitted'
    or (quote_row.expires_at is not null and quote_row.expires_at <= now()) then
    raise exception 'This quote is no longer available';
  end if;
  select * into job_row from public.jobs where id = quote_row.job_id for update;
  if not found or job_row.client_id <> actor_id or job_row.status not in ('posted', 'matching') then
    raise exception 'Only the client can accept a quote on an open request';
  end if;
  if not exists (
    select 1 from public.provider_profiles pp join public.provider_verifications pv on pv.provider_id = pp.user_id
    where pp.user_id = quote_row.provider_id and pp.kyc_status = 'approved'
      and pv.verification_type = 'identity' and pv.status = 'approved'
  ) then
    raise exception 'The provider is no longer verified';
  end if;

  previous_status := job_row.status;
  update public.jobs set provider_id = quote_row.provider_id, agreed_price = quote_row.amount,
    status = 'confirmed' where id = job_row.id returning * into job_row;
  update public.job_quotes set status = case when id = target_quote_id then 'accepted' else 'rejected' end
    where job_id = job_row.id and status = 'submitted';
  insert into public.job_status_history (job_id, from_status, to_status, changed_by)
    values (job_row.id, previous_status, 'confirmed', actor_id);
  return job_row;
end;
$$;

create or replace function public.create_auction_listing(
  listing_title text,
  listing_description text,
  minimum_price numeric,
  reserve_price numeric,
  auction_starts_at timestamptz,
  auction_ends_at timestamptz
)
returns public.auction_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  auction_job public.jobs%rowtype;
  auction_row public.auction_listings%rowtype;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles p join public.provider_profiles pp on pp.user_id = p.id
    join public.provider_verifications pv on pv.provider_id = p.id
    where p.id = actor_id and p.role = 'service_provider' and pp.kyc_status = 'approved'
      and pv.verification_type = 'identity' and pv.status = 'approved'
  ) then
    raise exception 'Approved artisan verification is required to create an auction';
  end if;
  if nullif(trim(listing_title), '') is null or minimum_price < 0
    or (reserve_price is not null and reserve_price < minimum_price)
    or auction_starts_at < now() or auction_ends_at <= auction_starts_at then
    raise exception 'Check the title, price, and auction schedule';
  end if;

  insert into public.jobs (client_id, job_type, booking_mode, status, title, description)
    values (actor_id, 'custom_build', 'auction', 'posted', trim(listing_title), listing_description)
    returning * into auction_job;
  insert into public.auction_listings (
    job_id, seller_id, title, description, starting_price, reserve_price, starts_at, ends_at, status
  ) values (
    auction_job.id, actor_id, trim(listing_title), listing_description, minimum_price,
    reserve_price, auction_starts_at, auction_ends_at,
    case when auction_starts_at <= now() then 'open' else 'scheduled' end
  ) returning * into auction_row;
  return auction_row;
end;
$$;

create or replace function public.place_auction_bid(target_auction_id uuid, bid_amount numeric)
returns public.auction_bids
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  auction_row public.auction_listings%rowtype;
  current_bid numeric;
  previous_bidder uuid;
  bid_row public.auction_bids%rowtype;
begin
  if actor_id is null then
    raise exception 'Sign in before placing a bid';
  end if;
  select * into auction_row from public.auction_listings where id = target_auction_id for update;
  if not found or auction_row.seller_id = actor_id then
    raise exception 'This auction is unavailable to you';
  end if;
  if auction_row.status = 'scheduled' and auction_row.starts_at <= now() then
    update public.auction_listings set status = 'open' where id = target_auction_id returning * into auction_row;
  end if;
  if auction_row.status <> 'open' or auction_row.starts_at > now() or auction_row.ends_at <= now() then
    raise exception 'This auction is not accepting bids';
  end if;

  select amount, bidder_id into current_bid, previous_bidder from public.auction_bids
    where auction_id = target_auction_id and status = 'winning' for update;
  if bid_amount < coalesce(current_bid + 1, auction_row.starting_price) then
    raise exception 'Bid must be at least % ETB', coalesce(current_bid + 1, auction_row.starting_price);
  end if;
  update public.auction_bids set status = 'outbid'
    where auction_id = target_auction_id and status = 'winning';
  insert into public.auction_bids (auction_id, bidder_id, amount, status)
    values (target_auction_id, actor_id, bid_amount, 'winning') returning * into bid_row;
  if auction_row.ends_at <= now() + interval '60 seconds' then
    update public.auction_listings set ends_at = ends_at + interval '3 minutes'
      where id = target_auction_id;
  end if;
  if previous_bidder is not null then
    insert into public.notifications (user_id, title, body, notification_type, data)
      values (previous_bidder, 'You have been outbid', 'A higher bid was placed on ' || auction_row.title,
        'auction_outbid', jsonb_build_object('auction_id', target_auction_id));
  end if;
  return bid_row;
end;
$$;

create or replace function public.open_job_conversation(target_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
  conversation_id uuid;
begin
  if actor_id is null then
    raise exception 'Sign in before opening a conversation';
  end if;
  select * into job_row from public.jobs where id = target_job_id for update;
  if not found or (actor_id <> job_row.client_id
    and actor_id is distinct from job_row.provider_id
    and actor_id is distinct from job_row.operator_id) then
    raise exception 'Only assigned job participants can message each other';
  end if;
  if job_row.provider_id is null and job_row.operator_id is null then
    raise exception 'Messaging opens after a provider accepts the request';
  end if;

  select c.id into conversation_id from public.conversations c
    join public.conversation_members cm on cm.conversation_id = c.id
    where c.job_id = target_job_id and cm.user_id = actor_id limit 1;
  if conversation_id is null then
    insert into public.conversations (job_id, created_by) values (target_job_id, actor_id)
      returning id into conversation_id;
    insert into public.conversation_members (conversation_id, user_id)
      values (conversation_id, job_row.client_id)
      on conflict do nothing;
    if job_row.provider_id is not null then
      insert into public.conversation_members (conversation_id, user_id)
        values (conversation_id, job_row.provider_id) on conflict do nothing;
    end if;
    if job_row.operator_id is not null then
      insert into public.conversation_members (conversation_id, user_id)
        values (conversation_id, job_row.operator_id) on conflict do nothing;
    end if;
  end if;
  return conversation_id;
end;
$$;

create or replace function public.open_job_dispute(target_job_id uuid, dispute_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
  dispute_id uuid;
begin
  if actor_id is null or not public.is_job_participant(target_job_id) then
    raise exception 'Only a job participant can open a dispute';
  end if;
  if nullif(trim(dispute_reason), '') is null then
    raise exception 'A dispute reason is required';
  end if;
  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.status in ('completed', 'cancelled', 'disputed') then
    raise exception 'This job cannot accept a new dispute';
  end if;
  if exists (select 1 from public.disputes where job_id = target_job_id and status in ('open', 'investigating')) then
    raise exception 'An active dispute already exists for this job';
  end if;

  insert into public.disputes (job_id, opened_by, reason)
    values (target_job_id, actor_id, trim(dispute_reason)) returning id into dispute_id;
  update public.jobs set status = 'disputed' where id = target_job_id;
  insert into public.job_status_history (job_id, from_status, to_status, changed_by, reason)
    values (target_job_id, job_row.status, 'disputed', actor_id, 'Dispute opened');
  update public.escrow_accounts set status = 'disputed' where job_id = target_job_id
    and status in ('pending', 'funded', 'partially_released');
  insert into public.notifications (user_id, title, body, notification_type, data)
    select p.id, 'A job dispute was opened', trim(dispute_reason), 'dispute',
      jsonb_build_object('job_id', target_job_id, 'dispute_id', dispute_id)
    from public.profiles p where p.role = 'admin';
  return dispute_id;
end;
$$;

create or replace function public.submit_job_rating(target_job_id uuid, rating_stars smallint, rating_comment text default null)
returns public.ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  job_row public.jobs%rowtype;
  target_ratee_id uuid;
  rating_row public.ratings%rowtype;
begin
  if actor_id is null or rating_stars not between 1 and 5 then
    raise exception 'Sign in and choose a rating from 1 to 5';
  end if;
  select * into job_row from public.jobs where id = target_job_id for update;
  if not found or job_row.status <> 'completed' then
    raise exception 'Ratings are available after job completion';
  end if;
  if exists (select 1 from public.escrow_accounts where job_id = target_job_id)
    and not exists (select 1 from public.escrow_accounts where job_id = target_job_id and status = 'released') then
    raise exception 'Ratings are available after escrow is released';
  end if;

  if job_row.client_id = actor_id then
    target_ratee_id := coalesce(job_row.provider_id, job_row.operator_id);
  elsif actor_id in (job_row.provider_id, job_row.operator_id) then
    target_ratee_id := job_row.client_id;
  else
    raise exception 'Only a job participant can submit a rating';
  end if;
  if target_ratee_id is null then
    raise exception 'This job has no assigned counterparty to rate';
  end if;

  insert into public.ratings (job_id, rater_id, ratee_id, stars, comment)
    values (target_job_id, actor_id, target_ratee_id, rating_stars, nullif(trim(rating_comment), ''))
    returning * into rating_row;
  update public.provider_profiles pp set
    average_rating = (select avg(r.stars)::numeric(3,2) from public.ratings r where r.ratee_id = target_ratee_id),
    rating_count = (select count(*) from public.ratings r where r.ratee_id = target_ratee_id)
    where pp.user_id = target_ratee_id;
  return rating_row;
end;
$$;

create or replace view public.auction_bid_summaries as
select auction_id, max(amount) as highest_bid, count(*) as bid_count
from public.auction_bids
where status in ('winning', 'outbid')
group by auction_id;
grant select on public.auction_bid_summaries to authenticated;

grant execute on function public.accept_job(uuid, uuid) to authenticated;
grant execute on function public.create_job_request(
  text, text, public.job_type, public.booking_mode, uuid, text, text, text,
  numeric, timestamptz, text, numeric, numeric, numeric, numeric, boolean, boolean
) to authenticated;
grant execute on function public.update_job_status(uuid, public.job_status) to authenticated;
grant execute on function public.report_safety_incident(uuid, text, text, text, numeric, numeric, boolean)
  to authenticated;
grant execute on function public.review_provider_verification(uuid, text, text, timestamptz)
  to authenticated;
grant execute on function public.submit_job_quote(uuid, numeric, integer, text) to authenticated;
grant execute on function public.accept_job_quote(uuid) to authenticated;
grant execute on function public.create_auction_listing(text, text, numeric, numeric, timestamptz, timestamptz)
  to authenticated;
grant execute on function public.place_auction_bid(uuid, numeric) to authenticated;
grant execute on function public.open_job_conversation(uuid) to authenticated;
grant execute on function public.open_job_dispute(uuid, text) to authenticated;
grant execute on function public.complete_vehicle_maintenance(uuid) to authenticated;
grant execute on function public.submit_job_rating(uuid, smallint, text) to authenticated;

-- Basic reference data
insert into public.vehicle_classes (code, name, rated_payload_kg, max_gvw_kg, axle_count) values
  ('PICKUP', 'Pickup', 1200, 3500, 2),
  ('FLATBED_3T', '3-ton flatbed', 3000, 7500, 2),
  ('TIPPER_10T', '10-ton tipper', 10000, 18000, 3),
  ('CRANE_MOBILE', 'Mobile crane truck', 8000, 20000, 3)
on conflict (code) do nothing;

insert into public.service_categories (code, name, category_type) values
  ('ELECTRICIAN', 'Electrician', 'artisan'),
  ('PLUMBER', 'Plumber', 'artisan'),
  ('CARPENTRY', 'Carpentry', 'custom_build'),
  ('MASONRY', 'Masonry', 'artisan'),
  ('HAULAGE', 'Heavy haulage', 'haulage')
on conflict (code) do nothing;
