-- Create sandbox notifications log table
CREATE TABLE IF NOT EXISTS public.sandbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder_48h', 'reminder_24h', 'reminder_0h', 'booking_confirmation', 'custom')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'preview' CHECK (status IN ('preview', 'logged', 'sent')),
  simulated_time TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add index for querying
CREATE INDEX idx_sandbox_notifications_event ON public.sandbox_notifications(event_id);
CREATE INDEX idx_sandbox_notifications_user ON public.sandbox_notifications(user_id);
CREATE INDEX idx_sandbox_notifications_type ON public.sandbox_notifications(notification_type);

-- Enable RLS
ALTER TABLE public.sandbox_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can manage all sandbox notifications
CREATE POLICY "Admins can manage sandbox notifications"
  ON public.sandbox_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add sandbox flag to existing tables (non-destructive)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN DEFAULT false;

-- Add indexes for sandbox filtering
CREATE INDEX IF NOT EXISTS idx_profiles_sandbox ON public.profiles(is_sandbox) WHERE is_sandbox = true;
CREATE INDEX IF NOT EXISTS idx_events_sandbox ON public.events(is_sandbox) WHERE is_sandbox = true;
CREATE INDEX IF NOT EXISTS idx_bookings_sandbox ON public.bookings(is_sandbox) WHERE is_sandbox = true;

-- Create sandbox time state table
CREATE TABLE IF NOT EXISTS public.sandbox_time_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frozen_time TIMESTAMP WITH TIME ZONE,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default sandbox time state
INSERT INTO public.sandbox_time_state (is_frozen, frozen_time) 
VALUES (false, now())
ON CONFLICT DO NOTHING;

-- Enable RLS on sandbox_time_state
ALTER TABLE public.sandbox_time_state ENABLE ROW LEVEL SECURITY;

-- Admins can manage sandbox time
CREATE POLICY "Admins can manage sandbox time"
  ON public.sandbox_time_state
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));