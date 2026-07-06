import { supabase } from '@/integrations/supabase/client';

export async function checkSchedulingConflict(
  date: string,
  venue: string,
  excludeEventId?: string
): Promise<{ hasConflict: boolean; conflictingEvent?: string }> {
  let query = supabase
    .from('events')
    .select('id, title')
    .eq('date', date)
    .eq('venue', venue)
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'rejected');

  if (excludeEventId) {
    query = query.neq('id', excludeEventId);
  }

  const { data, error } = await query.limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    return { hasConflict: true, conflictingEvent: data[0].title };
  }

  return { hasConflict: false };
}
