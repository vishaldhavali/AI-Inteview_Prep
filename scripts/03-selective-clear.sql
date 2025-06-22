-- Selective Database Clearing Script
-- This script allows you to clear specific parts of the database

-- Option 1: Clear only interview data (answers and questions)
-- Useful when you want to keep user accounts and resumes
BEGIN;
DELETE FROM public.answers;
DELETE FROM public.questions;
COMMIT;

-- Option 2: Clear a specific user's data
-- Replace 'USER_ID_HERE' with the actual user ID
/*
BEGIN;
DELETE FROM public.answers WHERE user_id = 'USER_ID_HERE';
DELETE FROM public.questions WHERE user_id = 'USER_ID_HERE';
DELETE FROM public.resumes WHERE user_id = 'USER_ID_HERE';
-- Uncomment the next line if you want to delete the user account too
-- DELETE FROM public.users WHERE id = 'USER_ID_HERE';
COMMIT;
*/

-- Option 3: Clear old data (older than 30 days)
/*
BEGIN;
DELETE FROM public.answers WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM public.questions WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM public.resumes WHERE uploaded_at < NOW() - INTERVAL '30 days';
COMMIT;
*/
