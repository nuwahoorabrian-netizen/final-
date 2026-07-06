import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, ArrowRight, Video, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDynamicEventStatus, getDynamicStatusDisplay, dynamicStatusColors } from '@/utils/eventStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateEventMeetingStatus } from '@/hooks/useEvents';

interface EventCardProps {
  event: Event;
  index?: number;
}

const categoryColors: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700',
  social: 'bg-pink-100 text-pink-700',
  sports: 'bg-green-100 text-green-700',
  cultural: 'bg-purple-100 text-purple-700',
  workshop: 'bg-orange-100 text-orange-700',
  seminar: 'bg-indigo-100 text-indigo-700',
  online_meeting: 'bg-teal-100 text-teal-700',
};



export function EventCard({ event, index = 0 }: EventCardProps) {
  const { user, role } = useAuth();
  const updateMeetingStatus = useUpdateEventMeetingStatus();
  const spotsLeft = event.capacity - event.registeredCount;
  const isAlmostFull = spotsLeft < event.capacity * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group relative bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20"
    >
      {/* Category gradient strip */}
      <div className="h-1 gradient-primary" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className={cn("font-medium capitalize", categoryColors[event.category])}>
                {event.category}
              </Badge>
              {(() => {
                const dynStatus = getDynamicEventStatus(event.status, event.date);
                const displayStatus = getDynamicStatusDisplay(dynStatus);
                const colorClass = dynamicStatusColors[dynStatus] || dynamicStatusColors.pending;
                return (
                  <Badge variant="outline" className={cn("font-medium capitalize", colorClass)}>
                    {displayStatus}
                  </Badge>
                );
              })()}
            </div>
            <h3 className="text-xl font-semibold truncate group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">by {event.organizerName}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {event.description}
        </p>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className={cn(
                "text-sm font-medium",
                isAlmostFull ? "text-warning" : "text-muted-foreground"
              )}>
                {event.registeredCount}/{event.capacity} registered
              </span>
            </div>
            <Link to={`/events/${event.id}`}>
              <Button variant="ghost" size="sm" className="group/btn">
                Details
                <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Start/Join Online Meeting directly from card */}
          {event.category === 'online_meeting' && event.meeting_link && (
            <div className="flex gap-2 w-full mt-1">
              {(user?.id === event.organizerId || role === 'admin') ? (
                <>
                  {event.meeting_status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateMeetingStatus.mutate({ id: event.id, status: 'live' });
                        window.open(event.meeting_link!, '_blank');
                      }}
                      className="gradient-primary text-white flex-1 text-xs font-semibold"
                      disabled={updateMeetingStatus.isPending}
                    >
                      <Video className="w-3.5 h-3.5 mr-1" />
                      Start Meeting
                    </Button>
                  )}
                  {event.meeting_status === 'live' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => window.open(event.meeting_link!, '_blank')}
                        className="gradient-success text-white flex-1 text-xs font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Join Meeting
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateMeetingStatus.mutate({ id: event.id, status: 'ended' })}
                        className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                        disabled={updateMeetingStatus.isPending}
                      >
                        End
                      </Button>
                    </>
                  )}
                  {event.meeting_status === 'ended' && (
                    <Badge variant="outline" className="w-full justify-center text-xs py-1">
                      Meeting Ended
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  {(event.meeting_status === 'live' || event.meeting_status === 'scheduled') && (
                    <Button
                      size="sm"
                      onClick={() => window.open(event.meeting_link!, '_blank')}
                      className="gradient-success text-white flex-1 text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Join Meeting
                    </Button>
                  )}
                  {event.meeting_status === 'ended' && (
                    <Badge variant="outline" className="w-full justify-center text-xs py-1">
                      Meeting Ended
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
