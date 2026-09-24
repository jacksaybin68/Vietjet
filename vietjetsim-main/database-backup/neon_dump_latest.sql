--
-- PostgreSQL database dump
--

\restrict GvqGkL4oVMH7zbcx4BQNaCwdrFb2DHR5Wc62hShSumrRIWnpwfFUsoA2rUShvhq

-- Dumped from database version 17.11 (8a81ecb)
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_payment_method_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_loyalty DROP CONSTRAINT IF EXISTS user_loyalty_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_loyalty DROP CONSTRAINT IF EXISTS user_loyalty_program_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_2fa DROP CONSTRAINT IF EXISTS user_2fa_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seats DROP CONSTRAINT IF EXISTS seats_flight_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seats DROP CONSTRAINT IF EXISTS seats_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.saved_payment_methods DROP CONSTRAINT IF EXISTS saved_payment_methods_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.refund_requests DROP CONSTRAINT IF EXISTS refund_requests_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.refund_requests DROP CONSTRAINT IF EXISTS refund_requests_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.passengers DROP CONSTRAINT IF EXISTS passengers_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_user_loyalty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_tiers DROP CONSTRAINT IF EXISTS loyalty_tiers_program_id_fkey;
ALTER TABLE IF EXISTS ONLY public.login_history DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.flights DROP CONSTRAINT IF EXISTS flights_to_code_fkey;
ALTER TABLE IF EXISTS ONLY public.flights DROP CONSTRAINT IF EXISTS flights_from_code_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS fk_bookings_discount_code;
ALTER TABLE IF EXISTS ONLY public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_agency_id_fkey;
ALTER TABLE IF EXISTS ONLY public.check_in DROP CONSTRAINT IF EXISTS check_in_seat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.check_in DROP CONSTRAINT IF EXISTS check_in_passenger_id_fkey;
ALTER TABLE IF EXISTS ONLY public.check_in DROP CONSTRAINT IF EXISTS check_in_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_presence DROP CONSTRAINT IF EXISTS chat_presence_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_flight_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.account_recovery DROP CONSTRAINT IF EXISTS account_recovery_user_id_fkey;
ALTER TABLE IF EXISTS ONLY neon_auth.session DROP CONSTRAINT IF EXISTS "session_userId_fkey";
ALTER TABLE IF EXISTS ONLY neon_auth.member DROP CONSTRAINT IF EXISTS "member_userId_fkey";
ALTER TABLE IF EXISTS ONLY neon_auth.member DROP CONSTRAINT IF EXISTS "member_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY neon_auth.invitation DROP CONSTRAINT IF EXISTS "invitation_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY neon_auth.invitation DROP CONSTRAINT IF EXISTS "invitation_inviterId_fkey";
ALTER TABLE IF EXISTS ONLY neon_auth.account DROP CONSTRAINT IF EXISTS "account_userId_fkey";
DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON public.discount_codes;
DROP TRIGGER IF EXISTS update_agencies_updated_at ON public.agencies;
DROP TRIGGER IF EXISTS trg_check_in_update ON public.check_in;
DROP INDEX IF EXISTS public.idx_wallets_user_id;
DROP INDEX IF EXISTS public.idx_wallets_account_number;
DROP INDEX IF EXISTS public.idx_wallet_transactions_wallet_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_created_at;
DROP INDEX IF EXISTS public.idx_user_profiles_phone;
DROP INDEX IF EXISTS public.idx_user_profiles_dob;
DROP INDEX IF EXISTS public.idx_user_loyalty_user_id;
DROP INDEX IF EXISTS public.idx_user_loyalty_program;
DROP INDEX IF EXISTS public.idx_sessions_user_id;
DROP INDEX IF EXISTS public.idx_sessions_expires;
DROP INDEX IF EXISTS public.idx_sessions_current;
DROP INDEX IF EXISTS public.idx_seats_check_in_status;
DROP INDEX IF EXISTS public.idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS public.idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS public.idx_refresh_tokens_family_id;
DROP INDEX IF EXISTS public.idx_recovery_token;
DROP INDEX IF EXISTS public.idx_payment_methods_user_id;
DROP INDEX IF EXISTS public.idx_payment_methods_active;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_loyalty_transactions_user_loyalty;
DROP INDEX IF EXISTS public.idx_loyalty_transactions_created_at;
DROP INDEX IF EXISTS public.idx_loyalty_tiers_program;
DROP INDEX IF EXISTS public.idx_loyalty_programs_active;
DROP INDEX IF EXISTS public.idx_login_history_user_id;
DROP INDEX IF EXISTS public.idx_login_history_created_at;
DROP INDEX IF EXISTS public.idx_flights_route_depart_time;
DROP INDEX IF EXISTS public.idx_discount_codes_dates;
DROP INDEX IF EXISTS public.idx_discount_codes_code;
DROP INDEX IF EXISTS public.idx_discount_codes_agency;
DROP INDEX IF EXISTS public.idx_discount_codes_active;
DROP INDEX IF EXISTS public.idx_check_in_status;
DROP INDEX IF EXISTS public.idx_check_in_passenger_id;
DROP INDEX IF EXISTS public.idx_check_in_check_in_number;
DROP INDEX IF EXISTS public.idx_check_in_booking_id;
DROP INDEX IF EXISTS public.idx_check_in_boarding_pass_number;
DROP INDEX IF EXISTS public.idx_chat_presence_conv_role;
DROP INDEX IF EXISTS public.idx_chat_messages_conversation;
DROP INDEX IF EXISTS public.idx_chat_conversations_user;
DROP INDEX IF EXISTS public.idx_chat_conversations_updated;
DROP INDEX IF EXISTS public.idx_bookings_booking_code;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_agencies_code;
DROP INDEX IF EXISTS public.idx_agencies_active;
DROP INDEX IF EXISTS public.idx_2fa_user_id;
DROP INDEX IF EXISTS neon_auth.verification_identifier_idx;
DROP INDEX IF EXISTS neon_auth."session_userId_idx";
DROP INDEX IF EXISTS neon_auth.organization_slug_uidx;
DROP INDEX IF EXISTS neon_auth."member_userId_idx";
DROP INDEX IF EXISTS neon_auth."member_organizationId_idx";
DROP INDEX IF EXISTS neon_auth."invitation_organizationId_idx";
DROP INDEX IF EXISTS neon_auth.invitation_email_idx;
DROP INDEX IF EXISTS neon_auth."account_userId_idx";
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_key;
ALTER TABLE IF EXISTS ONLY public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_account_number_key;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_phone_key;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_email_key;
ALTER TABLE IF EXISTS ONLY public.user_loyalty DROP CONSTRAINT IF EXISTS user_loyalty_user_id_key;
ALTER TABLE IF EXISTS ONLY public.user_loyalty DROP CONSTRAINT IF EXISTS user_loyalty_pkey;
ALTER TABLE IF EXISTS ONLY public.user_2fa DROP CONSTRAINT IF EXISTS user_2fa_user_id_key;
ALTER TABLE IF EXISTS ONLY public.user_2fa DROP CONSTRAINT IF EXISTS user_2fa_pkey;
ALTER TABLE IF EXISTS ONLY public.system_config DROP CONSTRAINT IF EXISTS system_config_pkey;
ALTER TABLE IF EXISTS ONLY public.system_config DROP CONSTRAINT IF EXISTS system_config_key_key;
ALTER TABLE IF EXISTS ONLY public.seats DROP CONSTRAINT IF EXISTS seats_pkey;
ALTER TABLE IF EXISTS ONLY public.saved_payment_methods DROP CONSTRAINT IF EXISTS saved_payment_methods_pkey;
ALTER TABLE IF EXISTS ONLY public.refund_requests DROP CONSTRAINT IF EXISTS refund_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_hash_key;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.passengers DROP CONSTRAINT IF EXISTS passengers_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_tiers DROP CONSTRAINT IF EXISTS loyalty_tiers_pkey;
ALTER TABLE IF EXISTS ONLY public.loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_pkey;
ALTER TABLE IF EXISTS ONLY public.login_history DROP CONSTRAINT IF EXISTS login_history_pkey;
ALTER TABLE IF EXISTS ONLY public.flights DROP CONSTRAINT IF EXISTS flights_pkey;
ALTER TABLE IF EXISTS ONLY public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_code_key;
ALTER TABLE IF EXISTS ONLY public.check_in DROP CONSTRAINT IF EXISTS check_in_pkey;
ALTER TABLE IF EXISTS ONLY public.check_in DROP CONSTRAINT IF EXISTS check_in_check_in_number_key;
ALTER TABLE IF EXISTS ONLY public.chat_presence DROP CONSTRAINT IF EXISTS chat_presence_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_presence DROP CONSTRAINT IF EXISTS chat_presence_conversation_id_role_key;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_code_key;
ALTER TABLE IF EXISTS ONLY public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_pkey;
ALTER TABLE IF EXISTS ONLY public.airports DROP CONSTRAINT IF EXISTS airports_pkey;
ALTER TABLE IF EXISTS ONLY public.airports DROP CONSTRAINT IF EXISTS airports_code_key;
ALTER TABLE IF EXISTS ONLY public.agencies DROP CONSTRAINT IF EXISTS agencies_pkey;
ALTER TABLE IF EXISTS ONLY public.agencies DROP CONSTRAINT IF EXISTS agencies_code_key;
ALTER TABLE IF EXISTS ONLY public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_user_id_key;
ALTER TABLE IF EXISTS ONLY public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.account_recovery DROP CONSTRAINT IF EXISTS account_recovery_token_key;
ALTER TABLE IF EXISTS ONLY public.account_recovery DROP CONSTRAINT IF EXISTS account_recovery_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.verification DROP CONSTRAINT IF EXISTS verification_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth."user" DROP CONSTRAINT IF EXISTS user_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth."user" DROP CONSTRAINT IF EXISTS user_email_key;
ALTER TABLE IF EXISTS ONLY neon_auth.session DROP CONSTRAINT IF EXISTS session_token_key;
ALTER TABLE IF EXISTS ONLY neon_auth.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.project_config DROP CONSTRAINT IF EXISTS project_config_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.project_config DROP CONSTRAINT IF EXISTS project_config_endpoint_id_key;
ALTER TABLE IF EXISTS ONLY neon_auth.organization DROP CONSTRAINT IF EXISTS organization_slug_key;
ALTER TABLE IF EXISTS ONLY neon_auth.organization DROP CONSTRAINT IF EXISTS organization_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.member DROP CONSTRAINT IF EXISTS member_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.jwks DROP CONSTRAINT IF EXISTS jwks_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.invitation DROP CONSTRAINT IF EXISTS invitation_pkey;
ALTER TABLE IF EXISTS ONLY neon_auth.account DROP CONSTRAINT IF EXISTS account_pkey;
ALTER TABLE IF EXISTS public.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.wallet_transactions;
DROP TABLE IF EXISTS public.user_wallets;
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.user_loyalty;
DROP TABLE IF EXISTS public.user_2fa;
DROP TABLE IF EXISTS public.system_config;
DROP TABLE IF EXISTS public.seats;
DROP TABLE IF EXISTS public.saved_payment_methods;
DROP TABLE IF EXISTS public.refund_requests;
DROP SEQUENCE IF EXISTS public.refresh_tokens_id_seq;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.passengers;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.loyalty_transactions;
DROP TABLE IF EXISTS public.loyalty_tiers;
DROP TABLE IF EXISTS public.loyalty_programs;
DROP TABLE IF EXISTS public.login_history;
DROP TABLE IF EXISTS public.flights;
DROP TABLE IF EXISTS public.discount_codes;
DROP TABLE IF EXISTS public.check_in;
DROP TABLE IF EXISTS public.chat_presence;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.chat_conversations;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.bank_accounts;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.airports;
DROP TABLE IF EXISTS public.agencies;
DROP TABLE IF EXISTS public.admin_roles;
DROP TABLE IF EXISTS public.account_recovery;
DROP TABLE IF EXISTS neon_auth.verification;
DROP TABLE IF EXISTS neon_auth."user";
DROP TABLE IF EXISTS neon_auth.session;
DROP TABLE IF EXISTS neon_auth.project_config;
DROP TABLE IF EXISTS neon_auth.organization;
DROP TABLE IF EXISTS neon_auth.member;
DROP TABLE IF EXISTS neon_auth.jwks;
DROP TABLE IF EXISTS neon_auth.invitation;
DROP TABLE IF EXISTS neon_auth.account;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_check_in_timestamp();
DROP FUNCTION IF EXISTS public.get_booking_check_in_status(booking_id_param uuid);
DROP FUNCTION IF EXISTS public.generate_check_in_number();
DROP FUNCTION IF EXISTS public.generate_booking_code();
DROP FUNCTION IF EXISTS public.generate_boarding_pass_number();
DROP FUNCTION IF EXISTS pgrst.pre_config();
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP SCHEMA IF EXISTS pgrst;
DROP SCHEMA IF EXISTS neon_auth;
DROP EXTENSION IF EXISTS pg_session_jwt;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_session_jwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_session_jwt WITH SCHEMA public;


