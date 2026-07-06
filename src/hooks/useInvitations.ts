import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EventInvitation {
  id: string;
  event_id: string;
  sender_id: string;
  recipient_email: string;
  recipient_name: string;
  status: 'pending' | 'accepted' | 'declined';
  personal_note: string | null;
  invited_at: string;
  responded_at: string | null;
  // joined from events view
  event_title?: string;
  event_date?: string;
  event_venue?: string;
}

export interface ContactEntry {
  name: string;
  email: string;
  organization?: string;
}

export interface ContactList {
  id: string;
  owner_id: string;
  name: string;
  contacts: ContactEntry[];
  created_at: string;
  updated_at: string;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
}

export interface SendInvitationPayload {
  event_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  recipients: ContactEntry[];
  personal_note?: string;
  pdf_attachment?: string; // base64 string
  pdf_filename?: string;
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** All invitations sent by the current user (+ admin sees all). */
export function useMyInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitations', 'mine', user?.id],
    queryFn: async (): Promise<EventInvitation[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('event_invitations' as any)
        .select('*, events(title, date, venue)')
        .order('invited_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        event_id: row.event_id,
        sender_id: row.sender_id,
        recipient_email: row.recipient_email,
        recipient_name: row.recipient_name,
        status: row.status,
        personal_note: row.personal_note,
        invited_at: row.invited_at,
        responded_at: row.responded_at,
        event_title: row.events?.title,
        event_date: row.events?.date,
        event_venue: row.events?.venue,
      }));
    },
    enabled: !!user,
  });
}

/** Invitations for a specific event. */
export function useEventInvitations(eventId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitations', 'event', eventId],
    queryFn: async (): Promise<EventInvitation[]> => {
      if (!user || !eventId) return [];

      const { data, error } = await supabase
        .from('event_invitations' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EventInvitation[];
    },
    enabled: !!user && !!eventId,
  });
}

/** Aggregate invitation stats for the current user's invitations. */
export function useInvitationStats(): { data: InvitationStats | undefined; isLoading: boolean } {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitations', 'stats', user?.id],
    queryFn: async (): Promise<InvitationStats> => {
      if (!user) return { total: 0, pending: 0, accepted: 0, declined: 0 };

      const { data, error } = await supabase
        .from('event_invitations' as any)
        .select('status');

      if (error) throw error;

      const rows = (data || []) as { status: string }[];
      return {
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending').length,
        accepted: rows.filter(r => r.status === 'accepted').length,
        declined: rows.filter(r => r.status === 'declined').length,
      };
    },
    enabled: !!user,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Send a batch of invitations for an event. */
export function useSendInvitations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: SendInvitationPayload) => {
      if (!user || !profile) throw new Error('Not authenticated');

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const recipient of payload.recipients) {
        try {
          // 1. Insert DB record
          const { error: insertError } = await supabase
            .from('event_invitations' as any)
            .insert({
              event_id: payload.event_id,
              sender_id: user.id,
              recipient_email: recipient.email,
              recipient_name: recipient.name || recipient.email,
              status: 'pending',
              personal_note: payload.personal_note || null,
            });

          if (insertError) throw new Error(insertError.message);

          // 2. Send email via edge function
          const emailBody: Record<string, any> = {
            notification_type: 'event_invitation',
            recipient_email: recipient.email,
            recipient_name: recipient.name || recipient.email,
            subject: `You're Invited: ${payload.event_title}`,
            event_id: payload.event_id,
            event_title: payload.event_title,
            event_date: payload.event_date,
            event_time: payload.event_time,
            event_venue: payload.event_venue,
            organizer_name: profile.name,
            additional_message: payload.personal_note,
          };

          if (payload.pdf_attachment && payload.pdf_filename) {
            emailBody.pdf_attachment = payload.pdf_attachment;
            emailBody.pdf_filename = payload.pdf_filename;
          }

          const { error: invokeError } = await supabase.functions.invoke(
            'send-email-notification',
            { body: emailBody }
          );

          if (invokeError) throw new Error(invokeError.message);

          results.push({ email: recipient.email, success: true });
        } catch (err: any) {
          results.push({ email: recipient.email, success: false, error: err.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const sent = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      if (sent > 0) {
        toast.success(`${sent} invitation${sent > 1 ? 's' : ''} sent successfully!`);
      }
      if (failed > 0) {
        toast.error(`${failed} invitation${failed > 1 ? 's' : ''} failed to send.`);
      }
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send invitations');
    },
  });
}

/** Update the status of a single invitation. */
export function useUpdateInvitationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('event_invitations' as any)
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status');
    },
  });
}

/** Delete a single invitation. */
export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_invitations' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete invitation');
    },
  });
}

/** Send a custom email message for an event. */
export function useSendCustomMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { senderEmail: string; recipientEmail: string; subject: string; message: string; event_id?: string }) => {
      const emailBody: Record<string, any> = {
        notification_type: 'custom_message',
        sender_email: payload.senderEmail,
        recipient_email: payload.recipientEmail,
        subject: payload.subject,
        message: payload.message,
      };
      if (payload.event_id) emailBody.event_id = payload.event_id;
      const { error } = await supabase.functions.invoke('send-email-notification', { body: emailBody });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Message sent successfully');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send message');
    },
  });
}

// ── Contact Lists ────────────────────────────────────────────────────────────

export function useContactLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contact-lists', user?.id],
    queryFn: async (): Promise<ContactList[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('invitation_contact_lists' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ContactList[];
    },
    enabled: !!user,
  });
}

export function useCreateContactList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, contacts }: { name: string; contacts: ContactEntry[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('invitation_contact_lists' as any)
        .insert({ owner_id: user.id, name, contacts });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contact list created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateContactList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      contacts,
    }: {
      id: string;
      name: string;
      contacts: ContactEntry[];
    }) => {
      const { error } = await supabase
        .from('invitation_contact_lists' as any)
        .update({ name, contacts, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contact list updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteContactList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitation_contact_lists' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contact list deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
