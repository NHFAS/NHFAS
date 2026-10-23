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
  email text,
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

-- Admin dashboard needs each user's email; profiles created before this
-- column existed are backfilled from auth.users below.
alter table public.profiles add column if not exists email text;
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email and u.email is not null;

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

-- Last known live location for provider discovery ("Find Me" toggle and,
-- later, real-time GPS tracking of active jobs — SRS FR-04).
alter table public.provider_profiles add column if not exists last_latitude numeric(9,6);
alter table public.provider_profiles add column if not exists last_longitude numeric(9,6);
alter table public.provider_profiles add column if not exists last_location_at timestamptz;

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
  availability_status text not null default 'available' check (availability_status in ('available', 'unavailable')),
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

alter table public.jobs
  add column if not exists availability_status text not null default 'available'
    check (availability_status in ('available', 'unavailable'));

create index if not exists jobs_client_idx on public.jobs (client_id, created_at desc);
create index if not exists jobs_status_idx on public.jobs (status, created_at desc);
create index if not exists jobs_availability_idx on public.jobs (availability_status, status);
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
  new_role public.user_role;
begin
  new_role := case
    when new.raw_user_meta_data ->> 'role' = 'service_provider' then 'service_provider'::public.user_role
    else 'client'::public.user_role
  end;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'NHFAS user'), '@', 1)),
    new.email,
    new.phone,
    new_role
  );

  if new_role = 'service_provider' then
    insert into public.provider_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.provider_profiles (user_id)
select id from public.profiles where role = 'service_provider'
on conflict (user_id) do nothing;

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
select public.drop_policy_if_exists('messages', 'messages_insert_member');
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
select public.drop_policy_if_exists('safety_incidents', 'safety_incidents_admin_update');
select public.drop_policy_if_exists('job_status_history', 'job_history_insert_participant');
select public.drop_policy_if_exists('messages', 'messages_insert_member');
select public.drop_policy_if_exists('payout_accounts', 'payout_accounts_manage_owner');