--
-- Name: EXTENSION pg_session_jwt; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_session_jwt IS 'pg_session_jwt: manage authentication sessions using JWTs';


--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgrst;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: -
--

CREATE FUNCTION pgrst.pre_config() RETURNS void
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  SELECT
      set_config('pgrst.db_schemas', 'public', true)
    , set_config('pgrst.db_aggregates_enabled', 'true', true)
    , set_config('pgrst.db_anon_role', 'anonymous', true)
    , set_config('pgrst.jwt_role_claim_key', '.role', true)
$$;


--
-- Name: generate_boarding_pass_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_boarding_pass_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  prefix TEXT := 'BP';
  random_part TEXT;
  month_part TEXT;
BEGIN
  month_part := LPAD(TO_CHAR(CURRENT_DATE, 'MM'), 2, '0');
  random_part := LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0');
  RETURN prefix || month_part || random_part;
END;
$$;


--
-- Name: generate_booking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_booking_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
    DECLARE
      prefix TEXT := 'VJ';
      random_part TEXT;
      attempts INTEGER := 0;
      code TEXT;
      exists_check BOOLEAN;
    BEGIN
      LOOP
        random_part := LPAD(CAST(FLOOR(RANDOM() * 999999) AS TEXT), 6, '0');
        code := prefix || random_part;
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_code = code) INTO exists_check;
        
        IF NOT exists_check THEN
          RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 10 THEN
          -- Fallback: use longer code
          random_part := LPAD(CAST(FLOOR(RANDOM() * 99999999) AS TEXT), 8, '0');
          code := prefix || random_part;
          RETURN code;
        END IF;
      END LOOP;
    END;
    $$;


--
-- Name: generate_check_in_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_check_in_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  prefix TEXT := 'VJ';
  random_part TEXT;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YY');
  random_part := LPAD(CAST(FLOOR(RANDOM() * 999999) AS TEXT), 6, '0');
  RETURN prefix || year_part || random_part;
END;
$$;


--
-- Name: get_booking_check_in_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_booking_check_in_status(booking_id_param uuid) RETURNS TABLE(has_check_in boolean, check_in_id uuid, passenger_id uuid, passenger_name character varying, seat_number character varying, check_in_number character varying, boarding_pass_number character varying, status character varying, check_in_time timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM check_in WHERE booking_id = booking_id_param) AS has_check_in,
    c.id AS check_in_id,
    c.passenger_id,
    c.passenger_name,
    c.seat_number,
    c.check_in_number,
    c.boarding_pass_number,
    c.status,
    c.check_in_time
  FROM check_in c
  WHERE c.booking_id = booking_id_param
  ORDER BY c.check_in_time DESC
  LIMIT 1;
END;
$$;


--
-- Name: update_check_in_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_check_in_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.check_in_time := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: account_recovery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_recovery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    email character varying(255),
    token character varying(100) NOT NULL,
    token_expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    role_name character varying(50) NOT NULL,
    custom_permissions text,
    granted_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agencies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(255) NOT NULL,
    contact_name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(20),
    address text,
    commission_rate numeric(5,2) DEFAULT 0,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agencies_commission_rate_check CHECK (((commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric)))
);


--
-- Name: airports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.airports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    city character varying(100) NOT NULL,
    country character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    type character varying(20) DEFAULT 'info'::character varying,
    target_role character varying(50) DEFAULT 'all'::character varying,
    is_active boolean DEFAULT true,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT announcements_type_check CHECK (((type)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'promotion'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id text,
    admin_email character varying(255),
    action character varying(100),
    target_type character varying(50),
    target_id text,
    details_json text,
    ip_address character varying(45),
    user_agent text,
    status character varying(20),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name character varying(255) NOT NULL,
    account_number character varying(100) NOT NULL,
    account_holder character varying(255) NOT NULL,
    bank_bin character varying(20),
    branch character varying(255),
    logo_url text,
    transfer_note_template text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    flight_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_price numeric(12,2) NOT NULL,
    discount_code_id uuid,
    discount_amount numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    booking_code character varying(20) DEFAULT public.generate_booking_code() NOT NULL,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    user_email character varying(255),
    user_name character varying(255),
    status character varying(20) DEFAULT 'active'::character varying,
    last_message text,
    unread_by_user integer DEFAULT 0,
    unread_by_admin integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_conversations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id text NOT NULL,
    sender_role character varying(10) DEFAULT 'user'::character varying NOT NULL,
    content text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_sender_role_check CHECK (((sender_role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: chat_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    conversation_id uuid NOT NULL,
    role character varying(10) DEFAULT 'user'::character varying NOT NULL,
    is_online boolean DEFAULT false,
    is_typing boolean DEFAULT false,
    last_seen timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_presence_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: check_in; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_in (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    passenger_id uuid,
    seat_id uuid,
    check_in_number character varying(20) NOT NULL,
    boarding_pass_number character varying(20),
    seat_number character varying(10) NOT NULL,
    flight_no character varying(20) NOT NULL,
    from_code character varying(10) NOT NULL,
    to_code character varying(10) NOT NULL,
    depart_time timestamp with time zone NOT NULL,
    passenger_name character varying(255) NOT NULL,
    id_number character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    check_in_time timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_online_check_in boolean DEFAULT true,
    baggage_info jsonb,
    gate character varying(20),
    terminal character varying(20),
    CONSTRAINT check_in_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    value numeric(15,2) NOT NULL,
    min_booking_amount numeric(15,2) DEFAULT 0,
    max_discount_amount numeric(15,2),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    usage_limit integer,
    usage_per_user_limit integer DEFAULT 1,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    agency_id uuid,
    issued_by text,
    CONSTRAINT discount_codes_type_check CHECK (((type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[])))
);


--
-- Name: flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flight_no character varying(20) NOT NULL,
    from_code character varying(10) NOT NULL,
    to_code character varying(10) NOT NULL,
    depart_time timestamp with time zone NOT NULL,
    arrive_time timestamp with time zone NOT NULL,
    price numeric(12,2) NOT NULL,
    class character varying(20) NOT NULL,
    available integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT flights_class_check CHECK (((class)::text = ANY ((ARRAY['economy'::character varying, 'business'::character varying])::text[])))
);


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    device_type character varying(50),
    location character varying(255),
    success boolean DEFAULT true,
    failure_reason character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    points_per_1000_vnd numeric(5,2) DEFAULT 1.00,
    min_points_to_redeem integer DEFAULT 1000,
    points_expiry_months integer DEFAULT 24,
    start_date date DEFAULT CURRENT_DATE,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    min_lifetime_points integer DEFAULT 0,
    points_multiplier numeric(3,2) DEFAULT 1.00,
    benefits text,
    tier_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_loyalty_id uuid NOT NULL,
    booking_id uuid,
    points integer NOT NULL,
    type character varying(20) NOT NULL,
    description character varying(255),
    expires_at timestamp with time zone,
    expired boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loyalty_transactions_points_check CHECK ((points <> 0)),
    CONSTRAINT loyalty_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['earn'::character varying, 'redeem'::character varying, 'expire'::character varying, 'bonus'::character varying, 'adjust'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: passengers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passengers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    dob date,
    id_number character varying(50),
    gender character varying(20) DEFAULT 'male'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    method character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    family_id uuid NOT NULL,
    revoked boolean DEFAULT false,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    reason text,
    amount numeric(12,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id text NOT NULL,
    bank_info text
);


--
-- Name: saved_payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    type character varying(20) NOT NULL,
    card_brand character varying(50),
    last_four character varying(4),
    card_holder_name character varying(100),
    expiry_month integer,
    expiry_year integer,
    bank_id character varying(50),
    bank_name character varying(100),
    bank_code character varying(10),
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT saved_payment_methods_expiry_month_check CHECK (((expiry_month >= 1) AND (expiry_month <= 12))),
    CONSTRAINT saved_payment_methods_expiry_year_check CHECK ((expiry_year >= 2024)),
    CONSTRAINT saved_payment_methods_type_check CHECK (((type)::text = ANY ((ARRAY['card'::character varying, 'bank'::character varying])::text[])))
);


--
-- Name: seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    flight_id uuid,
    seat_number character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    check_in_status character varying(20) DEFAULT 'not_checked_in'::character varying,
    check_in_time timestamp with time zone,
    CONSTRAINT seats_check_in_status_check CHECK (((check_in_status)::text = ANY ((ARRAY['not_checked_in'::character varying, 'checked_in'::character varying, 'boarded'::character varying])::text[])))
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    type character varying(50) DEFAULT 'string'::character varying,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    updated_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_2fa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_2fa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    secret character varying(64) NOT NULL,
    is_enabled boolean DEFAULT false,
    backup_codes text[],
    backup_codes_used integer DEFAULT 0,
    last_verified timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_loyalty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_loyalty (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    program_id uuid NOT NULL,
    total_points integer DEFAULT 0,
    available_points integer DEFAULT 0,
    lifetime_points integer DEFAULT 0,
    tier character varying(50) DEFAULT 'Bronze'::character varying,
    tier_qualified_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_loyalty_available_points_check CHECK ((available_points >= 0)),
    CONSTRAINT user_loyalty_lifetime_points_check CHECK ((lifetime_points >= 0)),
    CONSTRAINT user_loyalty_total_points_check CHECK ((total_points >= 0))
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    email character varying(255),
    password_hash text,
    full_name character varying(255),
    role character varying(50) DEFAULT 'user'::character varying,
    phone character varying(20),
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dob date,
    gender character varying(20),
    address text,
    city character varying(100),
    country character varying(100) DEFAULT 'Vietnam'::character varying,
    preferred_language character varying(10) DEFAULT 'vi'::character varying,
    email_verified boolean DEFAULT false,
    phone_verified boolean DEFAULT false,
    last_login timestamp with time zone,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    CONSTRAINT user_profiles_contact_check CHECK (((email IS NOT NULL) OR (phone IS NOT NULL))),
    CONSTRAINT user_profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    device_name character varying(100),
    device_type character varying(50),
    browser character varying(100),
    os character varying(100),
    ip_address character varying(45),
    user_agent text,
    last_active timestamp with time zone DEFAULT now(),
    is_current boolean DEFAULT false,
    is_trusted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);


--
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    balance numeric(12,2) DEFAULT 0.00,
    currency character varying(3) DEFAULT 'VND'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_number character varying(20),
    CONSTRAINT user_wallets_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_before numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    description character varying(255),
    reference_id character varying(100),
    payment_method_id uuid,
    status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wallet_transactions_amount_check CHECK ((amount <> (0)::numeric)),
    CONSTRAINT wallet_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT wallet_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['topup'::character varying, 'withdraw'::character varying, 'payment'::character varying, 'refund'::character varying, 'bonus'::character varying])::text[])))
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
16cf2883-5d3d-4c80-8d9d-e1132d9abc14	Vietjet Air	ep-cool-king-anuo9ec3	2026-09-22 10:12:27.038+00	2026-09-22 10:12:27.038+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": true, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: account_recovery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_recovery (id, user_id, email, token, token_expires_at, used, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_roles (id, user_id, role_name, custom_permissions, granted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agencies (id, code, name, contact_name, contact_email, contact_phone, address, commission_rate, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: airports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.airports (id, code, name, city, country, created_at) FROM stdin;
61e9c961-4e72-4146-8e65-2139a0365681	UIH	Phu Cat	Qui Nhon	Vietnam	2026-08-27 16:41:22.532012+00
cd380d75-520c-404b-8824-448180fb672b	SGN	Tân Sơn Nhất	TP Hồ Chí Minh	Vietnam	2026-08-27 16:41:21.115233+00
00a009e6-a63d-4529-9cbd-04e3be55dfc3	HAN	Nội Bài	Hà Nội	Vietnam	2026-08-27 16:41:20.834663+00
221a5984-0c01-4de0-bad8-2a1328ac93f3	DAD	Đà Nẵng	Đà Nẵng	Vietnam	2026-08-27 16:41:21.404143+00
a2ffe22f-e918-4ff6-b7a0-2b001b72eded	PQC	Phú Quốc	Phú Quốc	Vietnam	2026-08-27 16:41:21.685235+00
1d341faf-9909-44f9-8a40-eb4b7297b636	CXR	Cam Ranh	Nha Trang	Vietnam	2026-08-27 16:41:21.971329+00
729fa05e-c60d-4668-b25c-3753903755f9	HUI	Phú Bài	Huế	Vietnam	2026-09-21 09:52:09.615112+00
4d88ae1d-41a8-46bc-bdb6-bd7db42b5f04	VDO	Vân Đồn	Quảng Ninh	Vietnam	2026-09-21 09:52:09.615112+00
79efd333-ef59-44ea-87e6-1f8bae8a8640	HPH	Cát Bi	Hải Phòng	Vietnam	2026-08-27 16:41:22.253256+00
90d7598a-2bc7-4ff4-8f64-6f80ca588253	DLI	Liên Khương	Đà Lạt	Vietnam	2026-09-21 09:52:09.615112+00
d52bec38-28f5-409f-b453-c104fcda6d14	VII	Vinh	Vinh	Vietnam	2026-09-21 09:52:09.615112+00
ae4d0685-df59-47ab-8d68-e66072ff8f9b	PXU	Pleiku	Pleiku	Vietnam	2026-09-21 09:52:09.615112+00
e71a7bd6-2246-4cf5-9a72-1155d0b83d74	VCA	Cần Thơ	Cần Thơ	Vietnam	2026-08-27 16:41:22.819958+00
e4c23421-6af5-4a9a-8943-9e7b6f873258	BMV	Buôn Ma Thuột	Buôn Ma Thuột	Vietnam	2026-09-21 09:52:09.615112+00
67fde9d4-3957-4555-bd76-9d3e39f0d62c	VDH	Đồng Hới	Quảng Bình	Vietnam	2026-09-21 09:52:09.615112+00
ec0b2d3c-4c81-4e34-abb7-e91ebb0b465f	VCS	Côn Đảo	Côn Đảo	Vietnam	2026-09-21 09:52:09.615112+00
07d87eee-5d43-4f35-ae63-7079bea78c1c	THD	Thọ Xuân	Thanh Hóa	Vietnam	2026-09-21 09:52:09.615112+00
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, title, content, type, target_role, is_active, start_date, end_date, created_by, created_at, updated_at) FROM stdin;
4ac0294b-632b-4886-b11a-f2ab139dbd8c	Khuyến mãi chào hè	Giảm giá 20% cho các chuyến bay đi Phú Quốc.	promotion	all	t	\N	\N	\N	2026-09-21 06:01:33.391265+00	2026-09-21 06:01:33.391265+00
d1bc248c-cc2b-436e-93cf-e080a2ef6bab	Bảo trì hệ thống	Hệ thống sẽ bảo trì vào lúc 2h sáng chủ nhật.	system	all	t	\N	\N	\N	2026-09-21 06:01:33.800666+00	2026-09-21 06:01:33.800666+00
550dcfcd-8f13-4397-b1ab-5e0c3486993f	Quy định hành lý mới	VietjetSim cập nhật quy định hành lý ký gửi.	info	all	t	\N	\N	\N	2026-09-21 06:01:34.219656+00	2026-09-21 06:01:34.219656+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, admin_id, admin_email, action, target_type, target_id, details_json, ip_address, user_agent, status, created_at) FROM stdin;
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_accounts (id, bank_name, account_number, account_holder, bank_bin, branch, logo_url, transfer_note_template, is_default, is_active, created_at, updated_at) FROM stdin;
76931ce0-f4d6-49cd-a5e8-dcf1dbaf9528	Vietcombank	1234 5678 9012	CONG TY VIETJET SIM	970436	\N	\N	VJ {code} TT{amount} GOC{original} GIAM{discount} {discount_code}	t	t	2026-08-27 16:41:17.276743+00	2026-09-22 10:11:28.862392+00
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, user_id, flight_id, status, total_price, discount_code_id, discount_amount, created_at, updated_at, booking_code) FROM stdin;
edc81535-9da7-4499-b871-94cbf42ecff1	e2a6aec4-e6dc-43e9-902e-d6db804291a6	6bf2be34-6e72-492a-9be2-b285265f43a2	confirmed	1500000.00	\N	0.00	2026-09-10 21:37:01.492101+00	2026-09-10 21:37:01.492101+00	VJ644052
\.


