-- SECURITY FIX: Remove role column from profiles table to prevent privilege escalation
-- Roles should only be stored in user_roles table

-- First, verify data consistency (user_roles should have all the roles)
-- This is a safety check before dropping the column

-- Drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update the handle_new_user() function to NOT insert role into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert to profiles WITHOUT role column (security fix)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Role ONLY goes to user_roles table (single source of truth)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  
  RETURN NEW;
END;
$function$;