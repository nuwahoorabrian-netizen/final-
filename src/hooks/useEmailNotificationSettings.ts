import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailNotificationSetting {
  id: string;
  notification_type: string;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserEmailPreference {
  id: string;
  user_id: string;
  notification_type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailNotificationLog {
  id: string;
  notification_type: string;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  event_id: string | null;
  meeting_id: string | null;
  sent_at: string | null;
  created_at: string;
}

// Hook to fetch all email notification settings (admin only)
export function useEmailNotificationSettings() {
  return useQuery({
    queryKey: ['email-notification-settings'],
    queryFn: async (): Promise<EmailNotificationSetting[]> => {
      const { data, error } = await supabase
        .from('email_notification_settings')
        .select('*')
        .order('notification_type');

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to toggle a notification setting (admin only)
export function useToggleEmailNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationType, enabled }: { notificationType: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('email_notification_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('notification_type', notificationType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-settings'] });
      toast.success('Email notification setting updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update setting');
    },
  });
}

// Hook to fetch user's email preferences
export function useUserEmailPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-email-preferences', user?.id],
    queryFn: async (): Promise<UserEmailPreference[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

// Hook to update user's email preference
export function useUpdateUserEmailPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ notificationType, enabled }: { notificationType: string; enabled: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Try to upsert the preference
      const { error } = await supabase
        .from('user_email_preferences')
        .upsert(
          {
            user_id: user.id,
            notification_type: notificationType,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,notification_type' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-email-preferences', user?.id] });
      toast.success('Email preference updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update preference');
    },
  });
}

// Hook to fetch email notification logs (admin or own logs)
export function useEmailNotificationLogs(limit = 50) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['email-notification-logs', user?.id, role, limit],
    queryFn: async (): Promise<EmailNotificationLog[]> => {
      if (!user) return [];

      let query = supabase
        .from('email_notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Non-admins only see their own logs
      if (role !== 'admin') {
        query = query.eq('recipient_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

// Get a friendly name for notification types
export function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    event_created: 'Event Created',
    event_updated: 'Event Updated',
    event_cancelled: 'Event Cancelled',
    event_approved: 'Event Approved',
    event_rejected: 'Event Rejected',
    event_registration: 'Event Registration Confirmation',
    meeting_scheduled: 'Meeting Scheduled',
    meeting_updated: 'Meeting Updated',
    meeting_cancelled: 'Meeting Cancelled',
    meeting_invitation: 'Meeting Invitation',
    event_reminder: 'Event Reminder',
    meeting_reminder: 'Meeting Reminder',
    role_assigned: 'Role Assigned',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get an icon/color for notification status
export function getNotificationStatusColor(status: string): string {
  switch (status) {
    case 'sent':
      return 'text-green-600 bg-green-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