--
-- Data for Name: chat_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_conversations (id, user_id, user_email, user_name, status, last_message, unread_by_user, unread_by_admin, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, conversation_id, sender_id, sender_role, content, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: chat_presence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_presence (id, user_id, conversation_id, role, is_online, is_typing, last_seen, updated_at) FROM stdin;
\.


--
-- Data for Name: check_in; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.check_in (id, booking_id, passenger_id, seat_id, check_in_number, boarding_pass_number, seat_number, flight_no, from_code, to_code, depart_time, passenger_name, id_number, status, check_in_time, created_at, updated_at, is_online_check_in, baggage_info, gate, terminal) FROM stdin;
\.


--
-- Data for Name: discount_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.discount_codes (id, code, type, value, min_booking_amount, max_discount_amount, start_date, end_date, usage_limit, usage_per_user_limit, used_count, is_active, created_at, updated_at, agency_id, issued_by) FROM stdin;
\.


--
-- Data for Name: flights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flights (id, flight_no, from_code, to_code, depart_time, arrive_time, price, class, available, created_at, updated_at) FROM stdin;
6a9a9e11-1066-48d0-a848-d5984b8e1355	VJ101-1000	UIH	SGN	2026-09-20 22:42:24.118+00	2026-09-21 02:39:36.575+00	2576881.00	business	180	2026-08-27 16:41:24.412074+00	2026-08-27 16:41:24.412074+00
e0cd8fa6-f89b-4e34-bf0f-25a416a7308d	VJ404-1001	UIH	VCA	2026-09-12 00:42:24.411+00	2026-09-12 03:46:19.549+00	903840.00	economy	180	2026-08-27 16:41:24.704087+00	2026-08-27 16:41:24.704087+00
6313fac1-5673-4104-83ce-f4b4e676f82e	VJ456-1002	PQC	SGN	2026-08-26 19:12:24.697+00	2026-08-26 21:27:54.431+00	1014675.00	economy	180	2026-08-27 16:41:24.983333+00	2026-08-27 16:41:24.983333+00
318fdbf9-c5d4-4b8c-b59c-f7a8ffb35c47	VJ789-1003	HAN	SGN	2026-08-27 17:18:24.981+00	2026-08-27 21:25:03.301+00	2070664.00	business	180	2026-08-27 16:41:25.271133+00	2026-08-27 16:41:25.271133+00
7a1d0c18-fe0c-471f-a4b6-505ce7194393	VJ505-1004	HPH	VCA	2026-09-20 21:50:25.265+00	2026-09-21 01:20:09.763+00	4411897.00	business	180	2026-08-27 16:41:25.556414+00	2026-08-27 16:41:25.556414+00
b13fb9b0-7a70-4ed1-b5b5-eaae97c4de38	VJ505-1005	PQC	VCA	2026-09-13 01:09:25.568+00	2026-09-13 03:23:30.387+00	1482741.00	economy	180	2026-08-27 16:41:25.876952+00	2026-08-27 16:41:25.876952+00
f75f30b3-2c32-4ba1-959c-9e457abdc2e8	VJ303-1006	CXR	VCA	2026-09-15 09:08:25.901+00	2026-09-15 13:29:37.424+00	548888.00	economy	180	2026-08-27 16:41:26.189804+00	2026-08-27 16:41:26.189804+00
c0db1e03-ee76-467f-bb06-8c248abb4275	VJ456-1007	PQC	DAD	2026-09-10 07:17:26.185+00	2026-09-10 10:54:14.053+00	1290893.00	economy	180	2026-08-27 16:41:26.483498+00	2026-08-27 16:41:26.483498+00
a9706652-c6be-432b-a317-c01728a7aacc	VJ123-1008	UIH	CXR	2026-09-05 11:56:26.502+00	2026-09-05 14:58:36.849+00	899661.00	economy	180	2026-08-27 16:41:26.890092+00	2026-08-27 16:41:26.890092+00
0d3ea73a-fa1f-4e1e-8a98-76675a0857e2	VJ505-1009	SGN	DAD	2026-09-09 21:07:26.925+00	2026-09-10 00:19:47.922+00	3035975.00	business	180	2026-08-27 16:41:27.220713+00	2026-08-27 16:41:27.220713+00
80877ff9-6d97-4011-a4f5-087bd1747a1a	VJ456-1010	CXR	UIH	2026-09-09 03:26:27.214+00	2026-09-09 06:10:08.463+00	3078449.00	business	180	2026-08-27 16:41:27.511304+00	2026-08-27 16:41:27.511304+00
4aa4fda0-f6c1-4686-a358-77889956c389	VJ303-1011	DAD	SGN	2026-09-23 14:15:27.505+00	2026-09-23 18:13:54.489+00	2597185.00	business	180	2026-08-27 16:41:27.79541+00	2026-08-27 16:41:27.79541+00
2e2baa06-9232-4262-a1d7-edf56d6d72de	VJ123-1012	UIH	PQC	2026-09-17 22:03:27.797+00	2026-09-18 01:46:10.932+00	947964.00	economy	180	2026-08-27 16:41:28.090133+00	2026-08-27 16:41:28.090133+00
74c23328-a635-4c7b-bb17-4311a857ee1b	VJ303-1013	HAN	UIH	2026-09-08 19:26:28.085+00	2026-09-08 21:03:56.519+00	2366880.00	business	180	2026-08-27 16:41:28.369292+00	2026-08-27 16:41:28.369292+00
ce860eda-3959-45d8-8b6d-b2364e48eab3	VJ456-1014	UIH	CXR	2026-09-20 13:32:28.363+00	2026-09-20 17:10:21.531+00	4227590.00	business	180	2026-08-27 16:41:28.650257+00	2026-08-27 16:41:28.650257+00
07801314-9254-4904-bc62-f757b4ac2010	VJ101-1015	HAN	DAD	2026-09-13 03:28:28.644+00	2026-09-13 05:45:42.929+00	2259732.00	business	180	2026-08-27 16:41:28.93652+00	2026-08-27 16:41:28.93652+00
229110a5-fcaf-4618-87fb-8d4414400c4d	VJ404-1016	HPH	SGN	2026-09-15 01:45:28.936+00	2026-09-15 05:42:39.278+00	531305.00	economy	180	2026-08-27 16:41:29.228213+00	2026-08-27 16:41:29.228213+00
de25645d-f17f-4836-8066-6292f7f2fc3b	VJ123-1017	HAN	VCA	2026-09-18 07:48:29.23+00	2026-09-18 09:38:52.241+00	1343296.00	economy	180	2026-08-27 16:41:29.51618+00	2026-08-27 16:41:29.51618+00
b064297a-3b72-47e1-944c-7f849c20bcb2	VJ456-1018	UIH	PQC	2026-09-03 23:45:29.528+00	2026-09-04 02:23:36.974+00	1205716.00	economy	180	2026-08-27 16:41:29.816473+00	2026-08-27 16:41:29.816473+00
a1996c89-ee05-415a-859a-0af8756a99ad	VJ789-1019	UIH	SGN	2026-08-28 14:14:29.81+00	2026-08-28 15:57:18.997+00	3450598.00	business	180	2026-08-27 16:41:30.09666+00	2026-08-27 16:41:30.09666+00
4f9ba6ea-a4ac-4102-971b-8c85c0ce7edb	VJ101-1020	DAD	VCA	2026-09-16 17:20:30.09+00	2026-09-16 21:26:25.45+00	3042233.00	business	180	2026-08-27 16:41:30.382037+00	2026-08-27 16:41:30.382037+00
779b7455-a904-448e-bb20-ff31a0390723	VJ202-1021	DAD	CXR	2026-09-06 11:16:30.439+00	2026-09-06 13:57:34.552+00	3801713.00	business	180	2026-08-27 16:41:30.734163+00	2026-08-27 16:41:30.734163+00
965d3ba0-5542-47e7-a8d6-ee0c62157fdd	VJ456-1022	UIH	CXR	2026-08-28 11:03:30.736+00	2026-08-28 14:18:00.709+00	912595.00	economy	180	2026-08-27 16:41:31.025142+00	2026-08-27 16:41:31.025142+00
aded42bd-09dc-42a8-9446-6a24303f9132	VJ101-1023	DAD	UIH	2026-09-03 11:59:31.024+00	2026-09-03 15:04:51.629+00	4608041.00	business	180	2026-08-27 16:41:31.308545+00	2026-08-27 16:41:31.308545+00
fda52a61-8f77-4300-a11e-0c61621466b3	VJ303-1024	CXR	SGN	2026-09-08 21:07:31.302+00	2026-09-08 23:50:43.634+00	2568483.00	business	180	2026-08-27 16:41:31.605241+00	2026-08-27 16:41:31.605241+00
51d89824-33b9-48a2-b9dc-7b163ecdad66	VJ202-1025	PQC	DAD	2026-09-13 04:01:31.598+00	2026-09-13 05:56:27.887+00	2218256.00	business	180	2026-08-27 16:41:31.888335+00	2026-08-27 16:41:31.888335+00
c49a7e53-0771-405b-b517-a2cef3be4fa3	VJ123-1026	SGN	DAD	2026-09-18 04:02:31.882+00	2026-09-18 06:15:47.359+00	2780791.00	business	180	2026-08-27 16:41:32.170344+00	2026-08-27 16:41:32.170344+00
7cadf30d-2785-42c7-827d-c5a6f3169517	VJ789-1027	DAD	PQC	2026-08-28 05:59:32.187+00	2026-08-28 08:22:43.179+00	979639.00	economy	180	2026-08-27 16:41:32.491104+00	2026-08-27 16:41:32.491104+00
7a4f287c-2b96-4b3c-9570-20b1ecee5ac4	VJ456-1028	HPH	DAD	2026-09-02 15:13:32.499+00	2026-09-02 19:33:31.862+00	953154.00	economy	180	2026-08-27 16:41:32.794697+00	2026-08-27 16:41:32.794697+00
40b5fea7-11bd-49ae-8e2e-3a42f4adb014	VJ303-1029	DAD	PQC	2026-09-07 19:34:32.797+00	2026-09-07 21:32:58.891+00	1356433.00	economy	180	2026-08-27 16:41:33.133042+00	2026-08-27 16:41:33.133042+00
f4890684-3998-47bb-852a-0cff21f10a28	VJ456-1030	UIH	HAN	2026-09-22 08:29:33.142+00	2026-09-22 10:24:13.535+00	4389900.00	business	180	2026-08-27 16:41:33.434843+00	2026-08-27 16:41:33.434843+00
0fe1dd74-d978-4f06-9077-5fcf7453681f	VJ789-1031	HPH	DAD	2026-08-27 01:00:33.441+00	2026-08-27 04:00:27.084+00	2298217.00	business	180	2026-08-27 16:41:33.731231+00	2026-08-27 16:41:33.731231+00
5be07be4-e495-4d78-a594-75dc648eb378	VJ456-1032	VCA	UIH	2026-09-05 09:05:33.749+00	2026-09-05 12:42:33.563+00	2289259.00	business	180	2026-08-27 16:41:34.057074+00	2026-08-27 16:41:34.057074+00
bcaca4a2-1b79-437f-a34f-5df70c18077c	VJ101-1033	UIH	SGN	2026-09-23 15:13:34.085+00	2026-09-23 17:32:38.023+00	4761849.00	business	180	2026-08-27 16:41:34.381059+00	2026-08-27 16:41:34.381059+00
f67b6bbd-905a-4e5f-937f-687d6d358a50	VJ101-1034	VCA	UIH	2026-09-16 14:56:34.383+00	2026-09-16 19:15:45.05+00	654862.00	economy	180	2026-08-27 16:41:34.671158+00	2026-08-27 16:41:34.671158+00
b2197127-799d-4dbc-8a72-abef7c63acad	VJ505-1035	CXR	UIH	2026-09-10 11:25:34.739+00	2026-09-10 12:59:59.621+00	1142608.00	economy	180	2026-08-27 16:41:35.026517+00	2026-08-27 16:41:35.026517+00
fb7696fd-66ad-4421-8968-8312cb7f8fda	VJ456-1036	SGN	CXR	2026-09-01 16:15:35.033+00	2026-09-01 18:22:29.777+00	2656591.00	business	180	2026-08-27 16:41:35.321847+00	2026-08-27 16:41:35.321847+00
b75182d9-abd2-4d20-9bca-1bb33e77e57c	VJ202-1037	HAN	HPH	2026-09-17 15:33:35.315+00	2026-09-17 17:31:54.989+00	1272020.00	economy	180	2026-08-27 16:41:35.604372+00	2026-08-27 16:41:35.604372+00
0d51c232-159e-4ff6-9d27-f123aaf5adc3	VJ202-1038	HAN	CXR	2026-09-11 17:35:35.598+00	2026-09-11 21:48:36+00	757116.00	economy	180	2026-08-27 16:41:35.888536+00	2026-08-27 16:41:35.888536+00
c0148bed-01bd-464f-bda8-1c6cb9e549d5	VJ404-1039	PQC	HPH	2026-09-01 08:54:35.882+00	2026-09-01 13:05:56.13+00	1329872.00	economy	180	2026-08-27 16:41:36.160446+00	2026-08-27 16:41:36.160446+00
011afd41-ac89-473e-8c37-80170f9619f5	VJ101-1040	PQC	VCA	2026-08-29 18:23:36.155+00	2026-08-29 20:27:50.015+00	777178.00	economy	180	2026-08-27 16:41:36.439199+00	2026-08-27 16:41:36.439199+00
ba2742fc-96c6-4884-a6f9-3e25d99b1bf3	VJ505-1041	VCA	PQC	2026-09-23 22:22:36.592+00	2026-09-24 01:14:37.928+00	2645365.00	business	180	2026-08-27 16:41:36.884096+00	2026-08-27 16:41:36.884096+00
0cd2658c-a250-4059-ad3c-b709879ee529	VJ303-1042	VCA	PQC	2026-08-26 20:23:36.878+00	2026-08-26 22:15:08.564+00	3159872.00	business	180	2026-08-27 16:41:37.160391+00	2026-08-27 16:41:37.160391+00
6bf2be34-6e72-492a-9be2-b285265f43a2	VJ789-1043	SGN	UIH	2026-09-11 06:41:37.154+00	2026-09-11 08:59:06.438+00	4117434.00	business	180	2026-08-27 16:41:37.438847+00	2026-08-27 16:41:37.438847+00
c6e20e8c-30a0-4af1-8793-6f1cc26d8af2	VJ404-1044	UIH	CXR	2026-09-09 14:24:37.432+00	2026-09-09 16:02:22.492+00	503205.00	economy	180	2026-08-27 16:41:37.73106+00	2026-08-27 16:41:37.73106+00
40ea7093-e7a4-4640-aeeb-db59664cc720	VJ456-1045	UIH	HAN	2026-09-18 20:21:37.736+00	2026-09-18 22:47:08.814+00	629044.00	economy	180	2026-08-27 16:41:38.0204+00	2026-08-27 16:41:38.0204+00
aecff761-b2c9-4503-9d5c-2e20f5d5f170	VJ789-1046	HAN	HPH	2026-08-30 00:33:38.119+00	2026-08-30 03:15:04.205+00	3616108.00	business	180	2026-08-27 16:41:38.428354+00	2026-08-27 16:41:38.428354+00
de844530-0284-484a-8e09-3d29443f14ca	VJ404-1047	CXR	HPH	2026-09-09 03:17:38.428+00	2026-09-09 07:29:43.093+00	571573.00	economy	180	2026-08-27 16:41:38.718505+00	2026-08-27 16:41:38.718505+00
662db27c-d147-4bb0-85ae-6553d505797c	VJ202-1048	PQC	HPH	2026-09-09 21:16:38.712+00	2026-09-09 23:39:53.427+00	4293626.00	business	180	2026-08-27 16:41:39.00122+00	2026-08-27 16:41:39.00122+00
522aa1ee-a6af-4195-873f-599f310e398a	VJ456-1049	HPH	DAD	2026-09-16 05:34:39.04+00	2026-09-16 09:10:23.021+00	3098774.00	business	180	2026-08-27 16:41:39.326586+00	2026-08-27 16:41:39.326586+00
1589fbe9-db8b-492d-b0ed-9561d3e84f21	VJ 101	SGN	HAN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
e7dadb74-0838-466d-9fa2-f6ddccfb2583	VJ 102	SGN	HAN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
433e465d-0522-418d-96a7-518ea05708c9	VJ 103	SGN	HAN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
166ad72c-5cc8-4668-8dd7-c1ee64ff4f43	VJ 104	SGN	HAN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
e57e7828-6271-4e03-b29e-ae02ddf3c35a	VJ 105	SGN	HAN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
0efba9b4-0390-44f7-8215-47377dd1a244	VJ 106	HAN	SGN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
b4465188-44b4-4192-9003-032773d06a0f	VJ 107	HAN	SGN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
8cbf6f2c-34d6-4fe9-8e6b-e7638186f5bc	VJ 108	HAN	SGN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
7bbc802c-5048-4a26-8f2d-ec2a57f60958	VJ 109	HAN	SGN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
54436b31-472c-4b0a-b9d1-482e28a43054	VJ 110	HAN	SGN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
235a69e0-6797-47f4-89f4-54a5a31dd6be	VJ 111	SGN	DAD	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
139be7b2-804c-4d42-b260-887e9009a258	VJ 112	SGN	DAD	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
be78d95e-93f4-4662-88d5-3720ff9a4e10	VJ 113	SGN	DAD	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
4e4773c2-cf5f-45a9-ba39-385bafca11b5	VJ 114	SGN	DAD	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
7ca6154c-1f41-4570-b1aa-022d629fa5e0	VJ 115	SGN	DAD	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
c4998c24-7760-447a-b46d-240e78b14c23	VJ 116	DAD	SGN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
a6f41e19-4c6c-4ad3-831d-ef56e7010fc1	VJ 117	DAD	SGN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
be6291ca-2097-4a15-94b9-44bd9109ed46	VJ 118	DAD	SGN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
aed85428-4c4a-4a40-a48f-2024b87c786b	VJ 119	DAD	SGN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
98876a0a-7f04-40eb-b061-909ddfc894ad	VJ 120	DAD	SGN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
6a4d0f80-f909-40e9-9d3c-5061e316924e	VJ 121	HAN	DAD	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
6a91307c-4846-4963-8a11-01d59916c900	VJ 122	HAN	DAD	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
bc5c4964-9a30-4329-bc4d-733d6050df90	VJ 123	HAN	DAD	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
0d36b43a-43e4-4a11-b3b3-8a61b42b65d1	VJ 124	HAN	DAD	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
221c9e3a-95d2-4598-8e9c-f8f6df0e3c40	VJ 125	HAN	DAD	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
ff82d47b-26c2-49e6-8abe-af06a28b3a1c	VJ 126	DAD	HAN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
25d121c8-2bba-400a-a4ff-edb12993d164	VJ 127	DAD	HAN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
e7e94cdd-f402-4309-b040-41e8f6ff6656	VJ 128	DAD	HAN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
88594a52-d875-436c-88b2-469af21af7b2	VJ 129	DAD	HAN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
7eb6c247-f236-4ac2-a054-1619cb7496f9	VJ 130	DAD	HAN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
4a07a4f9-b1f9-4e94-adfd-08b8653bcdbd	VJ 131	SGN	PQC	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
2fb7a307-dcd9-4e13-8229-c4ea5036f98e	VJ 132	SGN	PQC	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
841f095e-289e-43e8-86e6-c959c13357a6	VJ 133	SGN	PQC	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
c14eaa51-c78d-41a9-9ea0-88d8cda06ea1	VJ 134	SGN	PQC	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
35e68975-c2fe-423d-b294-7369fb6b6583	VJ 135	SGN	PQC	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
1a7dcd80-4884-41ea-ad6b-9b350791f7ba	VJ 136	PQC	SGN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
f205e31a-d3ab-4527-8ef6-48b81b054418	VJ 137	PQC	SGN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
e282f6f0-8f60-4713-a331-92ff04b9d243	VJ 138	PQC	SGN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
335cfc71-4d27-48d8-bc5b-0b1a67218854	VJ 139	PQC	SGN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
e614c51f-d357-41a5-9829-f9c8ed11705b	VJ 140	PQC	SGN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
d0ebd2be-5946-4f25-a564-5d3efa0fa4ac	VJ 141	HAN	PQC	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
d037870c-e3b4-4ec5-838d-4ead068f5ad9	VJ 142	HAN	PQC	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
a40e3127-d82e-4e77-b2e7-63e49e8de702	VJ 143	HAN	PQC	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
307eb2bb-7487-443e-a823-501419e60757	VJ 144	HAN	PQC	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
5e4b91c7-d03b-4476-a2fd-0b94a08f89c2	VJ 145	HAN	PQC	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
8fcfd6f1-8aec-41de-9c4f-b028289ec41a	VJ 146	PQC	HAN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
969379a9-2ca8-4b8a-8fbd-b8ac6e2889b1	VJ 147	PQC	HAN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
c2afc717-264c-454f-b80d-31539b0e7b74	VJ 148	PQC	HAN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
c5cab902-a894-4371-8fec-4d71c710fc2b	VJ 149	PQC	HAN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
f3096695-c2e0-4cad-802b-bb7b2226da1e	VJ 150	PQC	HAN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
0c16f210-b9d2-4074-b8d3-5ee75c0db0d0	VJ 151	SGN	CXR	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
b5981bcb-9fd2-4a6f-a609-b8bdcd83610b	VJ 152	SGN	CXR	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
38d0404b-661d-4691-a854-598b7d99cc57	VJ 153	SGN	CXR	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
a07de377-1acb-4c0f-a6de-918e1d048426	VJ 154	SGN	CXR	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
b0545b9d-977c-49a8-9139-eefd5a983028	VJ 155	SGN	CXR	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
8d34bb7c-352b-4257-9004-7f128a427ecb	VJ 156	CXR	SGN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
0f355f07-fac9-4651-b752-aa4256432011	VJ 157	CXR	SGN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
5e9c0bfc-b211-4db1-8e70-a9871e4f56d4	VJ 158	CXR	SGN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
37b9d075-745d-4a86-9cc4-09f8977529ab	VJ 159	CXR	SGN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
941b8a6b-ac46-4693-bded-45ffa6239208	VJ 160	CXR	SGN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
99cc932e-89ec-48cb-967f-75d4e858ab99	VJ 161	SGN	HUI	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
7b0b6d3b-40e4-4735-8f9c-a83b5911cf64	VJ 162	SGN	HUI	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
ae7531dd-8b92-44d5-af93-0fc050e0d1f0	VJ 163	SGN	HUI	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
fe9e7cbc-2eb3-47bd-96a8-02f2b905e308	VJ 164	SGN	HUI	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
b988b8d7-e4e8-4fc7-98cc-e7482ba2900c	VJ 165	SGN	HUI	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
7e1269cb-c933-4ad0-89f2-43a36f6c9165	VJ 166	HUI	SGN	2026-09-22 06:00:00+00	2026-09-22 08:10:00+00	899000.00	economy	180	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
f6739fdc-bf72-4e28-9483-4b6e23da1a90	VJ 167	HUI	SGN	2026-09-22 09:00:00+00	2026-09-22 11:10:00+00	1299000.00	economy	165	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
517fafbc-2857-4a27-b796-d64d83dcc9a5	VJ 168	HUI	SGN	2026-09-22 12:00:00+00	2026-09-22 14:10:00+00	749000.00	economy	192	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
03b2cdac-f382-46a4-8ac1-40d7ad623236	VJ 169	HUI	SGN	2026-09-22 15:00:00+00	2026-09-22 17:10:00+00	1059000.00	economy	150	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
d1fffe75-3ae6-4f0b-9095-f67d18dcc3d6	VJ 170	HUI	SGN	2026-09-22 19:00:00+00	2026-09-22 21:10:00+00	2490000.00	business	24	2026-09-21 09:52:10.151953+00	2026-09-21 09:52:10.151953+00
\.


--
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_history (id, user_id, ip_address, user_agent, device_type, location, success, failure_reason, created_at) FROM stdin;
e6702484-204f-41f5-a340-7e323ab8d429	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	f	invalid_password	2026-09-21 08:21:45.651743+00
7bfb444b-c52a-4364-9fb2-3af8248465fa	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	f	invalid_password	2026-09-21 09:21:14.262304+00
3b9c100e-198b-429d-a4f7-025273988c34	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 10:43:48.869079+00
ca34803d-18a3-4b91-8574-5f181267ad91	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-21 10:43:49.372962+00
48c7b164-ce82-49fa-bd50-a1d2d0c9af4c	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-21 10:44:49.300627+00
0ac09128-3289-4136-b25b-917f29a5c00b	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 10:44:54.058006+00
23b33975-d960-48d3-a1fa-f55394b4a8ee	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 15:26:57.176559+00
6178f131-992e-4908-8b97-b0d78b93c443	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-21 15:26:57.664709+00
7767b387-a440-4290-b339-b1ce519e2b0a	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	f	invalid_password	2026-09-21 15:26:58.038164+00
7bf49ebe-524f-47d5-aa62-a215b50e98d4	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 15:29:50.794415+00
95971d6e-b2ad-4a16-9d74-11b1f70791fe	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 15:32:21.196548+00
66191681-3844-4a78-b14c-207c6f4df5ce	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 15:32:21.952425+00
357c8ff8-68a9-4502-bf27-53c104bbcbbf	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 15:40:46.293473+00
4a041b58-ff26-4201-8e2b-fe9370866d39	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-21 16:01:02.809169+00
29dcba92-3b4c-4952-a8bd-90fa1a7a9645	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	f	invalid_password	2026-09-22 02:47:08.643944+00
3e36553d-caf9-4606-996a-74291f17c231	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	f	invalid_password	2026-09-22 02:47:24.287902+00
bc524016-201a-410b-ab2c-d169b9af5bbe	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-22 09:56:14.877188+00
e2023d28-cd95-4b16-863b-ee1d91597941	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-22 10:08:46.230551+00
17636e9b-58c9-48bb-b79f-ed0d280a9876	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-22 10:08:46.67803+00
13d9ca69-91b3-4547-bbaf-0a2d40ec004e	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-22 10:11:14.725624+00
a2379c4c-8796-4b90-bd58-62b964fe1cf3	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-22 10:11:24.499644+00
bffff052-f8cf-48dd-9f03-76395be43d58	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-22 10:11:28.769346+00
16497662-4dc1-408e-8ce3-d258497c11b1	cc751ea4-992a-4e35-968d-e76ddaa8fb12	\N	\N	desktop	\N	t	\N	2026-09-24 21:52:32.203987+00
34ee40d5-f2d8-4794-9ac5-d79547216bb7	4388b79f-dce5-4073-a66c-dcf37ef73a34	\N	\N	desktop	\N	t	\N	2026-09-24 21:52:41.750147+00
\.


--
-- Data for Name: loyalty_programs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loyalty_programs (id, name, description, points_per_1000_vnd, min_points_to_redeem, points_expiry_months, start_date, end_date, is_active, created_at, updated_at) FROM stdin;
dd63d020-6d05-48af-a34c-e0a22264352d	VietjetSim Rewards	Chương trình tích điểm thưởng cho khách hàng VietjetSim	1.00	500	24	2026-08-27	\N	t	2026-08-27 16:41:18.660674+00	2026-08-27 16:41:18.660674+00
80e3c29a-0be9-4c50-80e7-f45e2409fba2	VietjetSim Rewards	Chương trình tích điểm thưởng cho khách hàng VietjetSim	1.00	500	24	2026-09-01	\N	t	2026-09-01 16:35:53.457519+00	2026-09-01 16:35:53.457519+00
dd1655ed-595a-46e3-8b27-6deab219b8d2	VietjetSim Rewards	Chương trình tích điểm thưởng cho khách hàng VietjetSim	1.00	500	24	2026-09-21	\N	t	2026-09-21 06:01:25.371082+00	2026-09-21 06:01:25.371082+00
\.


--
-- Data for Name: loyalty_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loyalty_tiers (id, program_id, name, min_lifetime_points, points_multiplier, benefits, tier_order, created_at) FROM stdin;
c672dc8e-6a55-4f94-8dc4-58aa8c483e90	dd63d020-6d05-48af-a34c-e0a22264352d	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-08-27 16:41:18.660674+00
1a545646-e779-401c-9043-a5b8d0dfe240	dd63d020-6d05-48af-a34c-e0a22264352d	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-08-27 16:41:18.660674+00
fe376e43-0c98-4d94-95e6-30deaff77f4e	dd63d020-6d05-48af-a34c-e0a22264352d	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-08-27 16:41:18.660674+00
8f54b9c1-6c18-4719-baac-902e75811b38	dd63d020-6d05-48af-a34c-e0a22264352d	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-08-27 16:41:18.660674+00
0799531e-2fbf-4bc8-bae2-cb1176ee7122	dd63d020-6d05-48af-a34c-e0a22264352d	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-09-01 16:35:53.457519+00
043aef3c-a0cf-43d9-99d6-898f5d3e4a78	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-09-01 16:35:53.457519+00
c0f4a5bc-3739-4508-834d-219878a62569	dd63d020-6d05-48af-a34c-e0a22264352d	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-09-01 16:35:53.457519+00
249ba6a1-acf3-47a3-a096-61541975ff99	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-09-01 16:35:53.457519+00
dba722f3-af26-4f84-9d90-e013f73f797c	dd63d020-6d05-48af-a34c-e0a22264352d	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-09-01 16:35:53.457519+00
3552ddc3-96ef-4fb1-a672-0256cf6fe927	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-09-01 16:35:53.457519+00
874a0942-5aa8-4f84-87d6-19abfd313c6c	dd63d020-6d05-48af-a34c-e0a22264352d	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-09-01 16:35:53.457519+00
46c15e56-17e5-448e-acfd-fcf0873debbe	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-09-01 16:35:53.457519+00
6610da3d-b2ce-4d97-aeee-13ba3dd41fea	dd63d020-6d05-48af-a34c-e0a22264352d	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-09-21 06:01:25.371082+00
81fe6193-0ff7-4d9a-a2d5-8be9bd0b8147	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-09-21 06:01:25.371082+00
2ac7cd5a-4014-4ee9-902f-d245a31ce104	dd1655ed-595a-46e3-8b27-6deab219b8d2	Bronze	0	1.00	Tích 1 điểm cho mỗi 1,000 VND	1	2026-09-21 06:01:25.371082+00
66f4da88-d298-452f-9ea8-e06a3b1b6865	dd63d020-6d05-48af-a34c-e0a22264352d	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-09-21 06:01:25.371082+00
a9cfb4ee-4e77-48e9-afe8-fc5089832ce8	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-09-21 06:01:25.371082+00
898dd4fb-c1a3-41ed-b6d6-4866fa947594	dd1655ed-595a-46e3-8b27-6deab219b8d2	Silver	500000	1.25	Tích 1.25 điểm cho mỗi 1,000 VND. Ưu tiên check-in.	2	2026-09-21 06:01:25.371082+00
30809a4b-7278-4dde-9205-f28d9be8d937	dd63d020-6d05-48af-a34c-e0a22264352d	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-09-21 06:01:25.371082+00
004c2ac2-67c5-4ce8-bee8-d06349459e1f	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-09-21 06:01:25.371082+00
aa2c9b64-8b96-4f2e-886e-a736db74215f	dd1655ed-595a-46e3-8b27-6deab219b8d2	Gold	2000000	1.50	Tích 1.5 điểm cho mỗi 1,000 VND. Phòng chờ VIP miễn phí.	3	2026-09-21 06:01:25.371082+00
3a8fed5e-54d2-49ed-ab0c-f71eb2b78bd7	dd63d020-6d05-48af-a34c-e0a22264352d	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-09-21 06:01:25.371082+00
20cd586d-7c2d-48b5-9cce-9e657585befd	80e3c29a-0be9-4c50-80e7-f45e2409fba2	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-09-21 06:01:25.371082+00
bb1a23df-7ab9-4eb9-96d4-0011ec15b2fc	dd1655ed-595a-46e3-8b27-6deab219b8d2	Platinum	5000000	2.00	Tích 2 điểm cho mỗi 1,000 VND. Tất cả ưu tiên VIP.	4	2026-09-21 06:01:25.371082+00
\.


--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loyalty_transactions (id, user_loyalty_id, booking_id, points, type, description, expires_at, expired, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: passengers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.passengers (id, booking_id, name, dob, id_number, gender, created_at) FROM stdin;
99d6e950-b6e3-4222-9b48-a198020a8473	edc81535-9da7-4499-b871-94cbf42ecff1	NGUYEN VAN A	\N	012345678	male	2026-09-10 21:37:01.801183+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, booking_id, method, status, amount, created_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, family_id, revoked, used_at, created_at) FROM stdin;
1	e2a6aec4-e6dc-43e9-902e-d6db804291a6	df14f4c663048445e748715a5848d4cdccfc0166b7c9844af2667d2f9c408583	a725fdd0-f9f5-4656-8f4e-bb47c86d5842	f	\N	2026-08-27 16:44:29.347126+00
4	4388b79f-dce5-4073-a66c-dcf37ef73a34	e9170202ef18d1081ef4679976289cca91c68e07ea22e32a0396cc4f862630f6	5385775d-04fc-4e0b-9b5b-58290c5abf21	t	2026-08-30 14:17:17.654872+00	2026-08-30 14:07:11.605939+00
3	4388b79f-dce5-4073-a66c-dcf37ef73a34	822b9abe7cd4942d19f999e6ff2b74cdfcf55f395c2873ae2aea8fdb817ff31e	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 14:21:31.454546+00	2026-08-30 14:04:40.728434+00
5	4388b79f-dce5-4073-a66c-dcf37ef73a34	e4a7840aed3bded94d8c11e229f63a89be2920e204bad134e3b499024d4568a9	5385775d-04fc-4e0b-9b5b-58290c5abf21	t	2026-08-30 14:27:20.507791+00	2026-08-30 14:17:17.948965+00
6	4388b79f-dce5-4073-a66c-dcf37ef73a34	ef926631343a2884d2f74711ee2c2a1c311c8e73e16b7103e4137b1563ddc9d0	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 14:31:33.839775+00	2026-08-30 14:21:31.761461+00
8	4388b79f-dce5-4073-a66c-dcf37ef73a34	df842d43ecb3ec7b0851c088b22a375fd9d0c87cfa35e0c49d84056cde5f5f6b	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 14:41:37.095262+00	2026-08-30 14:31:34.151225+00
9	4388b79f-dce5-4073-a66c-dcf37ef73a34	06167e4c7dfcd7cb0258db7fc2c52508abddc6814a531a461ca0b44a263ba6ac	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 14:51:40.721566+00	2026-08-30 14:41:37.4959+00
10	4388b79f-dce5-4073-a66c-dcf37ef73a34	8d153effa862f0a9a158fd20ce5f9a6e5a0cb4015ff10c9c9ec5678ac04cb09a	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:01:45.297722+00	2026-08-30 14:51:41.165326+00
11	4388b79f-dce5-4073-a66c-dcf37ef73a34	2c8957c75cf151818fd9298ec32b0fbbafe0464085e412dfd2637f332dc888df	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:11:49.028101+00	2026-08-30 15:01:45.718928+00
12	4388b79f-dce5-4073-a66c-dcf37ef73a34	c5565d04335b9500bcebc911abaf5681c045dbb3da4e70875bf3be16250cfd66	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:21:52.312694+00	2026-08-30 15:11:49.347573+00
13	4388b79f-dce5-4073-a66c-dcf37ef73a34	b38adf21f434e89e9f782734a9aba98cd0c9d2481b7e097bb8364ca5b995466d	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:31:55.657204+00	2026-08-30 15:21:52.63085+00
14	4388b79f-dce5-4073-a66c-dcf37ef73a34	270cec8ef7aff5ae0213c5cc3fe9e6b9b62a732bfb4ada7ec25b8f52caa7440e	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:41:59.36741+00	2026-08-30 15:31:56.060014+00
15	4388b79f-dce5-4073-a66c-dcf37ef73a34	c5bb739bb5718ef5aa4a19632fcdb82e0a043ea91b57655f2dcd02404d1eb865	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	2026-08-30 15:52:02.418873+00	2026-08-30 15:41:59.663958+00
17	e7a8a571-9fdb-43d1-ba43-b24c10bd08e2	1c5862eb244e3f1dd0d3e29309fcba3c429589e9ad006498c06de164a37a949b	3427a369-1ee2-493b-b42d-65bb3527e28e	f	\N	2026-08-31 19:50:08.494394+00
18	cc751ea4-992a-4e35-968d-e76ddaa8fb12	b76bb70893015df8afa3a1a51917c78caecbe97b034f5d908b9c1b17328bd004	2e5f4402-679d-4146-8c6c-2c23a5e0ad8c	f	\N	2026-08-31 19:50:14.300267+00
19	e7a8a571-9fdb-43d1-ba43-b24c10bd08e2	782bbb295ea8c1954788224fc2d87387b6c383bee01fd553048e4197293589fb	d51757cb-ea96-428e-924d-2314aa7108b0	f	\N	2026-08-31 19:53:08.798701+00
20	cc751ea4-992a-4e35-968d-e76ddaa8fb12	2f158e2be9686e59a5f05d262308becf21a73489fcabc893635419cbddf794c0	66f11dd6-9aee-48bb-900b-cdea492af1b5	f	\N	2026-08-31 19:53:51.811885+00
21	cc751ea4-992a-4e35-968d-e76ddaa8fb12	ccc72d811407d70d2dd077baa08a88c84836b44daea786a2a933090690cd6569	24d3ee55-9c4d-4ff4-bd07-3b549af91a99	f	\N	2026-08-31 20:19:59.025254+00
24	0e7041a2-0860-446b-a644-c27dcf8d6498	5e50836ccda627ab09d7405597b8ed27c9746157b95b647cd6ad49b593d0b8f1	ad4cd77a-856a-4b1b-b97e-305ba417ee9b	f	\N	2026-09-21 08:55:54.3709+00
25	32512481-d3fb-4a20-b354-9edffc2913b4	a35fd54ace3e07c8c4cbb340edd85157d51b390b3921b5baa65c7ba2d1cd2257	234a6186-1313-4e85-8d56-1fb99655d9df	f	\N	2026-09-21 09:21:44.592909+00
26	8f7475ac-1e50-4d70-8bae-4277170bec5f	f1cee2dc0e220054434bbc28ab3921905437a76bfc2876297e16ee4055565c26	d48ee308-484b-431e-8d2e-154589c7077e	f	\N	2026-09-21 09:22:57.195673+00
27	93bd44b0-d27d-4fe5-852b-2bad4570043b	c9b8f6350797d1d2253d513f725010e38bae21a705bf265ff4f6a9db5f6b72cc	8a73bbee-005b-4c6b-ba19-dcfba472b645	f	\N	2026-09-21 09:42:54.385438+00
28	41f9c2ad-7526-423d-8e40-71f8ebfacf0d	e0c4c12ffa2959e4151ffd8b70cdb09845560877487dc2aa42556ee3c290b1fe	b938d969-1454-4bd5-9f8c-5d71b1858793	f	\N	2026-09-21 09:49:04.441114+00
29	742394a6-cebe-4452-b77b-bdbe06d4b6c9	2eb37cecb4399fa98aa3c64d5e1a88ac54dd23e718a65f421a0d549031a317e8	d9c39b19-dd66-4da1-b0d6-3e505ff574b0	f	\N	2026-09-21 09:52:34.279697+00
30	e61a8589-b8a8-40ee-93b5-7de8e87ed5d8	04d6528c5cda3fb1d2ae47039960f5993b854be9831005fbba56cf5bf9876a28	7ebb19b9-9e86-4ca6-a5e2-179f789a2eb9	f	\N	2026-09-21 09:52:45.096125+00
31	90442c7e-296b-4205-bc5e-48b700c44534	0fa4a1bae3d4b1a1ab7629773b0b80b33258d43a9234e5880f2c0726b1e6c42d	bce88ed4-1b8f-4c79-8133-fb8511c2f693	f	\N	2026-09-21 09:53:07.44595+00
32	cc751ea4-992a-4e35-968d-e76ddaa8fb12	7094eff3f80eb8e0de1079b581b2da8333ff10bab24e0f2c734981d5cbb4b265	10085db7-1458-49f7-a739-fd330e3a9c72	f	\N	2026-09-21 10:43:48.757964+00
35	cc751ea4-992a-4e35-968d-e76ddaa8fb12	2eef4c1925b47925f0577e92eaa2a97542a8b744bb6641b92fe982a9e13f7e9b	6971d1f8-b908-43c6-9e74-9c15cdbe728a	f	\N	2026-09-21 10:44:53.982087+00
36	c69694b2-74f9-4466-9980-4e6cbd22578e	d6aeffe7beba680a1bf53e0ad278ead896e7ad83a34f5985981937c20a6b393d	a425220e-0250-44c7-9ccd-7fa4ee378853	f	\N	2026-09-21 10:56:23.797889+00
37	cc751ea4-992a-4e35-968d-e76ddaa8fb12	7cfc7703e44782754b8d8f33750867c12f2304fb216024786a2d9c55aa1afbec	25c24f98-ee94-4396-a340-507e5eed0a77	f	\N	2026-09-21 15:26:57.066902+00
2	4388b79f-dce5-4073-a66c-dcf37ef73a34	f33ce73678695bdb8817f8dcd198377dd113cfe049123890e9cf073a74619320	ae720ea7-982f-4ac8-8155-f019d726fec0	t	\N	2026-08-29 16:31:27.387452+00
7	4388b79f-dce5-4073-a66c-dcf37ef73a34	24cdb2cb09d581c67a01bdaacbc3d81a2b7884c1729b5e5e3eacdc3148884174	5385775d-04fc-4e0b-9b5b-58290c5abf21	t	\N	2026-08-30 14:27:20.872249+00
16	4388b79f-dce5-4073-a66c-dcf37ef73a34	6a5a20e82495e8bf146f49cb1eb46b79211f39891cb635e9fa29a0f3cfef8164	f4c63f1f-0423-4cac-a584-b3fb52b06640	t	\N	2026-08-30 15:52:02.763481+00
22	4388b79f-dce5-4073-a66c-dcf37ef73a34	db888e4ef9f77f1107b0b884693eccf8c5c35950583766578c3859bc0b72bcf6	45208a6a-e49b-455b-9639-2d260157e248	t	\N	2026-09-02 09:05:24.142871+00
23	4388b79f-dce5-4073-a66c-dcf37ef73a34	38affdd7a6b93c56ac2536f8362f41ca2e7fc634cbf38dde58215064ab388380	088cb957-b6b3-48d5-ae5f-19ab95e40284	t	\N	2026-09-02 09:19:20.00311+00
33	4388b79f-dce5-4073-a66c-dcf37ef73a34	025d876f1ae6ef7edbd455e177598d402456ccb8560ae2dae098cdfa9a2ce409	c42fcfac-83ca-4d7e-8382-474bdf3223a1	t	\N	2026-09-21 10:43:49.298614+00
34	4388b79f-dce5-4073-a66c-dcf37ef73a34	9710d9215c719cea13bc11d6c5d186c534835c7e1d7520cf3bf8d2e2a8e8b8c6	07b1841f-c41b-4d49-8c27-cb32acb067d7	t	\N	2026-09-21 10:44:49.225599+00
38	4388b79f-dce5-4073-a66c-dcf37ef73a34	f4bab1e29622a393da45259587ef38dab7183e21f17c086a377ffdcbb067d6df	cf8f2eed-a9ca-4834-ba42-1be4c3f81393	t	\N	2026-09-21 15:26:57.584976+00
39	cc751ea4-992a-4e35-968d-e76ddaa8fb12	e1d432c3a35c444c1439de8a456916335781353fed3d9fe07d99a682516e01e5	da1b65a2-c8c1-4288-a9a9-737fe69295d6	f	\N	2026-09-21 15:29:50.706488+00
40	cc751ea4-992a-4e35-968d-e76ddaa8fb12	347c61714b8365df93a28b1de2d26df642bbfb0422d0ceecebc64c32d51d8794	5de5c71c-54fe-4f27-9a58-4f8dda15d10a	f	\N	2026-09-21 15:32:21.112404+00
42	cc751ea4-992a-4e35-968d-e76ddaa8fb12	9e1554bcd925066d890deffbfb077745ab8f83c5314f348f980f0278b758e249	f061e6b6-ff27-4bce-9859-e0a35fa7f37e	f	\N	2026-09-21 15:40:46.188585+00
43	cc751ea4-992a-4e35-968d-e76ddaa8fb12	d8af2b6b15c4e62b001af397d99266b604c71e3e3409f878019ee64dfb66ef48	d583228e-4c34-4013-9db6-4c1ed4ec948e	f	\N	2026-09-21 16:01:02.703127+00
44	4388b79f-dce5-4073-a66c-dcf37ef73a34	47be372eabe219d580163dda9dd0a32fb0ecdbf1905a0d7cb15531888112ea31	e2f792af-f12a-40c4-b4da-6c5eb5f69cf7	f	\N	2026-09-22 09:56:14.781222+00
45	9bb92b0a-e0fd-4a04-9539-481d787bb888	bb1eaa4b7e5cfe2bdf876bb73d31bf2e582dc5aaa57a8a195273342c42169f8b	dba3a31a-c237-402b-8723-be870e7cb5d3	f	\N	2026-09-22 10:08:22.740894+00
46	9bb92b0a-e0fd-4a04-9539-481d787bb888	f3a8c1c85ac6b6aca626579bfe53288555307a5dd6dc104f1303a108f5062d4a	8f0cbd57-8846-4792-bef3-383f1df640e3	f	\N	2026-09-22 10:08:23.192954+00
47	b9244c26-2fba-4c43-94a7-d0da17e15f97	b52a2cfe5e8b86e2cb0907d2e14f15b120896dc5214ddcf43caa44e5209d5d69	5009eac0-96ce-4810-8f08-4af255565a1c	f	\N	2026-09-22 10:08:29.650209+00
48	b9244c26-2fba-4c43-94a7-d0da17e15f97	69c4a8f54a42e4e08c637ebb42df1f8a33e08374a9920a0aff1a4b7d0ef908b1	102228c1-db77-4c05-beb0-ac517aa5670b	f	\N	2026-09-22 10:08:30.096885+00
49	7202f500-e307-41c0-a5e8-e105fa70a54c	a2155a50273ee4ec3b2f8498f5f891082a21a2923173819fa37ac1a2983d6a27	68283ec1-4606-4cde-bdd8-fc74aba4e8d4	f	\N	2026-09-22 10:08:40.526561+00
51	4388b79f-dce5-4073-a66c-dcf37ef73a34	0509e302187e1ef38114b96999792e345427c29cf258ccbc9d4870f4be53b3eb	2e034575-1765-4578-9de9-8df90a75a84f	f	\N	2026-09-22 10:08:46.165672+00
52	cc751ea4-992a-4e35-968d-e76ddaa8fb12	1d33338fb500c692bf20f8eb465dad31a1d56fc4b1ac3d102aa1607287b6ee4e	8c8a214d-48bc-4bfe-9276-adff43198950	f	\N	2026-09-22 10:08:46.611833+00
53	4388b79f-dce5-4073-a66c-dcf37ef73a34	acbdbd9524baca2a3697670611bcc3c6402515aac9e7b53845d657d3bcc00af0	d199771a-68ce-45a9-b712-45c2bcd17b67	f	\N	2026-09-22 10:11:14.633635+00
54	4388b79f-dce5-4073-a66c-dcf37ef73a34	7ab64dcf55bbbdc9e28c892aba4f2e6193400624be35733070fdc4f75c0942ca	a0a90f64-6f30-4c77-b3ba-ea6fa2f793d0	f	\N	2026-09-22 10:11:24.423326+00
55	4388b79f-dce5-4073-a66c-dcf37ef73a34	2c3db3df4646535b32a0236af8e9242f411bb2695a55236dbd148751c0ec4fd6	2a503e54-af4a-4ff3-91df-61f0f4c37576	f	\N	2026-09-22 10:11:28.696061+00
56	cc751ea4-992a-4e35-968d-e76ddaa8fb12	3e1451dc2532a7bda38db16fa132c681a2c2bb2bb9067c1ec8ce8b795d333f45	1510a921-8d2b-4f28-8885-a83a60938541	f	\N	2026-09-24 21:52:31.61213+00
57	4388b79f-dce5-4073-a66c-dcf37ef73a34	feafd4ba7618e192e295fab516755771bab850164cc53ce6645c90708ee1c558	e038a460-0f38-49df-b5dd-d42a34bdd033	f	\N	2026-09-24 21:52:41.138108+00
\.


--
-- Data for Name: refund_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refund_requests (id, booking_id, reason, amount, status, admin_note, created_at, updated_at, user_id, bank_info) FROM stdin;
\.


--
-- Data for Name: saved_payment_methods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_payment_methods (id, user_id, type, card_brand, last_four, card_holder_name, expiry_month, expiry_year, bank_id, bank_name, bank_code, is_default, is_active, created_at, updated_at) FROM stdin;
0ec3c041-da18-46b5-b86b-62821c27e5ba	cc751ea4-992a-4e35-968d-e76ddaa8fb12	bank	\N	\N	NGUYEN VAN A	\N	\N	0987654321	MBBank	\N	f	t	2026-08-31 20:02:56.360122+00	2026-08-31 20:02:56.360122+00
\.


--
-- Data for Name: seats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seats (id, booking_id, flight_id, seat_number, status, created_at, check_in_status, check_in_time) FROM stdin;
a8a81032-67c9-41e5-8c06-729f50f2ea26	\N	6a9a9e11-1066-48d0-a848-d5984b8e1355	12A	reserved	2026-09-21 08:16:07.966102+00	not_checked_in	\N
a69ffb6e-6e63-4167-a798-b256f69960c7	\N	965d3ba0-5542-47e7-a8d6-ee0c62157fdd	9C	reserved	2026-09-21 08:58:01.839214+00	not_checked_in	\N
a3ae4dfd-35b1-4f9e-a8a8-98ce06a263d2	\N	1589fbe9-db8b-492d-b0ed-9561d3e84f21	7A	reserved	2026-09-21 09:52:34.539708+00	not_checked_in	\N
b7e01f00-2e34-4c01-8b20-ecbc4bf4eb29	\N	1589fbe9-db8b-492d-b0ed-9561d3e84f21	7A	reserved	2026-09-21 09:52:45.370253+00	not_checked_in	\N
8854e87a-5a3b-40ec-b246-ea6e84a11ad5	\N	1589fbe9-db8b-492d-b0ed-9561d3e84f21	7A	reserved	2026-09-21 09:53:07.703923+00	not_checked_in	\N
3f4f8c03-f5c8-4552-b567-c180909d5971	\N	1589fbe9-db8b-492d-b0ed-9561d3e84f21	7A	reserved	2026-09-21 10:56:24.477162+00	not_checked_in	\N
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_config (id, key, value, type, description, category, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_2fa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_2fa (id, user_id, secret, is_enabled, backup_codes, backup_codes_used, last_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_loyalty; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_loyalty (id, user_id, program_id, total_points, available_points, lifetime_points, tier, tier_qualified_at, joined_at, updated_at) FROM stdin;
0159a9da-bc50-44dc-a1f4-a0c612adf2c6	e2a6aec4-e6dc-43e9-902e-d6db804291a6	dd63d020-6d05-48af-a34c-e0a22264352d	0	0	0	Bronze	\N	2026-08-27 16:42:51.303371+00	2026-08-27 16:42:51.303371+00
c700f06e-af07-4fd4-bc97-e84d2f66877e	cc751ea4-992a-4e35-968d-e76ddaa8fb12	dd63d020-6d05-48af-a34c-e0a22264352d	0	0	0	Bronze	\N	2026-08-31 20:21:04.048009+00	2026-08-31 20:21:04.048009+00
1f3d7777-4a4f-4e15-8760-08b9cb8754f9	8484982a-8ffb-4b57-9134-70316fc99e76	dd63d020-6d05-48af-a34c-e0a22264352d	0	0	0	Bronze	\N	2026-09-02 19:35:31.702345+00	2026-09-02 19:35:31.702345+00
032b4510-95d2-46d4-acec-bb81f362e5ce	4388b79f-dce5-4073-a66c-dcf37ef73a34	dd63d020-6d05-48af-a34c-e0a22264352d	0	0	0	Bronze	\N	2026-09-02 20:20:09.735661+00	2026-09-02 20:20:09.735661+00
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, email, password_hash, full_name, role, phone, avatar_url, created_at, updated_at, dob, gender, address, city, country, preferred_language, email_verified, phone_verified, last_login, failed_login_attempts, locked_until) FROM stdin;
e2a6aec4-e6dc-43e9-902e-d6db804291a6	test_kiemtra2@vietjetsim.vn	$2b$12$qkIoJkW7Y8ky2bVutbF7RupnaCv3uVDoNXK48zpyrlwR1K8kAepCG	Nguyen Test 2	super_admin	0912000002	\N	2026-08-27 16:41:51.643655+00	2026-08-27 16:41:51.643655+00	\N	\N	\N	\N	Vietnam	vi	f	f	\N	0	\N
57a67f9a-0599-4774-ac4e-aa4923ac1fe2	manager@vietjetsim.vn	$2b$12$JWGNJUTMFzHkoxu/mHIMo.TnoRpjyw6UQtN8J7Xah.DWYoGm3JD5i	Manager User	user	0912345678	\N	2026-09-21 15:40:52.20588+00	2026-09-22 10:05:31.241219+00	\N	\N	\N	\N	Vietnam	vi	f	f	\N	0	\N
8484982a-8ffb-4b57-9134-70316fc99e76	\N	$2b$12$eyfeiFVAth/0vext/sg8BOlEbCsNLzoNy5VobWmurJ4VTVk05HXA.	Hoang Nguyen	user	9181678911	\N	2026-09-02 19:30:56.461134+00	2026-09-02 19:30:56.461134+00	\N	\N	\N	\N	Vietnam	vi	f	f	\N	0	\N
cc751ea4-992a-4e35-968d-e76ddaa8fb12	user@vietjetsim.vn	$2b$12$1YcoErWW1/72wj9XrTk2CeotEgnXzem23RSaSRhNSzsIcQ5Mnu.7S	Vietjet User	user	0987654321	\N	2026-08-30 23:42:48.599198+00	2026-09-21 10:39:56.039085+00	\N	\N	\N	\N	Vietnam	vi	t	f	\N	0	\N
4388b79f-dce5-4073-a66c-dcf37ef73a34	admin@vietjetsim.vn	$2b$12$ESYMvuKoYLsfp2K1sX9Vse/aE1XOzMKvRyyx8JokY2Nw6BQBoquJm	Administrator	admin	0986349061	\N	2026-08-27 17:59:03.02953+00	2026-09-21 10:39:56.425968+00	\N	\N	\N	\N	Vietnam	vi	t	f	\N	0	\N
8fa7f6b2-c7ff-4af7-8455-4f0e3bd4cc6c	testuser@vietjetsim.vn	$2b$12$7tPyHUyccRqNGKNMoVTwHupmIDV/kRWJnvTtFaNAlBx/AG7WHrrQG	Test User	user	0123456789	\N	2026-09-21 15:40:14.549977+00	2026-09-21 15:40:14.549977+00	\N	\N	\N	\N	Vietnam	vi	f	f	\N	0	\N
7757afbc-eeb8-4650-ad13-dfb3762248d8	superadmin@vietjetsim.vn	$2b$12$rUMavGS9NW/hUWRCHYN5Ruzh1Cx6gby2A2EoE4rZBQBtI8Avg4qU6	Super Administrator	super_admin	0901234567	\N	2026-09-21 15:41:06.665917+00	2026-09-21 15:41:06.665917+00	\N	\N	\N	\N	Vietnam	vi	f	f	\N	0	\N
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, device_name, device_type, browser, os, ip_address, user_agent, last_active, is_current, is_trusted, created_at, expires_at) FROM stdin;
19737bad-3564-4d5b-bcc1-d47e04ace30a	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 10:43:48.814009+00	f	f	2026-09-21 10:43:48.814009+00	2026-10-21 10:43:48.814009+00
f5229a1b-0080-4889-8926-e3dce8753aaf	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 10:43:49.332345+00	f	f	2026-09-21 10:43:49.332345+00	2026-10-21 10:43:49.332345+00
a25baa4e-7312-4f75-9917-f42ee4bcdb0e	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 10:44:49.262979+00	f	f	2026-09-21 10:44:49.262979+00	2026-10-21 10:44:49.262979+00
a76b9ff3-8f67-4839-856a-92604d682a96	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 10:44:54.021023+00	f	f	2026-09-21 10:44:54.021023+00	2026-10-21 10:44:54.021023+00
0b8aea86-9ded-4274-8240-2ad4bc5d0cd8	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:26:57.119079+00	f	f	2026-09-21 15:26:57.119079+00	2026-10-21 15:26:57.119079+00
ae17afd1-1571-46b5-8d03-fe038bec41dc	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:26:57.621976+00	f	f	2026-09-21 15:26:57.621976+00	2026-10-21 15:26:57.621976+00
21427cd1-5b7e-448c-a858-0d315a73b356	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:29:50.751583+00	f	f	2026-09-21 15:29:50.751583+00	2026-10-21 15:29:50.751583+00
f2461aab-dc04-42fd-b85d-d104babef90c	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:32:21.156932+00	f	f	2026-09-21 15:32:21.156932+00	2026-10-21 15:32:21.156932+00
b90e538e-ff4f-40b8-8586-1e7ff0b975f0	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:32:21.903029+00	f	f	2026-09-21 15:32:21.903029+00	2026-10-21 15:32:21.903029+00
34fdbed9-43d3-4a0e-98e2-0af192246a96	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 15:40:46.244102+00	f	f	2026-09-21 15:40:46.244102+00	2026-10-21 15:40:46.244102+00
1213724d-e3b4-4b22-9f16-116d834d62d4	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-21 16:01:02.757264+00	f	f	2026-09-21 16:01:02.757264+00	2026-10-21 16:01:02.757264+00
ec8b1813-5d67-49b3-bd1b-222736be9d3f	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 09:56:14.832512+00	f	f	2026-09-22 09:56:14.832512+00	2026-10-22 09:56:14.832512+00
a87aa5a5-2d83-4331-aea3-4de090fb6f07	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 10:08:46.197084+00	f	f	2026-09-22 10:08:46.197084+00	2026-10-22 10:08:46.197084+00
09f4c1bf-2520-45ae-8929-35dd7a70244d	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 10:08:46.643793+00	f	f	2026-09-22 10:08:46.643793+00	2026-10-22 10:08:46.643793+00
274946f2-d7b8-426f-95ee-47f084b912ca	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 10:11:14.690225+00	f	f	2026-09-22 10:11:14.690225+00	2026-10-22 10:11:14.690225+00
c2986929-8abb-496c-8e84-fcbbed532997	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 10:11:24.459718+00	f	f	2026-09-22 10:11:24.459718+00	2026-10-22 10:11:24.459718+00
b2ef7232-f764-463b-852b-e07a5c7ed566	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-22 10:11:28.730703+00	f	f	2026-09-22 10:11:28.730703+00	2026-10-22 10:11:28.730703+00
ff5686d4-fb66-4d71-8136-04e5dcdf14c3	cc751ea4-992a-4e35-968d-e76ddaa8fb12	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-24 21:52:31.900205+00	f	f	2026-09-24 21:52:31.900205+00	2026-10-24 21:52:31.900205+00
07edec50-b836-4ca0-9271-2f52df8b7772	4388b79f-dce5-4073-a66c-dcf37ef73a34	Không xác định trên Không xác định	desktop	Không xác định	Không xác định	\N	\N	2026-09-24 21:52:41.440135+00	f	f	2026-09-24 21:52:41.440135+00	2026-10-24 21:52:41.440135+00
\.


--
-- Data for Name: user_wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_wallets (id, user_id, balance, currency, created_at, updated_at, account_number) FROM stdin;
08832a79-3cdc-4131-9c15-4690c511b760	e2a6aec4-e6dc-43e9-902e-d6db804291a6	100000.00	VND	2026-08-27 16:41:53.543867+00	2026-08-27 16:41:54.515985+00	VJSIM8749762776
13d1aaef-4930-4a11-90ef-abe9998d477c	cc751ea4-992a-4e35-968d-e76ddaa8fb12	400000.00	VND	2026-08-31 20:02:52.045945+00	2026-08-31 20:02:55.734325+00	VJSIM1644771727
ba1d1b94-82ff-4178-a4d1-1a4cbfea2791	8484982a-8ffb-4b57-9134-70316fc99e76	0.00	VND	2026-09-02 19:34:07.515754+00	2026-09-02 19:34:07.515754+00	VJSIM5647068514
9fc8be68-bc6d-40a7-9a32-427d35dc20cc	4388b79f-dce5-4073-a66c-dcf37ef73a34	5000000.00	VND	2026-09-21 09:52:10.241334+00	2026-09-21 09:52:10.241334+00	970400000001
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_transactions (id, wallet_id, type, amount, balance_before, balance_after, description, reference_id, payment_method_id, status, created_at) FROM stdin;
dd625d30-1bc5-4106-b21f-262f2c78b093	08832a79-3cdc-4131-9c15-4690c511b760	topup	100000.00	0.00	100000.00	test	\N	\N	completed	2026-08-27 16:41:54.515985+00
479d3f4e-7c05-46e0-8937-6f6be9b70210	13d1aaef-4930-4a11-90ef-abe9998d477c	topup	500000.00	0.00	500000.00	Nạp tiền VietQR Demo	\N	\N	completed	2026-08-31 20:02:53.383073+00
731d4322-2d93-4968-b95b-f846437019e9	13d1aaef-4930-4a11-90ef-abe9998d477c	withdraw	100000.00	500000.00	400000.00	Rút tiền về MBBank - 0987654321 (NGUYEN VAN A)	\N	\N	completed	2026-08-31 20:02:55.429284+00
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 57, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_recovery account_recovery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_recovery
    ADD CONSTRAINT account_recovery_pkey PRIMARY KEY (id);


--
-- Name: account_recovery account_recovery_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_recovery
    ADD CONSTRAINT account_recovery_token_key UNIQUE (token);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_user_id_key UNIQUE (user_id);


--
-- Name: agencies agencies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_code_key UNIQUE (code);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: airports airports_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airports
    ADD CONSTRAINT airports_code_key UNIQUE (code);


--
-- Name: airports airports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airports
    ADD CONSTRAINT airports_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_booking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_code_key UNIQUE (booking_code);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_presence chat_presence_conversation_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_conversation_id_role_key UNIQUE (conversation_id, role);


--
-- Name: chat_presence chat_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_pkey PRIMARY KEY (id);


--
-- Name: check_in check_in_check_in_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in
    ADD CONSTRAINT check_in_check_in_number_key UNIQUE (check_in_number);


--
-- Name: check_in check_in_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in
    ADD CONSTRAINT check_in_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: flights flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: loyalty_programs loyalty_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_programs
    ADD CONSTRAINT loyalty_programs_pkey PRIMARY KEY (id);


--
-- Name: loyalty_tiers loyalty_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_tiers
    ADD CONSTRAINT loyalty_tiers_pkey PRIMARY KEY (id);


--
-- Name: loyalty_transactions loyalty_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: passengers passengers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passengers
    ADD CONSTRAINT passengers_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);


