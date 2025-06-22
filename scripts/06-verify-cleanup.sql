-- VERIFICATION SCRIPT
-- Run this after cleanup to verify all data has been removed

SELECT 
  'VERIFICATION REPORT' as status,
  NOW() as checked_at;

-- Check all tables for remaining data
SELECT 
  'auth.users' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM auth.users

UNION ALL

SELECT 
  'auth.identities' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM auth.identities

UNION ALL

SELECT 
  'auth.sessions' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM auth.sessions

UNION ALL

SELECT 
  'auth.refresh_tokens' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM auth.refresh_tokens

UNION ALL

SELECT 
  'public.users' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM public.users

UNION ALL

SELECT 
  'public.resumes' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM public.resumes

UNION ALL

SELECT 
  'public.questions' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM public.questions

UNION ALL

SELECT 
  'public.answers' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM public.answers

UNION ALL

SELECT 
  'storage.objects (resumes)' as table_name,
  COUNT(*) as remaining_records,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ HAS DATA'
  END as status
FROM storage.objects 
WHERE bucket_id = 'resumes'

ORDER BY table_name;
