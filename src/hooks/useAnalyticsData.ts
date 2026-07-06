import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsCardsData {
    totalEvents: number;
    totalUsers: number;
    totalRegistrants: number;
    totalAttendance: number;
    totalResources: number;
    allocatedResources: number;
    upcomingEvents: number;
}

export const useAnalyticsData = () => {
    const [data, setData] = useState<AnalyticsCardsData>({
        totalEvents: 0,
        totalUsers: 0,
        totalRegistrants: 0,
        totalAttendance: 0,
        totalResources: 0,
        allocatedResources: 0,
        upcomingEvents: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 1. Total Events
                const { count: eventsCount, error: eventsError } = await supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true });
                if (eventsError) throw eventsError;

                // 2. Total Active Users
                const { count: usersCount, error: usersError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });
                if (usersError) throw usersError;

                // 3. Total Registered Students
                const { count: registrantsCount, error: registrantsError } = await supabase
                    .from('registrations')
                    .select('*', { count: 'exact', head: true });
                if (registrantsError) throw registrantsError;

                // 4. Total Attendance Records
                const { count: attendanceCount, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('*', { count: 'exact', head: true });
                if (attendanceError) throw attendanceError;

                // 5. Total Resources Available
                // Need to sum the 'total_quantity' column instead of counting rows
                const { data: resourcesData, error: resourcesError } = await supabase
                    .from('resource_types')
                    .select('total_quantity');
                if (resourcesError) throw resourcesError;
                const totalResources = resourcesData?.reduce((sum, item) => sum + (item.total_quantity || 0), 0) || 0;

                // 6. Total Resources Allocated
                // Sum 'quantity' from 'event_resources'
                const { data: allocatedData, error: allocatedError } = await supabase
                    .from('event_resources')
                    .select('quantity');
                if (allocatedError) throw allocatedError;
                const allocatedResources = allocatedData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

                // 7. Upcoming Events Count
                const today = new Date().toISOString().split('T')[0];
                const { count: upcomingCount, error: upcomingError } = await supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .gte('date', today);
                if (upcomingError) throw upcomingError;

                setData({
                    totalEvents: eventsCount || 0,
                    totalUsers: usersCount || 0,
                    totalRegistrants: registrantsCount || 0,
                    totalAttendance: attendanceCount || 0,
                    totalResources,
                    allocatedResources,
                    upcomingEvents: upcomingCount || 0,
                });

            } catch (err: any) {
                console.error('Error fetching analytics data:', err);
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, isLoading, error };
};
