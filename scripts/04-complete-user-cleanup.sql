-- COMPLETE USER DATA CLEANUP SCRIPT
-- This will remove ALL user data including authentication records
-- WARNING: This action is IRREVERSIBLE!

BEGIN;

-- Step 1: Clear all application data (respecting foreign key constraints)
DELETE FROM public.answers;
DELETE FROM public.questions;
DELETE FROM public.resumes;
DELETE FROM public.users;

-- Step 2: Clear authentication data (Supabase Auth tables)
-- Note: These operations require elevated privileges
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Step 3: Clear any audit logs (optional)
DELETE FROM auth.audit_log_entries;

-- Step 4: Clear storage objects (resume files)
DELETE FROM storage.objects WHERE bucket_id = 'resumes';

-- Step 5: Reset any sequences (optional - makes IDs start from 1 again)
-- Uncomment these if you want to reset ID sequences
-- ALTER SEQUENCE auth.users_id_seq RESTART WITH 1;

COMMIT;

-- Verify cleanup
SELECT 
  'auth.users' as table_name, 
  COUNT(*) as remaining_records 
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name, 
  COUNT(*) as remaining_records 
FROM public.users
UNION ALL
SELECT 
  'public.resumes' as table_name, 
  COUNT(*) as remaining_records 
FROM public.resumes
UNION ALL
SELECT 
  'public.questions' as table_name, 
  COUNT(*) as remaining_records 
FROM public.questions
UNION ALL
SELECT 
  'public.answers' as table_name, 
  COUNT(*) as remaining_records 
FROM public.answers
UNION ALL
SELECT 
  'storage.objects' as table_name, 
  COUNT(*) as remaining_records 
FROM storage.objects 
WHERE bucket_id = 'resumes';
