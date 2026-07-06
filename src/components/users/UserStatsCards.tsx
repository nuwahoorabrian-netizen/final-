import { GraduationCap, Briefcase, Shield } from 'lucide-react';
import { UserWithRole } from '@/hooks/useUsers';

interface UserStatsCardsProps {
  users: UserWithRole[];
}

export function UserStatsCards({ users }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {users.filter(u => u.role === 'user' || u.role === 'student').length}
            </p>
            <p className="text-sm text-muted-foreground">Users</p>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {users.filter(u => u.role === 'organizer').length}
            </p>
            <p className="text-sm text-muted-foreground">Organizers</p>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-muted-foreground">Admins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