--
-- Name: saved_payment_methods saved_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_payment_methods
    ADD CONSTRAINT saved_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_key_key UNIQUE (key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: user_2fa user_2fa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa
    ADD CONSTRAINT user_2fa_pkey PRIMARY KEY (id);


--
-- Name: user_2fa user_2fa_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa
    ADD CONSTRAINT user_2fa_user_id_key UNIQUE (user_id);


--
-- Name: user_loyalty user_loyalty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loyalty
    ADD CONSTRAINT user_loyalty_pkey PRIMARY KEY (id);


--
-- Name: user_loyalty user_loyalty_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loyalty
    ADD CONSTRAINT user_loyalty_user_id_key UNIQUE (user_id);


--
-- Name: user_profiles user_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_email_key UNIQUE (email);


--
-- Name: user_profiles user_profiles_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_account_number_key UNIQUE (account_number);


--
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_key UNIQUE (user_id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: idx_2fa_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_2fa_user_id ON public.user_2fa USING btree (user_id);


--
-- Name: idx_agencies_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agencies_active ON public.agencies USING btree (is_active);


--
-- Name: idx_agencies_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agencies_code ON public.agencies USING btree (code);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_bookings_booking_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_booking_code ON public.bookings USING btree (booking_code);


--
-- Name: idx_chat_conversations_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_updated ON public.chat_conversations USING btree (updated_at DESC);


--
-- Name: idx_chat_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);


--
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at);


