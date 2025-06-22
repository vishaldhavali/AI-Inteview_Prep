-- Clear Database Script
-- IMPORTANT: This will delete ALL data from the application tables
-- Wrap everything in a transaction for safety
BEGIN;

-- 1. First delete from child tables (those with foreign key dependencies)
DELETE FROM public.answers;
DELETE FROM public.questions;
DELETE FROM public.resumes;

-- 2. Then delete from parent tables
DELETE FROM public.users;

-- 3. Optional: Reset sequences if you want IDs to start from 1 again
-- Only needed for tables with SERIAL primary keys
-- ALTER SEQUENCE public.answers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public.questions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public.resumes_id_seq RESTART WITH 1;

-- Commit the transaction
COMMIT;