-- Security-definer membership checks avoid recursive RLS evaluation when a
-- policy needs to inspect organization_members itself.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_manager(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.member_role in ('owner', 'manager')
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_manager(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_manager(uuid) to authenticated;

-- Membership checks used by chat policies must not re-enter conversation_members RLS.
create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.conversation_members m
    where m.conversation_id = target_conversation_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- Administrator check used by moderation policies below. Defined before the
-- policy block so a fresh database can create jobs_select_participant
-- (which references it) without hitting a missing-function error.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_members_select on public.organizations for select to authenticated
using (created_by = auth.uid() or public.is_organization_member(organizations.id));
create policy organizations_insert_own on public.organizations for insert to authenticated
with check (created_by = auth.uid());

create policy organization_members_select on public.organization_members for select to authenticated
using (user_id = auth.uid() or public.is_organization_member(organization_members.organization_id));
create policy organization_members_insert_manager on public.organization_members for insert to authenticated
with check (public.is_organization_manager(organization_members.organization_id));

create policy provider_profiles_public_select on public.provider_profiles for select to authenticated
using (is_searchable = true or user_id = auth.uid());
create policy provider_profiles_manage_own on public.provider_profiles for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vehicles_select_related on public.vehicles for select to authenticated
using (owner_id = auth.uid() or public.is_organization_member(vehicles.organization_id));
create policy vehicles_manage_owner on public.vehicles for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists jobs_select_participant on public.jobs;
create policy jobs_select_participant on public.jobs for select to authenticated
using (
  client_id = auth.uid() or provider_id = auth.uid() or operator_id = auth.uid()
  or public.is_organization_member(organization_id)
  or public.is_admin()
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
create policy job_history_insert_participant on public.job_status_history for insert to authenticated
with check (public.is_job_participant(job_id));

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
    or public.is_organization_member(v.organization_id))
  );
$$;

-- Admin review RPC used by the Verification Queue page. Deciding on a
-- verification keeps an immutable reviewer/audit trail and keeps the
-- provider's KYC status in sync with the identity decision.
create or replace function public.review_provider_verification(
  target_verification_id uuid,
  decision text,
  reviewer_notes text default null,
  document_expires_at timestamptz default null
)
returns public.provider_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.provider_verifications;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can review verifications';
  end if;

  update public.provider_verifications
     set status = decision,
         notes = reviewer_notes,
         expires_at = document_expires_at,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = target_verification_id
  returning * into result;

  if result.id is null then
    raise exception 'Verification record not found';
  end if;

  if result.verification_type = 'identity' then
    update public.provider_profiles
       set kyc_status = decision
     where user_id = result.provider_id;
  end if;

  return result;
end;
$$;

grant execute on function public.review_provider_verification(uuid, text, text, timestamptz) to authenticated;

create policy provider_verifications_owner on public.provider_verifications for all to authenticated
using (provider_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (provider_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy regulatory_permits_participant on public.regulatory_permits for all to authenticated
using (public.is_job_participant(job_id) or public.is_admin())
with check (public.is_job_participant(job_id) or public.is_admin());
create policy safety_incidents_participant on public.safety_incidents for select to authenticated
using (reporter_id = auth.uid() or public.is_job_participant(job_id) or public.is_admin());
create policy safety_incidents_insert_reporter on public.safety_incidents for insert to authenticated
with check (reporter_id = auth.uid());
create policy safety_incidents_admin_update on public.safety_incidents for update to authenticated
using (public.is_admin()) with check (public.is_admin());
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
using (public.is_conversation_member(conversations.id));
create policy conversation_members_member on public.conversation_members for select to authenticated
using (user_id = auth.uid() or public.is_conversation_member(conversation_members.conversation_id));
create policy messages_member on public.messages for select to authenticated
using (public.is_conversation_member(messages.conversation_id));
create policy messages_insert_member on public.messages for insert to authenticated
with check (sender_id = auth.uid() and public.is_conversation_member(messages.conversation_id));
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

-- ---------------------------------------------------------------------
-- Admin dashboard oversight: admins read every operational table and
-- moderate the records listed in the second block below. Dropped first
-- so the whole section stays idempotent on re-runs.
-- ---------------------------------------------------------------------
select public.drop_policy_if_exists('organizations', 'organizations_admin_select');
create policy organizations_admin_select on public.organizations for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('organization_members', 'organization_members_admin_select');
create policy organization_members_admin_select on public.organization_members for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('provider_profiles', 'provider_profiles_admin_select');
create policy provider_profiles_admin_select on public.provider_profiles for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('vehicles', 'vehicles_admin_select');
create policy vehicles_admin_select on public.vehicles for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('job_stops', 'job_stops_admin_select');
create policy job_stops_admin_select on public.job_stops for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('dispatch_offers', 'dispatch_offers_admin_select');
create policy dispatch_offers_admin_select on public.dispatch_offers for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('job_status_history', 'job_status_history_admin_select');
create policy job_status_history_admin_select on public.job_status_history for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('cargo_specifications', 'cargo_specifications_admin_select');
create policy cargo_specifications_admin_select on public.cargo_specifications for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('payments', 'payments_admin_select');
create policy payments_admin_select on public.payments for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('ratings', 'ratings_admin_select');
create policy ratings_admin_select on public.ratings for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('auction_bids', 'auction_bids_admin_select');
create policy auction_bids_admin_select on public.auction_bids for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('job_quotes', 'job_quotes_admin_select');
create policy job_quotes_admin_select on public.job_quotes for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('job_tracking_points', 'job_tracking_points_admin_select');
create policy job_tracking_points_admin_select on public.job_tracking_points for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('route_plans', 'route_plans_admin_select');
create policy route_plans_admin_select on public.route_plans for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('vehicle_maintenance_records', 'vehicle_maintenance_records_admin_select');
create policy vehicle_maintenance_records_admin_select on public.vehicle_maintenance_records for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('telematics_events', 'telematics_events_admin_select');
create policy telematics_events_admin_select on public.telematics_events for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('cost_estimates', 'cost_estimates_admin_select');
create policy cost_estimates_admin_select on public.cost_estimates for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('cost_estimate_items', 'cost_estimate_items_admin_select');
create policy cost_estimate_items_admin_select on public.cost_estimate_items for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('escrow_accounts', 'escrow_accounts_admin_select');
create policy escrow_accounts_admin_select on public.escrow_accounts for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('escrow_milestones', 'escrow_milestones_admin_select');
create policy escrow_milestones_admin_select on public.escrow_milestones for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('escrow_releases', 'escrow_releases_admin_select');
create policy escrow_releases_admin_select on public.escrow_releases for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('conversations', 'conversations_admin_select');
create policy conversations_admin_select on public.conversations for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('conversation_members', 'conversation_members_admin_select');
create policy conversation_members_admin_select on public.conversation_members for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('messages', 'messages_admin_select');
create policy messages_admin_select on public.messages for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('insurance_policies', 'insurance_policies_admin_select');
create policy insurance_policies_admin_select on public.insurance_policies for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('sustainability_records', 'sustainability_records_admin_select');
create policy sustainability_records_admin_select on public.sustainability_records for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('apprenticeship_enrollments', 'apprenticeship_enrollments_admin_select');
create policy apprenticeship_enrollments_admin_select on public.apprenticeship_enrollments for select to authenticated using (public.is_admin());
-- Records admins can also change: disputes, claims, payouts, financing,
-- credentials, organizations, payout accounts, maintenance and auctions.
select public.drop_policy_if_exists('organizations', 'organizations_admin_update');
create policy organizations_admin_update on public.organizations for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('disputes', 'disputes_admin_select');
create policy disputes_admin_select on public.disputes for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('disputes', 'disputes_admin_update');
create policy disputes_admin_update on public.disputes for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('insurance_claims', 'insurance_claims_admin_select');
create policy insurance_claims_admin_select on public.insurance_claims for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('insurance_claims', 'insurance_claims_admin_update');
create policy insurance_claims_admin_update on public.insurance_claims for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('payout_accounts', 'payout_accounts_admin_select');
create policy payout_accounts_admin_select on public.payout_accounts for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('payout_accounts', 'payout_accounts_admin_update');
create policy payout_accounts_admin_update on public.payout_accounts for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('payouts', 'payouts_admin_select');
create policy payouts_admin_select on public.payouts for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('payouts', 'payouts_admin_update');
create policy payouts_admin_update on public.payouts for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('financing_requests', 'financing_requests_admin_select');
create policy financing_requests_admin_select on public.financing_requests for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('financing_requests', 'financing_requests_admin_update');
create policy financing_requests_admin_update on public.financing_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('digital_certificates', 'digital_certificates_admin_select');
create policy digital_certificates_admin_select on public.digital_certificates for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('digital_certificates', 'digital_certificates_admin_update');
create policy digital_certificates_admin_update on public.digital_certificates for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('skill_certifications', 'skill_certifications_admin_select');
create policy skill_certifications_admin_select on public.skill_certifications for select to authenticated using (public.is_admin());
select public.drop_policy_if_exists('skill_certifications', 'skill_certifications_admin_update');
create policy skill_certifications_admin_update on public.skill_certifications for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('vehicle_maintenance_records', 'vehicle_maintenance_records_admin_update');
create policy vehicle_maintenance_records_admin_update on public.vehicle_maintenance_records for update to authenticated
using (public.is_admin()) with check (public.is_admin());
select public.drop_policy_if_exists('auction_listings', 'auction_listings_admin_update');
create policy auction_listings_admin_update on public.auction_listings for update to authenticated
using (public.is_admin()) with check (public.is_admin());

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

-- Verification document storage (Fayda ID photos, provider licenses).
insert into storage.buckets (id, name, public)
values ('provider-verification', 'provider-verification', false)
on conflict (id) do nothing;

drop policy if exists provider_verification_upload on storage.objects;
drop policy if exists provider_verification_select on storage.objects;

create policy provider_verification_upload on storage.objects
for insert to authenticated
with check (bucket_id = 'provider-verification' and owner = auth.uid());

create policy provider_verification_select on storage.objects
for select to authenticated
using (
  bucket_id = 'provider-verification'
  and (owner = auth.uid() or public.is_admin())
);

-- Job documents (transport permits, proof-of-work photos — SRS FR-13 / FR-22).
insert into storage.buckets (id, name, public)
values ('job-documents', 'job-documents', false)
on conflict (id) do nothing;

drop policy if exists job_documents_upload on storage.objects;
drop policy if exists job_documents_select on storage.objects;

create policy job_documents_upload on storage.objects
for insert to authenticated
with check (bucket_id = 'job-documents' and owner = auth.uid());

create policy job_documents_select on storage.objects
for select to authenticated
using (
  bucket_id = 'job-documents'
  and (owner = auth.uid() or public.is_admin())
);

-- ---------------------------------------------------------------------
-- Job lifecycle helpers
-- ---------------------------------------------------------------------
-- Providers claim an open job. security definer so a candidate provider
-- (not yet a participant, so RLS would block the UPDATE) can be assigned,
-- while still enforcing that the job is open and not their own request.
create or replace function public.accept_job(target_job_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
  previous_status public.job_status;
  result public.jobs;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('service_provider', 'heavy_operator') then
    raise exception 'Only service providers can accept jobs';
  end if;

  select status into previous_status
  from public.jobs where id = target_job_id for update;

  if previous_status is null then
    raise exception 'Job not found';
  end if;

  update public.jobs
     set provider_id = auth.uid(),
         status = 'confirmed',
        availability_status = 'unavailable'
   where id = target_job_id
     and provider_id is null
     and status in ('posted', 'matching')
     and client_id <> auth.uid()
      and availability_status = 'available'
  returning * into result;

  if result.id is null then
    raise exception 'This job is no longer available';
  end if;

  insert into public.job_status_history (job_id, from_status, to_status, changed_by, reason)
  values (result.id, previous_status, 'confirmed', auth.uid(), 'Provider accepted the job');

  insert into public.notifications (user_id, title, body, notification_type, data)
  values (
    result.client_id,
    'Job accepted',
    'A provider accepted your job: ' || result.title,
    'in_app',
    jsonb_build_object('job_id', result.id, 'status', 'confirmed')
  );

  return result;
end;
$$;

grant execute on function public.accept_job(uuid) to authenticated;

-- SRS FR-22: a haulage job cannot go en route without an approved,
-- unexpired transport permit on file for the job.
create or replace function public.enforce_haulage_permit()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.job_type = 'haulage' and new.status = 'en_route' and old.status is distinct from 'en_route' then
    if not exists (
      select 1 from public.regulatory_permits p
      where p.job_id = new.id
        and p.status = 'approved'
        and (p.valid_until is null or p.valid_until >= now())
    ) then
      raise exception 'A haulage job cannot go en route until an approved transport permit is on file.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_haulage_permit_gate on public.jobs;
create trigger jobs_haulage_permit_gate
before update of status on public.jobs
for each row execute function public.enforce_haulage_permit();

-- ---------------------------------------------------------------------
-- Escrow, disputes and job chat (SRS FR-06 / FR-10)
-- ---------------------------------------------------------------------
-- Mobile-money partner APIs (Telebirr/M-Pesa) are not yet available, so
-- funding is recorded through a demo wallet provider. Swap the provider
-- name and insert path for the real webhook-driven flow later.
create or replace function public.fund_job_escrow(target_job_id uuid, amount numeric)
returns public.escrow_accounts
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  result public.escrow_accounts;
begin
  if amount is null or amount <= 0 then
    raise exception 'Enter a funding amount greater than zero';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if job_row.client_id <> auth.uid() then raise exception 'Only the client can fund this job'; end if;
  if job_row.provider_id is null then
    raise exception 'Wait until a provider accepts the job before funding escrow';
  end if;
  if job_row.status not in ('confirmed', 'en_route', 'in_progress') then
    raise exception 'Escrow can only be funded while work is active';
  end if;
  if exists (select 1 from public.escrow_accounts e where e.job_id = target_job_id and e.status <> 'pending') then
    raise exception 'Escrow for this job is already funded';
  end if;

  insert into public.payments (job_id, payer_id, payee_id, amount, status, provider, provider_reference, idempotency_key)
  values (target_job_id, job_row.client_id, job_row.provider_id, amount, 'succeeded', 'demo_wallet',
          gen_random_uuid()::text, gen_random_uuid()::text);

  insert into public.escrow_accounts (job_id, payer_id, payee_id, funded_amount, status)
  values (target_job_id, job_row.client_id, job_row.provider_id, amount, 'funded')
  on conflict (job_id) do update
    set payee_id = excluded.payee_id,
        funded_amount = excluded.funded_amount,
        status = 'funded'
  returning * into result;

  insert into public.notifications (user_id, title, body, data)
  values (job_row.provider_id, 'Escrow funded',
          'The client funded escrow for job #' || job_row.job_number,
          jsonb_build_object('job_id', target_job_id));
  return result;
end;
$$;

grant execute on function public.fund_job_escrow(uuid, numeric) to authenticated;

create or replace function public.release_job_escrow(target_job_id uuid)
returns public.escrow_accounts
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  result public.escrow_accounts;
begin
  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if job_row.client_id <> auth.uid() then raise exception 'Only the client can release payment'; end if;
  if job_row.status <> 'completed' then raise exception 'Payment can only be released after the job is completed'; end if;

  update public.escrow_accounts
     set released_amount = funded_amount,
         status = 'released'
   where job_id = target_job_id
     and status in ('funded', 'partially_released')
     and funded_amount > 0
  returning * into result;

  if result.id is null then raise exception 'No funded escrow found for this job'; end if;

  insert into public.notifications (user_id, title, body, data)
  values (job_row.provider_id, 'Payment released',
          'Escrow payment released for job #' || job_row.job_number,
          jsonb_build_object('job_id', target_job_id));
  return result;
end;
$$;

grant execute on function public.release_job_escrow(uuid) to authenticated;

-- Disputes freeze the job and any unfunded/released-pending escrow (FR-10).
create or replace function public.open_job_dispute(target_job_id uuid, dispute_reason text)
returns public.disputes
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  other_user uuid;
  result public.disputes;
begin
  if dispute_reason is null or length(trim(dispute_reason)) < 5 then
    raise exception 'Describe the issue in at least a few words';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if auth.uid() is distinct from job_row.client_id
     and auth.uid() is distinct from job_row.provider_id
     and auth.uid() is distinct from job_row.operator_id then
    raise exception 'Only job participants can open a dispute';
  end if;
  if job_row.status in ('cancelled', 'disputed') then
    raise exception 'This job cannot be disputed';
  end if;

  insert into public.disputes (job_id, opened_by, reason)
  values (target_job_id, auth.uid(), trim(dispute_reason))
  returning * into result;

  update public.jobs set status = 'disputed' where id = target_job_id;
  update public.escrow_accounts
     set status = 'disputed'
   where job_id = target_job_id
     and status in ('pending', 'funded', 'partially_released');

  other_user := case when job_row.client_id = auth.uid() then job_row.provider_id else job_row.client_id end;
  if other_user is not null then
    insert into public.notifications (user_id, title, body, data)
    values (other_user, 'Dispute opened',
            'A dispute was opened on job #' || job_row.job_number,
            jsonb_build_object('job_id', target_job_id));
  end if;

  return result;
end;
$$;

grant execute on function public.open_job_dispute(uuid, text) to authenticated;

-- One chat room per job for its participants (FR-10). Creates the
-- conversation and membership rows idempotently and returns the id.
create or replace function public.ensure_job_conversation(target_job_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  convo_id uuid;
begin
  select * into job_row from public.jobs where id = target_job_id;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if auth.uid() is distinct from job_row.client_id
     and auth.uid() is distinct from job_row.provider_id
     and auth.uid() is distinct from job_row.operator_id then
    raise exception 'Only job participants can use the job chat';
  end if;

  select id into convo_id from public.conversations where job_id = target_job_id;
  if convo_id is null then
    insert into public.conversations (job_id, created_by)
    values (target_job_id, coalesce(job_row.client_id, auth.uid()))
    returning id into convo_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (convo_id, job_row.client_id) on conflict do nothing;
  if job_row.provider_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (convo_id, job_row.provider_id) on conflict do nothing;
  end if;
  if job_row.operator_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (convo_id, job_row.operator_id) on conflict do nothing;
  end if;

  return convo_id;
end;
$$;

grant execute on function public.ensure_job_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- SRS FR-13: Milestone escrow for custom builds.
-- Multi-stage payment tranche release with proof-of-work capture.
-- ---------------------------------------------------------------------
create or replace function public.create_escrow_milestone(
  target_escrow_id uuid,
  milestone_title text,
  milestone_amount numeric(14,2),
  milestone_sequence integer,
  milestone_description text default null,
  milestone_due_at timestamptz default null
)
returns public.escrow_milestones
language plpgsql
security definer
set search_path = public
as $$
declare
  escrow_row public.escrow_accounts;
  result public.escrow_milestones;
begin
  select * into escrow_row from public.escrow_accounts where id = target_escrow_id for update;
  if escrow_row.id is null then raise exception 'Escrow account not found'; end if;
  if auth.uid() is distinct from escrow_row.payer_id then
    raise exception 'Only the client who funded escrow can create milestones';
  end if;
  if escrow_row.status <> 'funded' then
    raise exception 'Escrow must be funded before creating milestones';
  end if;

  insert into public.escrow_milestones (escrow_id, title, description, amount, sequence_number, due_at, status)
  values (target_escrow_id, milestone_title, milestone_description, milestone_amount, milestone_sequence, milestone_due_at, 'pending')
  returning * into result;

  return result;
end;
$$;

grant execute on function public.create_escrow_milestone(uuid, text, numeric, integer, text, timestamptz) to authenticated;

create or replace function public.submit_milestone_proof(
  target_milestone_id uuid,
  proof_document_url text,
  proof_description text default null
)
returns public.escrow_milestones
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.escrow_milestones;
  escrow_row public.escrow_accounts;
  result public.escrow_milestones;
begin
  select * into milestone_row from public.escrow_milestones where id = target_milestone_id for update;
  if milestone_row.id is null then raise exception 'Milestone not found'; end if;

  select * into escrow_row from public.escrow_accounts where id = milestone_row.escrow_id;
  if auth.uid() is distinct from escrow_row.payee_id then
    raise exception 'Only the assigned provider can submit proof of work';
  end if;
  if milestone_row.status <> 'pending' then
    raise exception 'Milestone is not in pending status';
  end if;

  update public.escrow_milestones
     set status = 'submitted',
         completed_at = now()
   where id = target_milestone_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.submit_milestone_proof(uuid, text, text) to authenticated;

create or replace function public.approve_milestone(
  target_milestone_id uuid
)
returns public.escrow_milestones
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.escrow_milestones;
  escrow_row public.escrow_accounts;
  result public.escrow_milestones;
begin
  select * into milestone_row from public.escrow_milestones where id = target_milestone_id for update;
  if milestone_row.id is null then raise exception 'Milestone not found'; end if;

  select * into escrow_row from public.escrow_accounts where id = milestone_row.escrow_id;
  if auth.uid() is distinct from escrow_row.payer_id then
    raise exception 'Only the client can approve milestones';
  end if;
  if milestone_row.status <> 'submitted' then
    raise exception 'Milestone has not been submitted for review';
  end if;

  update public.escrow_milestones
     set status = 'approved'
   where id = target_milestone_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.approve_milestone(uuid) to authenticated;

create or replace function public.release_milestone_payment(
  target_milestone_id uuid
)
returns public.escrow_releases
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.escrow_milestones;
  escrow_row public.escrow_accounts;
  release_result public.escrow_releases;
begin
  select * into milestone_row from public.escrow_milestones where id = target_milestone_id for update;
  if milestone_row.id is null then raise exception 'Milestone not found'; end if;

  select * into escrow_row from public.escrow_accounts where id = milestone_row.escrow_id;
  if auth.uid() is distinct from escrow_row.payer_id then
    raise exception 'Only the client can release milestone payments';
  end if;
  if milestone_row.status <> 'approved' then
    raise exception 'Milestone must be approved before payment release';
  end if;
  if escrow_row.funded_amount - escrow_row.released_amount < milestone_row.amount then
    raise exception 'Insufficient escrow funds for this milestone';
  end if;

  insert into public.escrow_releases (milestone_id, amount, released_by)
  values (target_milestone_id, milestone_row.amount, auth.uid())
  returning * into release_result;

  update public.escrow_milestones
     set status = 'released'
   where id = target_milestone_id;

  update public.escrow_accounts
     set released_amount = released_amount + milestone_row.amount,
         status = case
           when released_amount + milestone_row.amount >= funded_amount then 'released'
           else 'partially_released'
         end
   where id = milestone_row.escrow_id;

  return release_result;
end;
$$;

grant execute on function public.release_milestone_payment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- SRS FR-05: Auction engine with anti-sniping (FR-14).
-- ---------------------------------------------------------------------
create or replace function public.place_auction_bid(
  target_auction_id uuid,
  bid_amount numeric,
  bidder_full_name text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_bid_id uuid;
  current_max numeric;
  auction_row record;
  extension_seconds integer;
  now_ts timestamptz;
  fraud numeric;
begin
  now_ts := now();

  select * into auction_row
  from public.auction_listings
  where id = target_auction_id;

  if not found then
    raise exception 'Auction not found.';
  end if;

  if auction_row.status <> 'open' then
    raise exception 'Auction is not currently open.';
  end if;

  if now_ts < auction_row.starts_at then
    raise exception 'Auction has not started yet.';
  end if;

  if now_ts > auction_row.ends_at then
    update public.auction_listings
    set status = 'closed'
    where id = target_auction_id;
    raise exception 'Auction has already closed.';
  end if;

  select coalesce(max(amount), auction_row.starting_price) into current_max
  from public.auction_bids
  where auction_id = target_auction_id and status in ('active','winning');

  if bid_amount <= current_max then
    raise exception 'Bid must be higher than current price of %.', current_max;
  end if;

  -- Fraud heuristic: unusually high first bid relative to starting price
  fraud := least(1.0, greatest(0.0, (bid_amount - current_max) / nullif(current_max, 0)));

  insert into public.auction_bids (auction_id, bidder_id, amount, fraud_score, status)
  values (target_auction_id, auth.uid(), bid_amount, fraud, 'active')
  returning id into new_bid_id;

  -- Mark all previous active bids as outbid except the new one
  update public.auction_bids
  set status = 'outbid'
  where auction_id = target_auction_id
    and id <> new_bid_id
    and status in ('active','winning');

  -- Mark the new bid as winning
  update public.auction_bids
  set status = 'winning'
  where id = new_bid_id;

  -- Anti-sniping: if bid placed in the final N seconds, extend by N seconds
  extension_seconds := auction_row.anti_sniping_seconds;
  if extension_seconds > 0 then
    if now_ts > auction_row.ends_at - (extension_seconds || ' seconds')::interval then
      update public.auction_listings
      set ends_at = auction_row.ends_at + (extension_seconds || ' seconds')::interval
      where id = target_auction_id;
    end if;
  end if;

  -- Notify seller and previous winning bidder via notifications table
  insert into public.notifications (user_id, title, body, notification_type, data)
  values (
    auction_row.seller_id,
    'New bid on your auction',
    format('A new bid of %s was placed on %s.', bid_amount, auction_row.title),
    'in_app',
    jsonb_build_object('related_id', target_auction_id, 'type', 'auction_bid')
  );

  return new_bid_id;
end;
$$;

grant execute on function public.place_auction_bid(uuid, numeric, text) to authenticated;

create or replace function public.close_auction(target_auction_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auction_row record;
  winning_bid record;
begin
  select * into auction_row
  from public.auction_listings
  where id = target_auction_id;

  if not found then
    raise exception 'Auction not found.';
  end if;

  if not public.is_admin() then
    raise exception 'Only administrators can close auctions.';
  end if;

  update public.auction_listings
  set status = 'closed'
  where id = target_auction_id;

  select * into winning_bid
  from public.auction_bids
  where auction_id = target_auction_id and status = 'winning'
  order by amount desc, created_at desc
  limit 1;

  if found then
    insert into public.notifications (user_id, title, body, notification_type, data)
    values (
      winning_bid.bidder_id,
      'You won the auction!',
      format('Your bid of %s on %s was the winning bid.', winning_bid.amount, auction_row.title),
      'in_app',
      jsonb_build_object('related_id', target_auction_id, 'type', 'auction_won')
    );
  end if;
end;
$$;

grant execute on function public.close_auction(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- SRS FR-01: Admin user management.
-- ---------------------------------------------------------------------
create or replace function public.ban_user(target_user_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'Only administrators can ban users.';
  end if;

  update public.profiles
  set status = 'suspended', updated_at = now()
  where id = target_user_id;
end;
$$;
grant execute on function public.ban_user(uuid) to authenticated;

create or replace function public.unban_user(target_user_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'Only administrators can unban users.';
  end if;

  update public.profiles
  set status = 'active', updated_at = now()
  where id = target_user_id;
end;
$$;
grant execute on function public.unban_user(uuid) to authenticated;

create or replace function public.update_user_role(target_user_id uuid, new_role public.user_role) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'Only administrators can change user roles.';
  end if;

  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;
grant execute on function public.update_user_role(uuid, public.user_role) to authenticated;

create or replace function public.delete_user(target_user_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'Only administrators can delete users.';
  end if;

  -- Prevent admins from deleting themselves
  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;

  -- Delete from profiles (auth.users cascade deletes profile, but we delete profile first
  -- to remove the link; auth user remains until explicitly removed via service role)
  delete from public.profiles where id = target_user_id;
end;
$$;
grant execute on function public.delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- SRS FR-11: AI Job Cost Estimator.
-- ---------------------------------------------------------------------
create or replace function public.create_cost_estimate(
  target_job_id uuid,
  labor_cost_amount numeric default 0,
  materials_cost_amount numeric default 0,
  transport_cost_amount numeric default 0,
  estimate_inputs jsonb default '{}'::jsonb
)
returns public.cost_estimates
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.jobs;
  result public.cost_estimates;
begin
  select * into job_row from public.jobs where id = target_job_id;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if auth.uid() is distinct from job_row.client_id then
    raise exception 'Only the client can request a cost estimate';
  end if;

  insert into public.cost_estimates (job_id, requested_by, labor_cost, materials_cost, transport_cost, inputs)
  values (target_job_id, auth.uid(), labor_cost_amount, materials_cost_amount, transport_cost_amount, estimate_inputs)
  returning * into result;

  return result;
end;
$$;

grant execute on function public.create_cost_estimate(uuid, numeric, numeric, numeric, jsonb) to authenticated;
grant execute on function public.create_cost_estimate(uuid, numeric, numeric, numeric, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Additive RPCs (FR-13 milestone rejection, FR-19 surge/fair-price log).
-- Pure additions — no existing tables or policies are modified.
-- ---------------------------------------------------------------------

-- Client rejects a submitted milestone. escrow_milestones has no UPDATE
-- policy for participants, so rejection goes through this definer RPC,
-- mirroring approve_milestone. The reason is delivered to the provider
-- as a notification (the table has no rejection_reason column).
create or replace function public.reject_milestone(
  target_milestone_id uuid,
  reject_reason text default null
) returns public.escrow_milestones
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.escrow_milestones;
  escrow_row public.escrow_accounts;
  result public.escrow_milestones;
begin
  select * into milestone_row from public.escrow_milestones where id = target_milestone_id for update;
  if milestone_row.id is null then raise exception 'Milestone not found'; end if;

  select * into escrow_row from public.escrow_accounts where id = milestone_row.escrow_id;
  if auth.uid() is distinct from escrow_row.payer_id then
    raise exception 'Only the client can reject milestones';
  end if;
  if milestone_row.status <> 'submitted' then
    raise exception 'Only submitted milestones can be rejected';
  end if;

  update public.escrow_milestones
     set status = 'rejected'
   where id = target_milestone_id
  returning * into result;

  insert into public.notifications (user_id, title, body, notification_type, data)
  values (
    escrow_row.payee_id,
    'Milestone rejected',
    format('Milestone "%s" was rejected.%s', milestone_row.title,
      case when reject_reason is not null and length(trim(reject_reason)) > 0
           then ' Reason: ' || trim(reject_reason)
           else '' end),
    'in_app',
    jsonb_build_object('type', 'milestone_rejected', 'milestone_id', target_milestone_id)
  );

  return result;
end;
$$;

grant execute on function public.reject_milestone(uuid, text) to authenticated;

-- Records a surge/fair-price calculation so admin pricing analytics can
-- see how prices were framed to clients (pricing_snapshots has no INSERT
-- policy for clients, hence this definer function).
create or replace function public.log_pricing_snapshot(
  target_job_id uuid,
  target_category_id uuid,
  origin_area text,
  destination_area text,
  base_price numeric,
  surge_value numeric,
  fair_min numeric,
  fair_max numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  snap_id uuid;
begin
  if base_price is null or base_price < 0 then
    raise exception 'base_price must be zero or positive';
  end if;
  if surge_value is null or surge_value <= 0 or surge_value > 5 then
    raise exception 'surge_multiplier out of allowed bounds';
  end if;

  insert into public.pricing_snapshots
    (job_id, service_category_id, origin_area, destination_area,
     base_price, surge_multiplier, fair_price_min, fair_price_max)
  values
    (target_job_id, target_category_id, origin_area, destination_area,
     base_price, surge_value, fair_min, fair_max)
  returning id into snap_id;

  return snap_id;
end;
$$;

grant execute on function public.log_pricing_snapshot(uuid, uuid, text, text, numeric, numeric, numeric, numeric) to authenticated;


-- ---------------------------------------------------------------------
-- Additive RPCs for Phase 2 member flows (FR-17 insurance, FR-08 quote
-- acceptance, FR-23 payouts, FR-15 certificates, FR-20 telematics,
-- FR-26 emissions, FR-18 apprenticeship).
-- Pure additions — no existing tables or policies are modified. Each
-- exists because RLS on the target table intentionally has no client
-- INSERT/UPDATE policy (see comments on each function).
-- ---------------------------------------------------------------------

-- FR-17: insurance_policies is SELECT-only for participants (a partner
-- underwriting service will insert policies later), so the client asks
-- for a demo quote through this definer function.
create or replace function public.request_job_insurance(
  target_job_id uuid,
  coverage_amount numeric default null
) returns public.insurance_policies
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  result public.insurance_policies;
  coverage numeric;
  premium numeric;
begin
  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if auth.uid() is distinct from job_row.client_id and auth.uid() is distinct from job_row.provider_id then
    raise exception 'Only job participants can request insurance';
  end if;
  if exists (select 1 from public.insurance_policies where job_id = target_job_id) then
    raise exception 'This job already has an insurance policy';
  end if;

  coverage := coalesce(coverage_amount, job_row.agreed_price, 1000);
  if coverage <= 0 then coverage := 1000; end if;
  -- Demo premium rule: 3% of cover, minimum 50 ETB (partner API later).
  premium := greatest(50, round(coverage * 0.03, 2));

  insert into public.insurance_policies (job_id, provider, coverage_amount, premium, status)
  values (target_job_id, 'NHFAS Demo Insurer', coverage, premium, 'quoted')
  returning * into result;

  return result;
end;
$$;
grant execute on function public.request_job_insurance(uuid, numeric) to authenticated;


-- FR-08: job_quotes has "with check (provider_id = auth.uid())" so the
-- CLIENT cannot flip a quote to accepted — this definer RPC does the
-- accept atomically (quote accepted, rivals rejected, job assigned).
create or replace function public.accept_job_quote(target_quote_id uuid)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare
  quote_row public.job_quotes;
  job_row public.jobs;
  previous_status public.job_status;
  result public.jobs;
begin
  select * into quote_row from public.job_quotes where id = target_quote_id for update;
  if quote_row.id is null then raise exception 'Quote not found'; end if;
  if quote_row.status <> 'submitted' then raise exception 'This quote is no longer open for acceptance'; end if;

  select * into job_row from public.jobs where id = quote_row.job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if auth.uid() is distinct from job_row.client_id then
    raise exception 'Only the client can accept a quote';
  end if;
  if job_row.provider_id is not null then
    raise exception 'This job already has an assigned provider';
  end if;

  previous_status := job_row.status;

  update public.job_quotes set status = 'accepted' where id = target_quote_id;
  update public.job_quotes
     set status = 'rejected'
   where job_id = quote_row.job_id and id <> target_quote_id and status = 'submitted';

  update public.jobs
     set provider_id = quote_row.provider_id,
         agreed_price = quote_row.amount,
         status = 'confirmed',
         availability_status = 'unavailable'
   where id = quote_row.job_id
  returning * into result;

  insert into public.job_status_history (job_id, from_status, to_status, changed_by, reason)
  values (result.id, previous_status, 'confirmed', auth.uid(), 'Client accepted a quote');

  insert into public.notifications (user_id, title, body, notification_type, data)
  values (
    quote_row.provider_id,
    'Quote accepted',
    format('Your quote of %s ETB on "%s" was accepted. The job is now confirmed.', quote_row.amount, job_row.title),
    'in_app',
    jsonb_build_object('job_id', result.id, 'type', 'quote_accepted')
  );

  return result;
end;
$$;
grant execute on function public.accept_job_quote(uuid) to authenticated;

-- FR-23: payouts has no client INSERT policy (payment partner settles
-- rows later); providers request withdrawals through this definer RPC.
create or replace function public.request_payout(
  target_account_id uuid,
  amount numeric
) returns public.payouts
language plpgsql security definer set search_path = public
as $$
declare
  account_row public.payout_accounts;
  released_total numeric;
  pending_total numeric;
  available numeric;
  result public.payouts;
begin
  if amount is null or amount <= 0 then raise exception 'Enter an amount greater than zero'; end if;

  select * into account_row from public.payout_accounts where id = target_account_id;
  if account_row.id is null then raise exception 'Payout account not found'; end if;
  if account_row.user_id is distinct from auth.uid() then
    raise exception 'That payout account does not belong to you';
  end if;

  select coalesce(sum(released_amount), 0) into released_total
  from public.escrow_accounts where payee_id = auth.uid();
  select coalesce(sum(amount), 0) into pending_total
  from public.payouts where payee_id = auth.uid() and status in ('pending', 'processing');
  available := released_total - pending_total;

  if amount > available then
    raise exception 'Requested amount (%) exceeds available balance (%)', amount, available;
  end if;

  insert into public.payouts (payee_id, payout_account_id, amount, status)
  values (auth.uid(), target_account_id, amount, 'pending')
  returning * into result;

  return result;
end;
$$;
grant execute on function public.request_payout(uuid, numeric) to authenticated;


-- FR-15: digital_certificates is SELECT-only for the owner/admin, so a
-- completed job mints its certificate through this definer function.
-- The QR payload is a stable verification URL path.
create or replace function public.issue_job_certificate(
  target_job_id uuid,
  cert_type text default 'completion'
) returns public.digital_certificates
language plpgsql security definer set search_path = public
as $$
declare
  job_row public.jobs;
  existing public.digital_certificates;
  new_number text;
  payload text;
  result public.digital_certificates;
begin
  if cert_type not in ('authenticity', 'completion') then
    raise exception 'Members can issue authenticity or completion certificates';
  end if;

  select * into job_row from public.jobs where id = target_job_id for update;
  if job_row.id is null then raise exception 'Job not found'; end if;
  if not public.is_job_participant(target_job_id) then
    raise exception 'Only job participants can issue certificates';
  end if;
  if cert_type = 'completion' and job_row.status <> 'completed' then
    raise exception 'Completion certificates require a completed job';
  end if;

  select * into existing
  from public.digital_certificates
  where job_id = target_job_id and owner_id = auth.uid() and certificate_type = cert_type
    and revoked_at is null;
  if existing.id is not null then
    return existing;
  end if;

  new_number := 'NHFC-' || to_char(now(), 'YYYY') || '-' ||
                upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
  payload := jsonb_build_object(
    'certificate_number', new_number,
    'job_number', job_row.job_number,
    'type', cert_type
  )::text;

  insert into public.digital_certificates (job_id, owner_id, certificate_type, certificate_number, qr_payload)
  values (target_job_id, auth.uid(), cert_type, new_number, payload)
  returning * into result;

  return result;
end;
$$;
grant execute on function public.issue_job_certificate(uuid, text) to authenticated;

-- FR-15 public verification: anyone holding the QR code can check the
-- certificate number without an account (granted to anon as well).
create or replace function public.verify_certificate(target_certificate_number text)
returns table (
  certificate_id uuid,
  cert_number text,
  cert_type text,
  issued_at timestamptz,
  revoked_at timestamptz,
  job_number bigint,
  owner_name text
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select c.id, c.certificate_number, c.certificate_type, c.issued_at, c.revoked_at,
         j.job_number, p.full_name
  from public.digital_certificates c
  left join public.jobs j on j.id = c.job_id
  left join public.profiles p on p.id = c.owner_id
  where c.certificate_number = upper(trim(target_certificate_number));
end;
$$;
grant execute on function public.verify_certificate(text) to anon;
grant execute on function public.verify_certificate(text) to authenticated;

-- FR-20: telematics_events has no client INSERT (events stream in from
-- OBD dongles later); owners upload manual readings through this RPC.
create or replace function public.log_telematics_event(
  target_vehicle_id uuid,
  event_type text,
  payload jsonb default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  new_id bigint;
begin
  if not public.is_vehicle_owner(target_vehicle_id) and not public.is_admin() then
    raise exception 'Only the vehicle owner can log telematics events';
  end if;
  if event_type is null or length(trim(event_type)) < 2 then
    raise exception 'Event type is required';
  end if;

  insert into public.telematics_events (vehicle_id, event_type, payload)
  values (target_vehicle_id, trim(event_type), coalesce(payload, '{}'::jsonb))
  returning id into new_id;

  -- Maintenance-class events flag the vehicle until serviced.
  if event_type in ('maintenance_due', 'fault_code', 'inspection_failed') then
    update public.vehicles set maintenance_blocked = true where id = target_vehicle_id;
  end if;
  if event_type in ('service_completed', 'inspection_passed') then
    update public.vehicles set maintenance_blocked = false where id = target_vehicle_id;
  end if;

  return new_id;
end;
$$;
grant execute on function public.log_telematics_event(uuid, text, jsonb) to authenticated;


-- FR-26: sustainability_records is SELECT-only for participants, so
-- emissions are logged through this definer function. CO2e uses the
-- fuel-litre factor (2.31 kg CO2e per litre of diesel) by default.
create or replace function public.log_sustainability_record(
  target_job_id uuid,
  distance_km numeric,
  fuel_litres numeric,
  calculation_method text default 'fuel_litre_diesel_2.31'
) returns public.sustainability_records
language plpgsql security definer set search_path = public
as $$
declare
  co2e numeric;
  result public.sustainability_records;
begin
  if distance_km is null or distance_km < 0 or fuel_litres is null or fuel_litres < 0 then
    raise exception 'Distance and fuel must be zero or positive';
  end if;
  if not public.is_job_participant(target_job_id) and not public.is_admin() then
    raise exception 'Only job participants can log emissions';
  end if;

  co2e := round(fuel_litres * 2.31, 2);

  insert into public.sustainability_records (job_id, distance_km, fuel_litres, co2e_kg, calculation_method)
  values (target_job_id, distance_km, fuel_litres, co2e, calculation_method)
  returning * into result;

  return result;
end;
$$;
grant execute on function public.log_sustainability_record(uuid, numeric, numeric, text) to authenticated;

-- FR-18: apprenticeship_enrollments is SELECT-only for members, so
-- enrollment and progress transitions run through these definer RPCs.
create or replace function public.enroll_apprenticeship(
  skill_name text,
  mentor_id uuid default null
) returns public.apprenticeship_enrollments
language plpgsql security definer set search_path = public
as $$
declare
  result public.apprenticeship_enrollments;
begin
  if skill_name is null or length(trim(skill_name)) < 2 then
    raise exception 'Name the skill you want to learn';
  end if;
  if mentor_id is not null and not exists (
    select 1 from public.profiles where id = mentor_id and role in ('service_provider', 'heavy_operator', 'admin')
  ) then
    raise exception 'Mentor must be a registered provider';
  end if;
  if exists (
    select 1 from public.apprenticeship_enrollments
    where apprentice_id = auth.uid() and lower(skill_name) = lower(trim(enroll_apprenticeship.skill_name))
      and status = 'active'
  ) then
    raise exception 'You are already enrolled in this skill';
  end if;

  insert into public.apprenticeship_enrollments (apprentice_id, mentor_id, skill_name)
  values (auth.uid(), mentor_id, trim(skill_name))
  returning * into result;

  return result;
end;
$$;
grant execute on function public.enroll_apprenticeship(text, uuid) to authenticated;

create or replace function public.set_apprenticeship_status(
  target_id uuid,
  new_status text
) returns public.apprenticeship_enrollments
language plpgsql security definer set search_path = public
as $$
declare
  enrollment public.apprenticeship_enrollments;
  result public.apprenticeship_enrollments;
begin
  if new_status not in ('active', 'completed', 'withdrawn') then
    raise exception 'Invalid apprenticeship status';
  end if;

  select * into enrollment from public.apprenticeship_enrollments where id = target_id for update;
  if enrollment.id is null then raise exception 'Enrollment not found'; end if;
  if auth.uid() is distinct from enrollment.apprentice_id and auth.uid() is distinct from enrollment.mentor_id then
    raise exception 'Only the apprentice or mentor can update this enrollment';
  end if;

  update public.apprenticeship_enrollments
     set status = new_status,
         completed_at = case when new_status = 'completed' then current_date else null end
   where id = target_id
  returning * into result;

  return result;
end;
$$;
grant execute on function public.set_apprenticeship_status(uuid, text) to authenticated;

-- FR-17: insurance_claims has RLS allowing the filer to insert, but this
-- definer RPC validates the policy exists and the filer is a participant
-- before creating the claim record.
create or replace function public.file_insurance_claim(
  target_policy_id uuid,
  description text,
  claimed_amount numeric
) returns public.insurance_claims
language plpgsql security definer set search_path = public
as $$
declare
  policy_row public.insurance_policies;
  result public.insurance_claims;
begin
  select * into policy_row from public.insurance_policies where id = target_policy_id for update;
  if policy_row.id is null then raise exception 'Policy not found'; end if;
  if not public.is_job_participant(policy_row.job_id) then
    raise exception 'Only job participants can file claims on this policy';
  end if;
  if claimed_amount is null or claimed_amount <= 0 then
    raise exception 'Claimed amount must be positive';
  end if;

  insert into public.insurance_claims (policy_id, filed_by, description, claimed_amount)
  values (target_policy_id, auth.uid(), description, claimed_amount)
  returning * into result;

  return result;
end;
$$;
grant execute on function public.file_insurance_claim(uuid, text, numeric) to authenticated;

-- FR-23: financing_requests has no client INSERT policy, so providers
-- request micro-financing through this definer RPC.
create or replace function public.request_financing(
  amount numeric,
  purpose text,
  provider text default null
) returns public.financing_requests
language plpgsql security definer set search_path = public
as $$
declare
  result public.financing_requests;
begin
  if amount is null or amount <= 0 then
    raise exception 'Financing amount must be positive';
  end if;
  if purpose is null or length(trim(purpose)) < 3 then
    raise exception 'Please describe the purpose of the financing';
  end if;

  insert into public.financing_requests (applicant_id, amount, purpose, provider)
  values (auth.uid(), amount, trim(purpose), provider)
  returning * into result;

  return result;
end;
$$;
grant execute on function public.request_financing(numeric, text, text) to authenticated;

-- FR-16: Storage bucket for voice notes and message attachments
-- This bucket stores audio recordings sent via the chat feature
insert into storage.buckets (id, name, public)
values ('message_attachments', 'message_attachments', true);

-- Set up storage policy allowing authenticated users to upload voice notes
create or replace storage policy "Allow authenticated uploads to message_attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'message_attachments');

-- Allow public read access to voice note attachments
create or replace storage policy "Allow public read from message_attachments"
on storage.objects for select
using (bucket_id = 'message_attachments');

grant usage on storage schema to authenticated;
grant all on storage.buckets to authenticated;
grant all on storage.objects to authenticated;


