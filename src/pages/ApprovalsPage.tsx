import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Loader2, Package, AlertTriangle, User } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEvents, useUpdateEventStatus } from '@/hooks/useEvents';
import { useEventResources } from '@/hooks/useResources';
import { ResourceHiringDialog } from '@/components/resources/ResourceHiringDialog';
import { useToast } from '@/hooks/use-toast';

function EventResourceStatus({ eventId }: { eventId: string }) {
  const { data: resources } = useEventResources(eventId);
  const hasResources = resources && resources.length > 0;

  return (
    <Badge
      className={`flex items-center gap-1 border-0 ${hasResources
        ? 'bg-success/10 text-success'
        : 'bg-destructive/10 text-destructive'
        }`}
    >
      {hasResources ? (
        <>
          <Package className="w-3 h-3" />
          Resources Allocated ({resources.length})
        </>
      ) : (
        <>
          <AlertTriangle className="w-3 h-3" />
          No Resources Allocated
        </>
      )}
    </Badge>
  );
}

export default function ApprovalsPage() {
  const { data: events, isLoading } = useEvents();
  const updateStatusMutation = useUpdateEventStatus();
  const pendingEvents = events?.filter(e => e.status === 'pending') || [];
  const { toast } = useToast();

  const [hiringDialogOpen, setHiringDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);

  const handleApprove = (eventId: string, eventTitle: string) => {
    setSelectedEvent({ id: eventId, title: eventTitle });
    setHiringDialogOpen(true);
  };


  const handleReject = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'rejected' });
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Pending Approvals
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {pendingEvents.length} events awaiting review
            </motion.p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Pending Events List */}
        {!isLoading && (
          <div className="space-y-4">
            {pendingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-warning/20 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge className="bg-warning/10 text-warning border-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Review
                      </Badge>
                      {((event.organizer_role as any) === 'user' || (event.organizer_role as any) === 'student') && (
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Organizer Request
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {event.category}
                      </Badge>
                      <EventResourceStatus eventId={event.id} />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-muted-foreground text-sm">
                        Submitted by <span className="font-medium text-foreground">{event.organizer_name}</span>
                      </p>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 uppercase tracking-wider">
                        {event.organizer_role}
                      </Badge>
                    </div>
                    {(event.organizer_role === 'user' || event.organizer_role === 'student') && (
                      <p className="text-xs text-purple-600 mb-2 italic">
                        * Approving this event will promote this user to the Organizer role.
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                      <span>🕐 {event.time}</span>
                      <span>📍 {event.venue}</span>
                      <span>👥 Capacity: {event.capacity}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-shrink-0 flex-wrap">
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="gradient-success text-white"
                      onClick={() => handleApprove(event.id, event.title)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && pendingEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No events pending approval</p>
          </motion.div>
        )}
      </div>

      {/* Resource Allocation Dialog */}
      {selectedEvent && (
        <ResourceHiringDialog
          open={hiringDialogOpen}
          onOpenChange={setHiringDialogOpen}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onSuccess={() => setHiringDialogOpen(false)}
        />
      )}
    </MainLayout>
  );
}
