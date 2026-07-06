import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ResourceType {
  id: string;
  name: string;
  description: string | null;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
}

export interface EventResource {
  id: string;
  event_id: string;
  resource_type_id: string;
  quantity: number;
  allocated_by: string;
  allocated_at: string;
  notes: string | null;
  hired_quantity?: number;
  hire_cost?: number;
  resource_type?: ResourceType;
}

export function useResourceTypes() {
  return useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ResourceType[];
    },
  });
}

export function useEventResources(eventId: string) {
  return useQuery({
    queryKey: ['event-resources', eventId],
    queryFn: async () => {
      const { data: allocations, error } = await supabase
        .from('event_resources')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      // Fetch resource type details
      const resourceTypeIds = allocations?.map(a => a.resource_type_id) || [];
      if (resourceTypeIds.length === 0) return [];

      const { data: resourceTypes } = await supabase
        .from('resource_types')
        .select('*')
        .in('id', resourceTypeIds);

      const resourceMap = new Map(resourceTypes?.map(r => [r.id, r]) || []);

      return allocations?.map(allocation => ({
        ...allocation,
        resource_type: resourceMap.get(allocation.resource_type_id)
      })) as EventResource[];
    },
    enabled: !!eventId,
  });
}

export function useAllocateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      resourceTypeId,
      quantity,
      notes,
    }: {
      eventId: string;
      resourceTypeId: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check available quantity
      const { data: resource, error: resourceError } = await supabase
        .from('resource_types')
        .select('available_quantity, name')
        .eq('id', resourceTypeId)
        .single();

      if (resourceError) throw resourceError;
      if (resource.available_quantity < quantity) {
        throw new Error(`Only ${resource.available_quantity} ${resource.name} available`);
      }

      // Allocate resource
      const { error: allocError } = await supabase
        .from('event_resources')
        .upsert({
          event_id: eventId,
          resource_type_id: resourceTypeId,
          quantity,
          allocated_by: user.id,
          notes,
        }, {
          onConflict: 'event_id,resource_type_id'
        });

      if (allocError) throw allocError;

      // Update available quantity
      const { error: updateError } = await supabase
        .from('resource_types')
        .update({
          available_quantity: resource.available_quantity - quantity
        })
        .eq('id', resourceTypeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource allocated',
        description: 'The resource has been allocated to this event.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error allocating resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useBulkAllocateResources() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      allocations,
      totalResourceCost,
    }: {
      eventId: string;
      allocations: {
        resourceTypeId: string;
        quantity: number; // from stock
        hiredQuantity: number;
        hireCost: number; // total hire cost for this resource
      }[];
      totalResourceCost: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      for (const alloc of allocations) {
        if (alloc.quantity === 0 && alloc.hiredQuantity === 0) continue;

        if (alloc.quantity > 0) {
          // Check available quantity for stock allocation FIRST
          const { data: resource, error: resourceError } = await supabase
            .from('resource_types')
            .select('available_quantity, name')
            .eq('id', alloc.resourceTypeId)
            .single();

          if (resourceError) throw resourceError;
          if (resource.available_quantity < alloc.quantity) {
            throw new Error(`Only ${resource.available_quantity} ${resource.name} available (requested ${alloc.quantity})`);
          }
        }

        // Fetch existing allocation to add incrementally
        const { data: existingAlloc } = await supabase
          .from('event_resources')
          .select('*')
          .eq('event_id', eventId)
          .eq('resource_type_id', alloc.resourceTypeId)
          .maybeSingle();

        const oldQty = existingAlloc?.quantity || 0;
        const oldHired = (existingAlloc as any)?.hired_quantity || 0;
        const oldCost = (existingAlloc as any)?.hire_cost || 0;

        const newTotalQty = oldQty + alloc.quantity + alloc.hiredQuantity;
        const newHired = oldHired + alloc.hiredQuantity;
        const newCost = oldCost + alloc.hireCost;

        // Do the upsert into event_resources SECOND (to prevent losing stock if this crashes)
        const { error: allocError } = await supabase
          .from('event_resources')
          .upsert({
            event_id: eventId,
            resource_type_id: alloc.resourceTypeId,
            quantity: newTotalQty,
            hired_quantity: newHired,
            hire_cost: newCost,
            allocated_by: user.id,
          }, {
            onConflict: 'event_id,resource_type_id'
          });

        if (allocError) throw allocError;

        // ONLY deduct stock AFTER the allocation succeeds
        if (alloc.quantity > 0) {
          const { data: resourceToUpdate } = await supabase
            .from('resource_types')
            .select('available_quantity')
            .eq('id', alloc.resourceTypeId)
            .single();
            
          if (resourceToUpdate) {
            const { error: updateError } = await supabase
              .from('resource_types')
              .update({
                available_quantity: resourceToUpdate.available_quantity - alloc.quantity
              })
              .eq('id', alloc.resourceTypeId);

            if (updateError) throw updateError;
          }
        }

        // Audit log
        await supabase.from('resource_audit_log').insert({
          event_id: eventId,
          resource_type_id: alloc.resourceTypeId,
          action: 'allocated',
          quantity: alloc.quantity + alloc.hiredQuantity,
          notes: alloc.hiredQuantity > 0 ? `Includes ${alloc.hiredQuantity} hired resources at UGX ${alloc.hireCost}` : null,
          performed_by: user.id,
        });
      }

      // Update event total resource cost if any
      if (totalResourceCost > 0) {
        const { data: eventData } = await supabase
          .from('events')
          .select('total_resource_cost')
          .eq('id', eventId)
          .single();
          
        const oldTotalCost = (eventData as any)?.total_resource_cost || 0;
        const newTotalCost = oldTotalCost + totalResourceCost;

        const { error: eventUpdateError } = await supabase
          .from('events')
          .update({ total_resource_cost: newTotalCost } as any)
          .eq('id', eventId);

        if (eventUpdateError) throw eventUpdateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['resource-audit-log'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error allocating resources',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeallocateResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      allocationId,
      resourceTypeId,
      quantity,
    }: {
      allocationId: string;
      resourceTypeId: string;
      quantity: number;
    }) => {
      // Delete allocation
      const { error: deleteError } = await supabase
        .from('event_resources')
        .delete()
        .eq('id', allocationId);

      if (deleteError) throw deleteError;

      // Restore available quantity
      const { data: resource, error: resourceError } = await supabase
        .from('resource_types')
        .select('available_quantity')
        .eq('id', resourceTypeId)
        .single();

      if (resourceError) throw resourceError;

      const { error: updateError } = await supabase
        .from('resource_types')
        .update({
          available_quantity: resource.available_quantity + quantity
        })
        .eq('id', resourceTypeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource deallocated',
        description: 'The resource has been returned to inventory.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deallocating resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateResourceType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      total_quantity: number;
    }) => {
      const { error } = await supabase
        .from('resource_types')
        .insert({
          ...data,
          available_quantity: data.total_quantity,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource type created',
        description: 'New resource type has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating resource type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
export function useResourceAvailability(date: string) {
  return useQuery({
    queryKey: ['resource-availability', date],
    queryFn: async () => {
      if (!date) return [];

      // Get all resource types
      const { data: resourceTypes, error: typeError } = await supabase
        .from('resource_types')
        .select('*');

      if (typeError) throw typeError;

      const { data: allocations, error: allocError } = await supabase
        .from('event_resources')
        .select(`
          resource_type_id,
          quantity,
          events!inner(date)
        `)
        .eq('events.date', date);

      if (allocError) throw allocError;

      // Calculate availability
      const availability = resourceTypes.map(type => {
        const reserved = (allocations as any[])
          .filter(a => a.resource_type_id === type.id)
          .reduce((sum, a) => sum + a.quantity, 0);

        return {
          ...type,
          actual_available: type.total_quantity - reserved
        };
      });

      return availability;
    },
    enabled: !!date,
  });
}

// ─── Resource Returns ─────────────────────────────────────────────

export interface ResourceReturn {
  id: string;
  event_resource_id: string;
  event_id: string;
  resource_type_id: string;
  quantity_returned: number;
  condition: 'good' | 'damaged' | 'needs_repair' | 'lost';
  notes: string | null;
  returned_by: string;
  returned_at: string;
  resource_name?: string;
}

export function useReturnResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventResourceId,
      eventId,
      resourceTypeId,
      quantityReturned,
      condition,
      notes,
    }: {
      eventResourceId: string;
      eventId: string;
      resourceTypeId: string;
      quantityReturned: number;
      condition: 'good' | 'damaged' | 'needs_repair' | 'lost';
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Insert return record
      const { error: returnError } = await supabase
        .from('resource_returns')
        .insert({
          event_resource_id: eventResourceId,
          event_id: eventId,
          resource_type_id: resourceTypeId,
          quantity_returned: quantityReturned,
          condition,
          notes: notes || null,
          returned_by: user.id,
        });

      if (returnError) throw returnError;

      // 2. Only restore stock for items in "good" condition
      if (condition === 'good') {
        const { data: resource, error: fetchError } = await supabase
          .from('resource_types')
          .select('available_quantity')
          .eq('id', resourceTypeId)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from('resource_types')
          .update({ available_quantity: resource.available_quantity + quantityReturned })
          .eq('id', resourceTypeId);

        if (updateError) throw updateError;
      }

      // 3. Write audit log entry
      await supabase.from('resource_audit_log').insert({
        event_id: eventId,
        resource_type_id: resourceTypeId,
        action: 'returned',
        quantity: quantityReturned,
        condition,
        performed_by: user.id,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      queryClient.invalidateQueries({ queryKey: ['resource-returns'] });
      queryClient.invalidateQueries({ queryKey: ['resource-audit-log'] });
      toast({
        title: 'Resource returned',
        description: 'The return has been recorded and stock updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error returning resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Check if returns already exist for an event
export function useResourceReturns(eventId: string) {
  return useQuery({
    queryKey: ['resource-returns', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_returns')
        .select('*')
        .eq('event_id', eventId)
        .order('returned_at', { ascending: false });

      if (error) throw error;

      // Fetch resource names
      const resourceTypeIds = [...new Set(data?.map(r => r.resource_type_id) || [])];
      if (resourceTypeIds.length === 0) return data as ResourceReturn[];

      const { data: types } = await supabase
        .from('resource_types')
        .select('id, name')
        .in('id', resourceTypeIds);

      const nameMap = new Map(types?.map(t => [t.id, t.name]) || []);

      return data?.map(r => ({
        ...r,
        resource_name: nameMap.get(r.resource_type_id) || 'Unknown',
      })) as ResourceReturn[];
    },
    enabled: !!eventId,
  });
}

// ─── Audit Log ────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  event_id: string;
  resource_type_id: string;
  action: string;
  quantity: number;
  condition: string | null;
  performed_by: string;
  performed_at: string;
  notes: string | null;
  performer_name?: string;
  resource_name?: string;
}

export function useResourceAuditLog(eventId?: string) {
  return useQuery({
    queryKey: ['resource-audit-log', eventId],
    queryFn: async () => {
      let query = supabase
        .from('resource_audit_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch performer names
      const performerIds = [...new Set(data?.map(r => r.performed_by) || [])];
      const resourceTypeIds = [...new Set(data?.map(r => r.resource_type_id) || [])];

      const [{ data: profiles }, { data: types }] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', performerIds),
        supabase.from('resource_types').select('id, name').in('id', resourceTypeIds),
      ]);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      const typeMap = new Map(types?.map(t => [t.id, t.name]) || []);

      return data?.map(entry => ({
        ...entry,
        performer_name: nameMap.get(entry.performed_by) || 'Unknown',
        resource_name: typeMap.get(entry.resource_type_id) || 'Unknown',
      })) as AuditLogEntry[];
    },
  });
}

// Simple helper mutation to write an audit log entry (used by allocation dialog)
export function useLogResourceAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      resourceTypeId,
      action,
      quantity,
      notes,
    }: {
      eventId: string;
      resourceTypeId: string;
      action: 'allocated' | 'deallocated';
      quantity: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('resource_audit_log').insert({
        event_id: eventId,
        resource_type_id: resourceTypeId,
        action,
        quantity,
        performed_by: user.id,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-audit-log'] });
    },
  });
}