--
-- Name: idx_chat_presence_conv_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_conv_role ON public.chat_presence USING btree (conversation_id, role);


--
-- Name: idx_check_in_boarding_pass_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_boarding_pass_number ON public.check_in USING btree (boarding_pass_number);


--
-- Name: idx_check_in_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_booking_id ON public.check_in USING btree (booking_id);


--
-- Name: idx_check_in_check_in_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_check_in_number ON public.check_in USING btree (check_in_number);


--
-- Name: idx_check_in_passenger_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_passenger_id ON public.check_in USING btree (passenger_id);


--
-- Name: idx_check_in_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_in_status ON public.check_in USING btree (status);


--
-- Name: idx_discount_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_active ON public.discount_codes USING btree (is_active);


--
-- Name: idx_discount_codes_agency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_agency ON public.discount_codes USING btree (agency_id);


--
-- Name: idx_discount_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_code ON public.discount_codes USING btree (code);


--
-- Name: idx_discount_codes_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_dates ON public.discount_codes USING btree (start_date, end_date);


--
-- Name: idx_flights_route_depart_time; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_flights_route_depart_time ON public.flights USING btree (from_code, to_code, depart_time);


--
-- Name: idx_login_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_created_at ON public.login_history USING btree (created_at DESC);


--
-- Name: idx_login_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_user_id ON public.login_history USING btree (user_id);


