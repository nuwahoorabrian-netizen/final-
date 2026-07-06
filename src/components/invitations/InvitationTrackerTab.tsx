import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Trash2, RefreshCw, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyInvitations, useUpdateInvitationStatus, useDeleteInvitation } from '@/hooks/useInvitations';
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' },
  declined: { label: 'Declined', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
};

export function InvitationTrackerTab() {
  const { data: invitations, isLoading } = useMyInvitations();
  const updateStatus = useUpdateInvitationStatus();
  const deleteInv = useDeleteInvitation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = (invitations || []).filter(inv => {
    const matchSearch =
      inv.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.recipient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.event_title || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or event…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap text-sm">
        {(['pending', 'accepted', 'declined'] as const).map(s => {
          const count = (invitations || []).filter(i => i.status === s).length;
          const cfg = statusConfig[s];
          return (
            <span key={s} className={`px-3 py-1 rounded-full border text-xs font-medium ${cfg.color}`}>
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No invitations found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} invitation{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filtered.map(inv => {
                  const cfg = statusConfig[inv.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={inv.id} className="flex items-start gap-4 p-4 hover:bg-accent/40 transition-colors">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${inv.status === 'accepted' ? 'text-green-600' :
                          inv.status === 'declined' ? 'text-red-600' : 'text-amber-500'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{inv.recipient_name || inv.recipient_email}</p>
                          <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{inv.recipient_email}</p>
                        {inv.event_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📅 {inv.event_title} — {inv.event_date}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent {format(new Date(inv.invited_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {inv.status !== 'accepted' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: 'accepted' })}
                            title="Mark accepted">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {inv.status !== 'declined' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: 'declined' })}
                            title="Mark declined">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {inv.status !== 'pending' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-50"
                            onClick={() => updateStatus.mutate({ id: inv.id, status: 'pending' })}
                            title="Reset to pending">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteInv.mutate(inv.id)}
                          title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
