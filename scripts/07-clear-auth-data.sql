-- Script to clear Supabase authentication data
-- WARNING: This will remove all authentication data and related public schema data. Make sure you have backups if needed.

-- Begin transaction
BEGIN;

-- First, remove data from tables that depend on users
DELETE FROM public.answers;
DELETE FROM public.questions;
DELETE FROM public.resumes;
DELETE FROM public.users;

-- Clear all authentication data from auth schema
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.flow_state;
DELETE FROM auth.saml_relay_states;
DELETE FROM auth.sso_domains;
DELETE FROM auth.sso_providers;
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.users;

-- Verify the cleanup
SELECT COUNT(*) as remaining_auth_users FROM auth.users;
SELECT COUNT(*) as remaining_public_users FROM public.users;
SELECT COUNT(*) as remaining_sessions FROM auth.sessions;
SELECT COUNT(*) as remaining_tokens FROM auth.refresh_tokens;

-- Verify related tables are empty
SELECT COUNT(*) as remaining_answers FROM public.answers;
SELECT COUNT(*) as remaining_questions FROM public.questions;
SELECT COUNT(*) as remaining_resumes FROM public.resumes;

COMMIT; 