--
-- Name: idx_loyalty_programs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_programs_active ON public.loyalty_programs USING btree (is_active);


--
-- Name: idx_loyalty_tiers_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_tiers_program ON public.loyalty_tiers USING btree (program_id);


--
-- Name: idx_loyalty_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_transactions_created_at ON public.loyalty_transactions USING btree (created_at DESC);


--
-- Name: idx_loyalty_transactions_user_loyalty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_transactions_user_loyalty ON public.loyalty_transactions USING btree (user_loyalty_id);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_payment_methods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_active ON public.saved_payment_methods USING btree (user_id, is_active);


--
-- Name: idx_payment_methods_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_user_id ON public.saved_payment_methods USING btree (user_id);


--
-- Name: idx_recovery_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recovery_token ON public.account_recovery USING btree (token);


--
-- Name: idx_refresh_tokens_family_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_family_id ON public.refresh_tokens USING btree (family_id);


--
-- Name: idx_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_seats_check_in_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_check_in_status ON public.seats USING btree (check_in_status);


--
-- Name: idx_sessions_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_current ON public.user_sessions USING btree (user_id, is_current);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_user_loyalty_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_loyalty_program ON public.user_loyalty USING btree (program_id);


--
-- Name: idx_user_loyalty_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_loyalty_user_id ON public.user_loyalty USING btree (user_id);


