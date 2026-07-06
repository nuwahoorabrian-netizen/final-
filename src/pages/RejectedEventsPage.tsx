import { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, Edit, Loader2, Calendar, MapPin, Clock, Users, User } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEvents } from '@/hooks/useEvents';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { Link } from 'react-router-dom';

export default function RejectedEventsPage() {
  const { data: events, isLoading } = useEvents();
  const rejectedEvents = events?.filter(e => e.status === 'rejected') || [];

  const [editingEvent, setEditingEvent] = useState<typeof rejectedEvents[0] | null>(null);

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold flex items-center gap-3"
            >
              <XCircle className="w-8 h-8 text-destructive" />
              Rejected Events
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {rejectedEvents.length} rejected event{rejectedEvents.length !== 1 ? 's' : ''} — edit and resubmit for approval
            </motion.p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Rejected Events List */}
        {!isLoading && (
          <div className="space-y-4">
            {rejectedEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                className="bg-card rounded-xl border border-destructive/20 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge className="bg-destructive/10 text-destructive border-0 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {event.category}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-semibold mb-1">{event.title}</h3>

                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">
                        Submitted by <span className="font-medium text-foreground">{event.organizer_name}</span>
                      </p>
                    </div>

                    {event.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Capacity: {event.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-shrink-0 flex-wrap">
                    <Link to={`/events/${event.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="gradient-primary text-white"
                      onClick={() => setEditingEvent(event)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit & Resubmit
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && rejectedEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No rejected events</h3>
            <p className="text-muted-foreground">All events are in good standing.</p>
          </motion.div>
        )}

        {/* Edit Event Dialog */}
        {editingEvent && (
          <EditEventDialog
            open={!!editingEvent}
            onOpenChange={(open) => { if (!open) setEditingEvent(null); }}
            event={{
              id: editingEvent.id,
              title: editingEvent.title,
              description: editingEvent.description,
              date: editingEvent.date,
              time: editingEvent.time,
              venue: editingEvent.venue,
              category: editingEvent.category,
              capacity: editingEvent.capacity,
              meeting_link: editingEvent.meeting_link,
              meeting_status: editingEvent.meeting_status,
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
