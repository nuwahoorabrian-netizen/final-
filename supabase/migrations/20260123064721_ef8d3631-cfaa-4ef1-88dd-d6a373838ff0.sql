-- Create event status enum
CREATE TYPE public.event_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Create event category enum
CREATE TYPE public.event_category AS ENUM ('academic', 'social', 'sports', 'cultural', 'workshop', 'seminar');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  venue TEXT NOT NULL,
  category event_category NOT NULL DEFAULT 'academic',
  capacity INTEGER NOT NULL DEFAULT 100,
  registered_count INTEGER NOT NULL DEFAULT 0,
  attended_count INTEGER NOT NULL DEFAULT 0,
  status event_status NOT NULL DEFAULT 'pending',
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resource types table
CREATE TABLE public.resource_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event resource allocations table
CREATE TABLE public.event_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  resource_type_id UUID NOT NULL REFERENCES public.resource_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  allocated_by UUID NOT NULL REFERENCES auth.users(id),
  allocated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(event_id, resource_type_id)
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_resources ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Anyone can view approved events"
ON public.events FOR SELECT
USING (status = 'approved' OR organizer_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = organizer_id AND (has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Organizers can update their own events"
ON public.events FOR UPDATE
USING (organizer_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Resource types policies (admins only)
CREATE POLICY "Anyone can view resource types"
ON public.resource_types FOR SELECT
USING (true);

CREATE POLICY "Admins can manage resource types"
ON public.resource_types FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Event resources policies
CREATE POLICY "Anyone can view event resources"
ON public.event_resources FOR SELECT
USING (true);

CREATE POLICY "Admins can manage event resources"
ON public.event_resources FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on events
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default resource types
INSERT INTO public.resource_types (name, description, total_quantity, available_quantity) VALUES
('Chairs', 'Standard event chairs', 500, 500),
('Tables', 'Folding tables for events', 100, 100),
('Projectors', 'HD projectors for presentations', 10, 10),
('Computers', 'Laptops for workshops', 30, 30),
('Music Instruments', 'Various musical instruments', 20, 20),
('Microphones', 'Wireless microphones', 15, 15),
('Speakers', 'PA system speakers', 8, 8),
('Whiteboards', 'Portable whiteboards', 12, 12);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_resources;