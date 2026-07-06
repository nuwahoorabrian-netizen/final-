import { useState } from 'react';
import { Loader2, User, Mail, Shield, Users, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'organizer' | 'user' | 'student';

const roles = [
  {
    value: 'user' as UserRole,
    label: 'User',
    icon: BookOpen,
    description: 'Browse and attend events',
    color: 'border-blue-500 bg-blue-500/10 text-blue-600'
  },
  {
    value: 'organizer' as UserRole,
    label: 'Organizer',
    icon: Users,
    description: 'Create and manage events',
    color: 'border-green-500 bg-green-500/10 text-green-600'
  },
  {
    value: 'admin' as UserRole,
    label: 'Admin',
    icon: Shield,
    description: 'Full system access',
    color: 'border-purple-500 bg-purple-500/10 text-purple-600'
  },
  {
    value: 'student' as UserRole,
    label: 'Student',
    icon: GraduationCap,
    description: 'Standard student access',
    color: 'border-orange-500 bg-orange-500/10 text-orange-600'
  },
];

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddUser: (data: { name: string; email: string; password: string; role: UserRole }) => void;
  isLoading: boolean;
}

export function AddUserDialog({ open, onOpenChange, onAddUser, isLoading }: AddUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUser({ name, email, password, role: selectedRole });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRole('user');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with a specific role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>User Role</Label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200",
                      isSelected
                        ? role.color + " border-current"
                        : "border-border hover:border-muted-foreground/50 bg-card"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 mb-1",
                      isSelected ? "" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "" : "text-muted-foreground"
                    )}>
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {roles.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gradient-primary text-primary-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
