-- First add the email column without constraints
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing users with email from auth.users
UPDATE public.users
SET email = COALESCE(
  (
    SELECT email 
    FROM auth.users 
    WHERE auth.users.id = public.users.id
  ),
  CONCAT(id, '@temp.local')  -- Fallback email if auth.users email is null
);

-- Now we can safely add the NOT NULL constraint
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- Add unique constraint to email
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create a trigger to automatically sync email from auth.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET email = (
        SELECT email
        FROM auth.users
        WHERE auth.users.id = NEW.id
    )
    WHERE users.id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;

-- Create the trigger
CREATE TRIGGER sync_user_email_trigger
    AFTER INSERT OR UPDATE OF email
    ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_email();

-- Add career_level column to resumes table
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS career_level VARCHAR(50);

-- Add education column as JSONB if not exists
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS education JSONB;

-- Add strengths column as text array
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS strengths TEXT[];

-- Add summary column
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS summary TEXT; 