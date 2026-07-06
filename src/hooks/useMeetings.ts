import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meeting {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  meeting_link: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  agenda: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'scheduled' | 'live' | 'ended';
  event_title?: string;
  creator_name?: string;
  participant_status?: 'invited' | 'accepted' | 'declined';
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined';
  attended: boolean;
  joined_at: string | null;
  left_at: string | null;
  invited_at: string;
  user_name?: string;
  user_email?: string;
}

export function useMeetings(eventId?: string) {
  return useQuery({
    queryKey: ['meetings', eventId],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: meetings, error } = await query;

      if (error) throw error;

      // Fetch event titles and creator names
      const eventIds = [...new Set(meetings?.map(m => m.event_id) || [])];
      const creatorIds = [...new Set(meetings?.map(m => m.created_by) || [])];

      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from('events').select('id, title').in('id', eventIds),
        supabase.from('profiles').select('user_id, name').in('user_id', creatorIds),
      ]);

      const eventMap = new Map(events?.map(e => [e.id, e.title]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      return meetings?.map(meeting => ({
        ...meeting,
        event_title: eventMap.get(meeting.event_id) || 'Unknown Event',
        creator_name: profileMap.get(meeting.created_by) || 'Unknown',
      })) as Meeting[];
    },
    refetchInterval: 5000,
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', 'detail', id],
    queryFn: async () => {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!meeting) return null;

      const [{ data: event }, { data: profile }] = await Promise.all([
        supabase.from('events').select('title').eq('id', meeting.event_id).maybeSingle(),
        supabase.from('profiles').select('name').eq('user_id', meeting.created_by).maybeSingle(),
      ]);

      return {
        ...meeting,
        event_title: event?.title || 'Unknown Event',
        creator_name: profile?.name || 'Unknown',
      } as Meeting;
    },
    enabled: !!id,
  });
}

export function useMeetingParticipants(meetingId: string) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      const { data: participants, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      // Fetch user details
      const userIds = participants?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return participants?.map(p => ({
        ...p,
        user_name: profileMap.get(p.user_id)?.name || 'Unknown',
        user_email: profileMap.get(p.user_id)?.email || '',
      })) as MeetingParticipant[];
    },
    enabled: !!meetingId,
  });
}

