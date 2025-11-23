-- Drop the pairing_events table and update all foreign keys to use the existing events table

-- First, drop all indexes
DROP INDEX IF EXISTS public.idx_pairing_guests_event;
DROP INDEX IF EXISTS public.idx_pairing_guests_email;
DROP INDEX IF EXISTS public.idx_pairing_restaurants_event;
DROP INDEX IF EXISTS public.idx_pairing_tables_restaurant;
DROP INDEX IF EXISTS public.idx_pairing_pairs_event;
DROP INDEX IF EXISTS public.idx_pairing_assignments_event;
DROP INDEX IF EXISTS public.idx_pairing_assignments_guest;
DROP INDEX IF EXISTS public.idx_pairing_constraints_event;
DROP INDEX IF EXISTS public.idx_pairing_audit_log_event;

-- Drop all tables that reference pairing_events
DROP TABLE IF EXISTS public.pairing_audit_log CASCADE;
DROP TABLE IF EXISTS public.pairing_constraints CASCADE;
DROP TABLE IF EXISTS public.pairing_assignments CASCADE;
DROP TABLE IF EXISTS public.pairing_pairs CASCADE;
DROP TABLE IF EXISTS public.pairing_guests CASCADE;
DROP TABLE IF EXISTS public.pairing_events CASCADE;

-- Now recreate them with references to the existing events table

-- Guests table
CREATE TABLE public.pairing_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  dietary_notes TEXT,
  gender TEXT,
  age_range TEXT,
  friend_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pairings table
CREATE TABLE public.pairing_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  pairing_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assignments table
CREATE TABLE public.pairing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.pairing_guests(id) ON DELETE CASCADE,
  pairing_id UUID REFERENCES public.pairing_pairs(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES public.pairing_restaurants(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.pairing_tables(id) ON DELETE SET NULL,
  seat_number INTEGER,
  status assignment_status NOT NULL DEFAULT 'assigned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, guest_id)
);

-- Constraints table
CREATE TABLE public.pairing_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type constraint_type NOT NULL,
  subject_guest_ids UUID[] NOT NULL,
  target_guest_ids UUID[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit log table
CREATE TABLE public.pairing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate indexes
CREATE INDEX idx_pairing_guests_event ON public.pairing_guests(event_id);
CREATE INDEX idx_pairing_guests_email ON public.pairing_guests(email);
CREATE INDEX idx_pairing_restaurants_event ON public.pairing_restaurants(event_id);
CREATE INDEX idx_pairing_tables_restaurant ON public.pairing_tables(restaurant_id);
CREATE INDEX idx_pairing_pairs_event ON public.pairing_pairs(event_id);
CREATE INDEX idx_pairing_assignments_event ON public.pairing_assignments(event_id);
CREATE INDEX idx_pairing_assignments_guest ON public.pairing_assignments(guest_id);
CREATE INDEX idx_pairing_constraints_event ON public.pairing_constraints(event_id);
CREATE INDEX idx_pairing_audit_log_event ON public.pairing_audit_log(event_id);

-- Recreate triggers
CREATE TRIGGER update_pairing_guests_updated_at BEFORE UPDATE ON public.pairing_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_pairing_updated_at();

CREATE TRIGGER update_pairing_pairs_updated_at BEFORE UPDATE ON public.pairing_pairs
  FOR EACH ROW EXECUTE FUNCTION public.update_pairing_updated_at();

CREATE TRIGGER update_pairing_assignments_updated_at BEFORE UPDATE ON public.pairing_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_pairing_updated_at();

CREATE TRIGGER update_pairing_constraints_updated_at BEFORE UPDATE ON public.pairing_constraints
  FOR EACH ROW EXECUTE FUNCTION public.update_pairing_updated_at();

-- Recreate RLS policies
ALTER TABLE public.pairing_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pairing guests" ON public.pairing_guests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pairing pairs" ON public.pairing_pairs
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pairing assignments" ON public.pairing_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pairing constraints" ON public.pairing_constraints
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view pairing audit log" ON public.pairing_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));