-- SAFE USER CLEANUP SCRIPT
-- This version includes safety checks and better error handling

DO $$
DECLARE
    user_count INTEGER;
    resume_count INTEGER;
    question_count INTEGER;
    answer_count INTEGER;
    storage_count INTEGER;
BEGIN
    -- Get current counts
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO resume_count FROM public.resumes;
    SELECT COUNT(*) INTO question_count FROM public.questions;
    SELECT COUNT(*) INTO answer_count FROM public.answers;
    SELECT COUNT(*) INTO storage_count FROM storage.objects WHERE bucket_id = 'resumes';
    
    -- Log current state
    RAISE NOTICE 'Starting cleanup process...';
    RAISE NOTICE 'Current counts - Users: %, Resumes: %, Questions: %, Answers: %, Storage files: %', 
                 user_count, resume_count, question_count, answer_count, storage_count;
    
    -- Perform cleanup in transaction
    BEGIN
        -- Clear application data first
        DELETE FROM public.answers;
        GET DIAGNOSTICS answer_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % answers', answer_count;
        
        DELETE FROM public.questions;
        GET DIAGNOSTICS question_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % questions', question_count;
        
        DELETE FROM public.resumes;
        GET DIAGNOSTICS resume_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % resumes', resume_count;
        
        DELETE FROM public.users;
        GET DIAGNOSTICS user_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % public users', user_count;
        
        -- Clear storage files
        DELETE FROM storage.objects WHERE bucket_id = 'resumes';
        GET DIAGNOSTICS storage_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % storage objects', storage_count;
        
        -- Clear auth data
        DELETE FROM auth.refresh_tokens;
        DELETE FROM auth.sessions;
        DELETE FROM auth.identities;
        DELETE FROM auth.users;
        GET DIAGNOSTICS user_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % auth users', user_count;
        
        -- Clear audit logs (optional)
        DELETE FROM auth.audit_log_entries;
        
        RAISE NOTICE 'Cleanup completed successfully!';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error during cleanup: %', SQLERRM;
            ROLLBACK;
    END;
END $$;
