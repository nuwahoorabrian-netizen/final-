import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserWithRole } from '@/hooks/useUsers';
import { useState, useEffect } from 'react';

interface UpdateRoleDialogProps {
    user: UserWithRole | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (role: 'admin' | 'organizer' | 'user' | 'student') => void;
    isUpdating: boolean;
}

export function UpdateRoleDialog({
    user,
    open,
    onOpenChange,
    onConfirm,
    isUpdating,
}: UpdateRoleDialogProps) {
    const [role, setRole] = useState<'admin' | 'organizer' | 'user' | 'student'>('user');

    useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(role);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update User Role</DialogTitle>
                    <DialogDescription>
                        Change the role for {user?.name}. This will affect their permissions in the system.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select value={role} onValueChange={(v: 'admin' | 'organizer' | 'user' | 'student') => setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="organizer">Organizer</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Update Role'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
