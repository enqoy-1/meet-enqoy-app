-- Create assessment_questions table
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_number INTEGER NOT NULL,
  question_type TEXT NOT NULL, -- 'radio', 'scale', 'text', 'phone', 'date', 'select'
  question_text TEXT NOT NULL,
  description TEXT,
  options JSONB, -- For radio/select options, format: [{"value": "option1", "label": "Option 1"}, ...]
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  section_title TEXT,
  section_description TEXT,
  placeholder_text TEXT,
  validation_rules JSONB, -- For custom validation like min/max age, phone format, etc.
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Admins can manage assessment questions
CREATE POLICY "Admins can manage assessment questions"
ON public.assessment_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Authenticated users can view active assessment questions
CREATE POLICY "Authenticated users can view active questions"
ON public.assessment_questions
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_assessment_questions_updated_at
BEFORE UPDATE ON public.assessment_questions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_assessment_questions_step_order ON public.assessment_questions(step_number, display_order);
CREATE INDEX idx_assessment_questions_active ON public.assessment_questions(is_active);