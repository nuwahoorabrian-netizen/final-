import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ResourceRequest {
  id: string;
  event_id: string;
  resource_type_id: string;
  requested_quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  requested_at: string;
  requested_by: string;
  resource_name?: string;
}

export function useResourceRequests(eventId?: string) {
  return useQuery({
    queryKey: ['resource-requests', eventId],
    queryFn: async () => {
      let query = supabase
        .from('event_resource_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch resource type names
      const resourceTypeIds = [...new Set(data?.map(r => r.resource_type_id) || [])];
      const { data: resourceTypes } = await supabase
        .from('resource_types')
        .select('id, name')
        .in('id', resourceTypeIds);

      const resourceMap = new Map(resourceTypes?.map(r => [r.id, r.name]) || []);

      return data?.map(request => ({
        ...request,
        resource_name: resourceMap.get(request.resource_type_id) || 'Unknown'
      })) as ResourceRequest[];
    },
    enabled: true,
  });
}

export function useCreateResourceRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      event_id: string;
      resource_type_id: string;
      requested_quantity: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('event_resource_requests')
        .insert([{
          event_id: data.event_id,
          resource_type_id: data.resource_type_id,
          requested_quantity: data.requested_quantity,
          notes: data.notes || null,
          requested_by: user.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error requesting resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateBulkResourceRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      event_id: string;
      requests: Array<{
        resource_type_id: string;
        requested_quantity: number;
        notes?: string;
      }>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const records = data.requests.map(req => ({
        event_id: data.event_id,
        resource_type_id: req.resource_type_id,
        requested_quantity: req.requested_quantity,
        notes: req.notes || null,
        requested_by: user.id,
      }));

      const { error } = await supabase
        .from('event_resource_requests')
        .insert(records);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-requests'] });
      toast({
        title: 'Resources requested',
        description: 'Your resource requests have been submitted for approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error requesting resources',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
