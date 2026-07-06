-- Add hired_quantity and hire_cost to event_resources table
ALTER TABLE public.event_resources 
ADD COLUMN IF NOT EXISTS hired_quantity integer DEFAULT 0;

ALTER TABLE public.event_resources 
ADD COLUMN IF NOT EXISTS hire_cost numeric DEFAULT 0;

-- Add total_resource_cost to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS total_resource_cost numeric DEFAULT 0;

-- Tell PostgREST to reload the schema cache so the new columns are recognized immediately
NOTIFY pgrst, 'reload schema';
