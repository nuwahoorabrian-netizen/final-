import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, UserPlus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers, useDeleteUser, useAddUser, useUpdateRole, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { UsersTable } from '@/components/users/UsersTable';
import { UserStatsCards } from '@/components/users/UserStatsCards';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
import { AddUserDialog } from '@/components/users/AddUserDialog';
import { UpdateRoleDialog } from '@/components/users/UpdateRoleDialog';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<UserWithRole | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: users = [], isLoading } = useUsers();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: addUser, isPending: isAdding } = useAddUser();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateRole();
  const { user, role } = useAuth();

  const isAdmin = role === 'admin';

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = (userToDelete: UserWithRole) => {
    setUserToDelete(userToDelete);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.user_id, {
        onSuccess: () => setUserToDelete(null)
      });
    }
  };

  const handleEditRole = (userToEdit: UserWithRole) => {
    setUserToUpdate(userToEdit);
  };

  const confirmUpdateRole = (newRole: 'admin' | 'organizer' | 'user') => {
    if (userToUpdate) {
      updateRole({ userId: userToUpdate.user_id, newRole }, {
        onSuccess: () => setUserToUpdate(null)
      });
    }
  };

  const handleAddUser = (data: { name: string; email: string; password: string; role: 'admin' | 'organizer' | 'user' }) => {
    addUser(data, {
      onSuccess: () => setShowAddDialog(false)
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage all users and their roles</p>
          </div>
          {isAdmin && (
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="organizer">Organizer</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <UsersTable
            users={filteredUsers}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onDeleteUser={handleDeleteUser}
            onEditRole={handleEditRole}
          />
        </motion.div>

        {/* Stats */}
        <UserStatsCards users={users} />

        {/* Delete Confirmation Dialog */}
        <DeleteUserDialog
          user={userToDelete}
          open={!!userToDelete}
          onOpenChange={(open) => !open && setUserToDelete(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />

        {/* Update Role Dialog */}
        <UpdateRoleDialog
          user={userToUpdate}
          open={!!userToUpdate}
          onOpenChange={(open) => !open && setUserToUpdate(null)}
          onConfirm={confirmUpdateRole}
          isUpdating={isUpdatingRole}
        />

        {/* Add User Dialog */}
        <AddUserDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAddUser={handleAddUser}
          isLoading={isAdding}
        />
      </div>
    </MainLayout>
  );
}