--
-- Name: idx_user_profiles_dob; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_dob ON public.user_profiles USING btree (dob);


--
-- Name: idx_user_profiles_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_phone ON public.user_profiles USING btree (phone);


--
-- Name: idx_wallet_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions USING btree (created_at DESC);


--
-- Name: idx_wallet_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: idx_wallets_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_account_number ON public.user_wallets USING btree (account_number);


--
-- Name: idx_wallets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_user_id ON public.user_wallets USING btree (user_id);


--
-- Name: check_in trg_check_in_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_in_update BEFORE UPDATE ON public.check_in FOR EACH ROW EXECUTE FUNCTION public.update_check_in_timestamp();


--
-- Name: agencies update_agencies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_codes update_discount_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: account_recovery account_recovery_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_recovery
    ADD CONSTRAINT account_recovery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: admin_roles admin_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_flight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id);


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);


--
-- Name: chat_conversations chat_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_presence chat_presence_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: check_in check_in_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in
    ADD CONSTRAINT check_in_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: check_in check_in_passenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in
    ADD CONSTRAINT check_in_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.passengers(id) ON DELETE CASCADE;


--
-- Name: check_in check_in_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_in
    ADD CONSTRAINT check_in_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL;


--
-- Name: discount_codes discount_codes_agency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;


