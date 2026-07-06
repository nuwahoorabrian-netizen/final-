import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  attended: boolean;
  attended_at: string | null;
  // Joined fields
  event?: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
    category: string;
    status: string;
    image_url: string | null;
  };
}

// Get current user's registrations
export function useMyRegistrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-registrations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('registrations')
        .select(`
           *,
           event:events (
             id,
             title,
             date,
             time,
             venue,
             category,
             status,
             image_url
           )
         `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data as Registration[];
    },
    enabled: !!user,
  });
}

// Check if user is registered for a specific event
export function useIsRegistered(eventId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['registration', eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Registration | null;
    },
    enabled: !!user && !!eventId,
  });
}

// Get all registrations for an event (for admins/organizers)
export function useEventRegistrations(eventId: string) {
  return useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for registrations
      const userIds = registrations?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, department')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return registrations?.map(reg => ({
        ...reg,
        user: profileMap.get(reg.user_id)
      })) || [];
    },
    enabled: !!eventId,
  });
}

// Get recent registrations across events (for admins/organizers)
export function useRecentRegistrations(limit = 5) {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  return useQuery({
    queryKey: ['recent-registrations', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('registrations')
        .select(`
          *,
          event:events (
            id,
            title,
            organizer_id
          )
        `)
        .order('registered_at', { ascending: false })
        .limit(limit);

      // If organizer, only show registrations for their events
      // (Supabase RLS handles this, but we can be explicit if needed)
      // Actually RLS for registrations_select is currently 'true' for authenticated.
      // We should probably rely on RLS if possible, but let's filter in JS if RLS is too broad.

      const { data: registrations, error } = await query;

      if (error) throw error;

      // Further filter for organizers if RLS allows more than they should see
      const filteredRegistrations = isAdmin
        ? registrations
        : registrations?.filter(r => r.event?.organizer_id === user.id) || [];

      if (filteredRegistrations.length === 0) return [];

      // Get user profiles for registrations
      const userIds = [...new Set(filteredRegistrations.map(r => r.user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return filteredRegistrations.map(reg => ({
        ...reg,
        user: profileMap.get(reg.user_id)
      }));
    },
    enabled: !!user && (role === 'admin' || role === 'organizer'),
  });
}

// Register for an event
export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Guard: fetch event date/time and reject if the event is already past
      const { data: eventCheck, error: eventCheckError } = await supabase
        .from('events')
        .select('date, time')
        .eq('id', eventId)
        .single();

      if (eventCheckError) throw eventCheckError;

      const eventDateOnly = new Date(eventCheck.date);
      eventDateOnly.setHours(0, 0, 0, 0);
      const todayOnly = new Date();
      todayOnly.setHours(0, 0, 0, 0);

      if (eventDateOnly < todayOnly) {
        throw new Error('Cannot register for a past event.');
      }

      const { data, error } = await supabase
        .from('registrations')
        .insert([{ event_id: eventId, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      // Fetch event details and user profile for email
      const [{ data: eventData }, { data: profile }] = await Promise.all([
        supabase.from('events').select('title, date, time, venue').eq('id', eventId).single(),
        supabase.from('profiles').select('name, email').eq('user_id', user.id).single(),
      ]);

      if (eventData && profile) {
        // Send in-app registration confirmation notification
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: 'event_registration',
          title: '🎟️ Registration Confirmed!',
          message: `You have successfully registered for "${eventData.title}" on ${new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${eventData.time}, ${eventData.venue}. A confirmation email has been sent to you.`,
          event_id: eventId,
        }]);

        // Send registration confirmation email
        supabase.functions.invoke('send-email-notification', {
          body: {
            notification_type: 'event_registration',
            recipient_email: profile.email,
            recipient_user_id: user.id,
            recipient_name: profile.name,
            subject: `✅ Registration Confirmed: ${eventData.title}`,
            event_id: eventId,
            event_title: eventData.title,
            event_date: new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            event_time: eventData.time,
            event_venue: eventData.venue,
          },
        }).catch(err => console.error('Registration email error:', err));
      }

      return data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Registration successful!',
        description: 'You have been registered for this event. A confirmation email has been sent.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Cancel registration
export function useCancelRegistration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Registration cancelled',
        description: 'You have been unregistered from this event.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Mark attendance (for admins/organizers)
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ registrationId, attended }: { registrationId: string; attended: boolean }) => {
      const { error } = await supabase
        .from('registrations')
        .update({
          attended,
          attended_at: attended ? new Date().toISOString() : null
        })
        .eq('id', registrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Attendance updated',
        description: 'The attendance has been recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}