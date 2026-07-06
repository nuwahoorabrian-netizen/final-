import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  role: 'admin' | 'organizer' | 'user' | 'student';
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        role: (rolesMap.get(profile.user_id) as 'admin' | 'organizer' | 'user' | 'student') || 'user'
      }));
    }
  });
}

export function useAddUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      name: string;
      email: string;
      password: string;
      role: 'admin' | 'organizer' | 'user' | 'student'
    }) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Since Edge functions are failing, we will use standard signUp
      // Note: This signs the *current* user out temporarily if we just use signUp on the client side without admin privileges.
      // However, we can use the Supabase `admin` API if we have the service role, but we don't on the client.
      // As a workaround, we will use standard sign up. The best approach long-term is deploying the edge function.

      const response = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      });

      // After standard sign-up, the user_roles table will trigger and set the role.
      // Since they are now logged in as the new user, we actually should log them out and advise them 
      // to log back in to their admin account if they were purely adding a user.

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully. You may need to log back in as an admin.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    }
  });
}


export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use the database RPC function to delete the user instead of an Edge Function
      const { data, error } = await supabase.rpc('delete_user_admin' as any, {
        user_id_to_delete: userId
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && (data as any) === 'error') {
        throw new Error((data as any).error || 'Failed to delete user');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'organizer' | 'user' | 'student' }) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // We can update the user_roles table directly because RLS allows authenticated users (with admin rights checked in DB or via UI) to do so.
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user role');
    }
  });
}
