-- Add 'online_meeting' to event_category enum
ALTER TYPE public.event_category ADD VALUE IF NOT EXISTS 'online_meeting';

-- Add meeting fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'scheduled' CHECK (meeting_status IN ('scheduled', 'live', 'ended'));

-- Note: The resource_types table already has total_quantity.
-- The event_resource_requests table already has requested_quantity.
-- We will implement the validation logic in the application layer.

-- Create a helper function to get available resource quantity for a given date and time range
-- This is a more complex version of availability check
CREATE OR REPLACE FUNCTION public.get_available_resource_quantity(
    p_resource_type_id UUID,
    p_date DATE,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_quantity INTEGER;
    v_reserved_quantity INTEGER;
BEGIN
    -- Get total quantity of the resource
    SELECT total_quantity INTO v_total_quantity
    FROM public.resource_types
    WHERE id = p_resource_type_id;

    -- Calculate reserved quantity for approved events on that date
    SELECT COALESCE(SUM(er.quantity), 0) INTO v_reserved_quantity
    FROM public.event_resources er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.resource_type_id = p_resource_type_id
    AND e.date = p_date
    AND e.status = 'approved'
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id);

    -- Also consider pending resource requests? 
    -- The requirement says "overlapping events cannot exceed total available resource quantity"
    -- This usually means approved allocations.
    
    RETURN GREATEST(0, v_total_quantity - v_reserved_quantity);
END;
$$;
