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
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'NHFAS user'), '@', 1)),
    new.phone
  );
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
select public.drop_policy_if_exists('regulatory_permits', 'regulatory_permits_participant');
select public.drop_policy_if_exists('safety_incidents', 'safety_incidents_participant');
select public.drop_policy_if_exists('auction_listings', 'auction_listings_authenticated');
select public.drop_policy_if_exists('auction_bids', 'auction_bids_participant');
select public.drop_policy_if_exists('job_quotes', 'job_quotes_participant');
select public.drop_policy_if_exists('job_tracking_points', 'tracking_participant');
select public.drop_policy_if_exists('route_plans', 'routes_participant');
select public.drop_policy_if_exists('vehicle_maintenance_records', 'maintenance_vehicle_owner');
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
select public.drop_policy_if_exists('insurance_policies', 'insurance_participant');
select public.drop_policy_if_exists('insurance_claims', 'claims_participant');
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

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

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
create policy provider_profiles_manage_own on public.provider_profiles for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vehicles_select_related on public.vehicles for select to authenticated
using (owner_id = auth.uid() or exists (
  select 1 from public.organization_members m
  where m.organization_id = vehicles.organization_id and m.user_id = auth.uid()
));
create policy vehicles_manage_owner on public.vehicles for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy jobs_select_participant on public.jobs for select to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or operator_id = auth.uid()
  or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  or status in ('posted', 'matching'));
create policy jobs_insert_client on public.jobs for insert to authenticated
with check (client_id = auth.uid());
create policy jobs_update_participant on public.jobs for update to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or operator_id = auth.uid())
with check (client_id = auth.uid() or provider_id = auth.uid() or operator_id = auth.uid());

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

create policy cargo_participant on public.cargo_specifications for all to authenticated
using (exists (select 1 from public.jobs j where j.id = cargo_specifications.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())))
with check (exists (select 1 from public.jobs j where j.id = cargo_specifications.job_id
  and (j.client_id = auth.uid() or j.provider_id = auth.uid() or j.operator_id = auth.uid())));

create policy payments_participant on public.payments for select to authenticated
using (payer_id = auth.uid() or payee_id = auth.uid());

create policy ratings_participant on public.ratings for select to authenticated
using (rater_id = auth.uid() or ratee_id = auth.uid());
create policy ratings_insert_rater on public.ratings for insert to authenticated
with check (rater_id = auth.uid());

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

create policy provider_verifications_owner on public.provider_verifications for all to authenticated
using (provider_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (provider_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy regulatory_permits_participant on public.regulatory_permits for all to authenticated
using (public.is_job_participant(job_id)) with check (public.is_job_participant(job_id));
create policy safety_incidents_participant on public.safety_incidents for select to authenticated
using (reporter_id = auth.uid() or public.is_job_participant(job_id));
create policy safety_incidents_insert_reporter on public.safety_incidents for insert to authenticated
with check (reporter_id = auth.uid());
create policy auction_listings_authenticated on public.auction_listings for select to authenticated using (true);
create policy auction_listings_insert_owner on public.auction_listings for insert to authenticated
with check (seller_id = auth.uid());
create policy auction_bids_participant on public.auction_bids for select to authenticated
using (bidder_id = auth.uid() or exists (select 1 from public.auction_listings a where a.id = auction_id and a.seller_id = auth.uid()));
create policy auction_bids_insert_owner on public.auction_bids for insert to authenticated
with check (bidder_id = auth.uid());
create policy job_quotes_participant on public.job_quotes for all to authenticated
using (provider_id = auth.uid() or public.is_job_participant(job_id))
with check (provider_id = auth.uid());
create policy tracking_participant on public.job_tracking_points for all to authenticated
using (public.is_job_participant(job_id)) with check (driver_id = auth.uid());
create policy routes_participant on public.route_plans for all to authenticated
using (public.is_job_participant(job_id)) with check (public.is_job_participant(job_id));
create policy maintenance_vehicle_owner on public.vehicle_maintenance_records for all to authenticated
using (public.is_vehicle_owner(vehicle_id)) with check (public.is_vehicle_owner(vehicle_id));
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
create policy disputes_participant on public.disputes for all to authenticated
using (opened_by = auth.uid() or public.is_job_participant(job_id)) with check (opened_by = auth.uid());
create policy insurance_participant on public.insurance_policies for select to authenticated
using (public.is_job_participant(job_id));
create policy claims_participant on public.insurance_claims for all to authenticated
using (filed_by = auth.uid() or exists (select 1 from public.insurance_policies p where p.id = policy_id and public.is_job_participant(p.job_id)))
with check (filed_by = auth.uid());
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