export function useUserMeetings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get meetings where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('meeting_participants')
        .select('meeting_id, status')
        .eq('user_id', user.id);

      if (partError) throw partError;

      // Get meetings for events user is registered for
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('event_id')
        .eq('user_id', user.id);

      if (regError) throw regError;

      const registeredEventIds = registrations?.map(r => r.event_id) || [];
      const participantMeetingIds = participations?.map(p => p.meeting_id) || [];

      if (registeredEventIds.length === 0 && participantMeetingIds.length === 0) return [];

      // Fetch meetings from both sources
      let allMeetings: any[] = [];

      if (participantMeetingIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select('*')
          .in('id', participantMeetingIds);
        if (data) allMeetings.push(...data);
      }

      if (registeredEventIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select('*')
          .in('event_id', registeredEventIds);
        if (data) allMeetings.push(...data);
      }

      // Deduplicate by id
      const meetingMap = new Map(allMeetings.map(m => [m.id, m]));
      const meetings = [...meetingMap.values()].sort(
        (a, b) => a.meeting_date.localeCompare(b.meeting_date)
      );

      if (meetings.length === 0) return [];

      // Fetch event titles and creator names
      const eventIds = [...new Set(meetings.map(m => m.event_id))];
      const creatorIds = [...new Set(meetings.map(m => m.created_by))];

      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from('events').select('id, title').in('id', eventIds),
        supabase.from('profiles').select('user_id, name').in('user_id', creatorIds),
      ]);

      const eventMap = new Map(events?.map(e => [e.id, e.title]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      const participantStatusMap = new Map(
        participations?.map(p => [p.meeting_id, p.status]) || []
      );

      return meetings.map(meeting => ({
        ...meeting,
        event_title: eventMap.get(meeting.event_id) || 'Unknown Event',
        creator_name: profileMap.get(meeting.created_by) || 'Unknown',
        participant_status: participantStatusMap.get(meeting.id) || 'accepted',
      })) as Meeting[];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      event_id: string;
      title: string;
      description?: string;
      meeting_link: string;
      meeting_date: string;
      meeting_time: string;
      duration_minutes?: number;
      agenda?: string;
      participant_ids?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          event_id: data.event_id,
          title: data.title,
          description: data.description || null,
          meeting_link: data.meeting_link,
          meeting_date: data.meeting_date,
          meeting_time: data.meeting_time,
          duration_minutes: data.duration_minutes || 60,
          agenda: data.agenda || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add participants if provided
      if (data.participant_ids && data.participant_ids.length > 0) {
        const participants = data.participant_ids.map(userId => ({
          meeting_id: meeting.id,
          user_id: userId,
        }));

        const { error: partError } = await supabase
          .from('meeting_participants')
          .insert(participants);

        if (partError) {
          console.error('Error adding participants:', partError);
        }

        // Send email invitations to participants
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', data.participant_ids);

        const { data: eventData } = await supabase
          .from('events')
          .select('title')
          .eq('id', data.event_id)
          .single();

        const formattedDate = new Date(data.meeting_date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        if (profiles) {
          for (const profile of profiles) {
            supabase.functions.invoke('send-email-notification', {
              body: {
                notification_type: 'meeting_scheduled',
                recipient_email: profile.email,
                recipient_user_id: profile.user_id,
                recipient_name: profile.name,
                subject: `📅 Meeting Invitation: ${data.title}`,
                meeting_id: meeting.id,
                meeting_title: data.title,
                meeting_date: formattedDate,
                meeting_time: data.meeting_time,
                meeting_link: data.meeting_link,
                event_title: eventData?.title || '',
              },
            }).catch(err => console.error('Meeting invite email error:', err));
          }
        }
      }

      return meeting;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.event_id] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
      toast({
        title: 'Meeting scheduled',
        description: 'Participants have been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      title?: string;
      description?: string;
      meeting_link?: string;
      meeting_date?: string;
      meeting_time?: string;
      duration_minutes?: number;
      agenda?: string;
    }) => {
      const { error } = await supabase
        .from('meetings')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Send email notifications to participants about the update
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('title, meeting_date, meeting_time, meeting_link, event_id')
        .eq('id', id)
        .single();

      if (meetingData) {
        const { data: participants } = await supabase
          .from('meeting_participants')
          .select('user_id')
          .eq('meeting_id', id);

        if (participants && participants.length > 0) {
          const userIds = participants.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', userIds);

          const formattedDate = new Date(meetingData.meeting_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          });

          if (profiles) {
            for (const profile of profiles) {
              supabase.functions.invoke('send-email-notification', {
                body: {
                  notification_type: 'meeting_updated',
                  recipient_email: profile.email,
                  recipient_user_id: profile.user_id,
                  recipient_name: profile.name,
                  subject: `📝 Meeting Updated: ${meetingData.title}`,
                  meeting_id: id,
                  meeting_title: meetingData.title,
                  meeting_date: formattedDate,
                  meeting_time: meetingData.meeting_time,
                  meeting_link: meetingData.meeting_link,
                },
              }).catch(err => console.error('Meeting update email error:', err));
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
      toast({
        title: 'Meeting updated',
        description: 'Meeting details have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch meeting details and participants BEFORE deleting
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('title, meeting_date, meeting_time, event_id')
        .eq('id', id)
        .single();

      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', id);

      let profiles: { user_id: string; name: string; email: string }[] | null = null;
      if (participants && participants.length > 0) {
        const userIds = participants.map(p => p.user_id);
        const { data } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);
        profiles = data;
      }

      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Send cancellation emails after successful deletion
      if (meetingData && profiles && profiles.length > 0) {
        const formattedDate = new Date(meetingData.meeting_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        for (const profile of profiles) {
          supabase.functions.invoke('send-email-notification', {
            body: {
              notification_type: 'meeting_cancelled',
              recipient_email: profile.email,
              recipient_user_id: profile.user_id,
              recipient_name: profile.name,
              subject: `❌ Meeting Cancelled: ${meetingData.title}`,
              meeting_id: id,
              meeting_title: meetingData.title,
              meeting_date: formattedDate,
              meeting_time: meetingData.meeting_time,
            },
          }).catch(err => console.error('Meeting cancellation email error:', err));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
      toast({
        title: 'Meeting deleted',
        description: 'The meeting has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ meetingId, userId }: { meetingId: string; userId: string }) => {
      const { error } = await supabase
        .from('meeting_participants')
        .insert([{ meeting_id: meetingId, user_id: userId }]);

      if (error) throw error;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      toast({
        title: 'Participant added',
        description: 'The user has been invited to the meeting.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding participant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: 'accepted' | 'declined' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meeting_participants')
        .update({ status })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, action }: { meetingId: string; action: 'join' | 'leave' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = action === 'join'
        ? { attended: true, joined_at: new Date().toISOString() }
        : { left_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('meeting_participants')
        .update(updates)
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      if (action === 'join' && (!data || data.length === 0)) {
        const { error: insertError } = await supabase
          .from('meeting_participants')
          .insert([{
            meeting_id: meetingId,
            user_id: user.id,
            status: 'accepted',
            attended: true,
            joined_at: new Date().toISOString(),
          }]);
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
    },
  });
}

export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: 'scheduled' | 'live' | 'ended' }) => {
      const { error } = await supabase
        .from('meetings')
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
      toast({
        title: `Meeting is now ${status}`,
        description: status === 'live' ? 'The meeting has started.' : 'The meeting status has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating meeting status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

