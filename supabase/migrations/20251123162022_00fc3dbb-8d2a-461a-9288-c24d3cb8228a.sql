-- Create table for outside city interest registrations
CREATE TABLE IF NOT EXISTS public.outside_city_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  specified_city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outside_city_interests ENABLE ROW LEVEL SECURITY;

-- Admin can view all outside city interests
CREATE POLICY "Admins can view all outside city interests"
ON public.outside_city_interests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admin can manage outside city interests
CREATE POLICY "Admins can manage outside city interests"
ON public.outside_city_interests
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));