--
-- Name: bookings fk_bookings_discount_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_bookings_discount_code FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id);


--
-- Name: flights flights_from_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_from_code_fkey FOREIGN KEY (from_code) REFERENCES public.airports(code);


--
-- Name: flights flights_to_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flights
    ADD CONSTRAINT flights_to_code_fkey FOREIGN KEY (to_code) REFERENCES public.airports(code);


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: loyalty_tiers loyalty_tiers_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_tiers
    ADD CONSTRAINT loyalty_tiers_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id);


--
-- Name: loyalty_transactions loyalty_transactions_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: loyalty_transactions loyalty_transactions_user_loyalty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_user_loyalty_id_fkey FOREIGN KEY (user_loyalty_id) REFERENCES public.user_loyalty(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: passengers passengers_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passengers
    ADD CONSTRAINT passengers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: refund_requests refund_requests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: refund_requests refund_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: saved_payment_methods saved_payment_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_payment_methods
    ADD CONSTRAINT saved_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: seats seats_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: seats seats_flight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_flight_id_fkey FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE CASCADE;


--
-- Name: user_2fa user_2fa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa
    ADD CONSTRAINT user_2fa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: user_loyalty user_loyalty_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loyalty
    ADD CONSTRAINT user_loyalty_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id);


--
-- Name: user_loyalty user_loyalty_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_loyalty
    ADD CONSTRAINT user_loyalty_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.saved_payment_methods(id);


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.user_wallets(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict GvqGkL4oVMH7zbcx4BQNaCwdrFb2DHR5Wc62hShSumrRIWnpwfFUsoA2rUShvhq

