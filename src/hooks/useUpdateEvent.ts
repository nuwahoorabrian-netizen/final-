import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkSchedulingConflict } from '@/hooks/useSchedulingConflict';

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      date?: string;
      time?: string;
      venue?: string;
      category?: 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar' | 'online_meeting';
      capacity?: number;
      meeting_link?: string | null;
      meeting_status?: 'scheduled' | 'live' | 'ended' | null;
    }) => {

      const { id, ...updateData } = data;

      // Check for scheduling conflicts if date or venue changed
      if (updateData.date && updateData.venue) {
        const conflict = await checkSchedulingConflict(updateData.date, updateData.venue, id);
        if (conflict.hasConflict) {
          throw new Error(`Scheduling conflict: "${conflict.conflictingEvent}" is already booked at ${updateData.venue} on ${updateData.date}`);
        }
      }

      const { error } = await supabase
        .from('events')
        .update({ ...updateData, status: 'pending' } as any)
        .eq('id', id);

      if (error) throw error;

      // Send email notifications to registered users about the update
      const { data: eventData } = await supabase
        .from('events')
        .select('title, date, time, venue')
        .eq('id', id)
        .single();

      if (eventData) {
        const { data: registrations } = await supabase
          .from('registrations')
          .select('user_id')
          .eq('event_id', id);

        if (registrations && registrations.length > 0) {
          const userIds = registrations.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', userIds);

          const formattedDate = new Date(eventData.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          });

          if (profiles) {
            for (const profile of profiles) {
              supabase.functions.invoke('send-email-notification', {
                body: {
                  notification_type: 'event_updated',
                  recipient_email: profile.email,
                  recipient_user_id: profile.user_id,
                  recipient_name: profile.name,
                  subject: `📝 Event Updated: ${eventData.title}`,
                  event_id: id,
                  event_title: eventData.title,
                  event_date: formattedDate,
                  event_time: eventData.time,
                  event_venue: eventData.venue,
                },
              }).catch(err => console.error('Event update email error:', err));
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event updated',
        description: 'The event has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
