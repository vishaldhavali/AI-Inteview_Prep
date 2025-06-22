-- Check if last_sign_in column exists
DO $$ 
BEGIN
    -- Check if last_sign_in column doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_sign_in'
    ) THEN
        -- Add last_sign_in column if it doesn't exist
        ALTER TABLE public.users
        ADD COLUMN last_sign_in TIMESTAMP WITH TIME ZONE;

        -- Set default value for existing rows
        UPDATE public.users
        SET last_sign_in = created_at;
    END IF;
END $$;

-- Create a function to update last_sign_in
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET last_sign_in = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_last_sign_in_trigger ON auth.users;

-- Create the trigger
CREATE TRIGGER update_last_sign_in_trigger
    AFTER INSERT OR UPDATE
    ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_sign_in(); 