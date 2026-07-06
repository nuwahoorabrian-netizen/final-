import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardStats() {
    const { profile, role } = useAuth();
    const isAdmin = role === 'admin';

    return useQuery({
        queryKey: ['dashboard-stats', profile?.user_id, role],
        queryFn: async () => {
            // Get registrations across all events the user can see
            let query = supabase
                .from('registrations')
                .select(`
          id,
          attended,
          event:events (
            id,
            organizer_id
          )
        `);

            const { data: allRegistrations, error } = await query;
            if (error) throw error;

            // Filter based on role if not admin
            const filteredRegistrations = isAdmin
                ? allRegistrations
                : allRegistrations.filter(r => r.event?.organizer_id === profile?.user_id);

            const totalRegistrations = filteredRegistrations.length;
            const totalAttended = filteredRegistrations.filter(r => r.attended).length;

            return {
                totalRegistrations,
                totalAttended
            };
        },
        enabled: !!profile?.user_id,
    });
}
