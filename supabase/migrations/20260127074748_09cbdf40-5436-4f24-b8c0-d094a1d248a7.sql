-- Create table for resource requests by organizers when creating events
CREATE TABLE public.event_resource_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  resource_type_id UUID NOT NULL REFERENCES public.resource_types(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.event_resource_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizers can create resource requests for their events"
ON public.event_resource_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can view resource requests for their events or admins can see all"
ON public.event_resource_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND organizer_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update resource requests"
ON public.event_resource_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete resource requests"
ON public.event_resource_requests FOR DELETE
USING (has_role(auth.uid(), 'admin'));