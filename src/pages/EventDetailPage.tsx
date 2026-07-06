import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  User,
  Ticket,
  Edit,
  Loader2,
  Video,
  ExternalLink,
  Package,
  RotateCcw,
  CalendarRange,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent, useUpdateEventMeetingStatus, useDeleteEvent } from '@/hooks/useEvents';
import { getDynamicEventStatus, getDynamicStatusDisplay, dynamicStatusColors } from '@/utils/eventStatus';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { EventMeetingsSection } from '@/components/meetings/EventMeetingsSection';
import { ReturnResourceDialog } from '@/components/resources/ReturnResourceDialog';
import { ResourceAuditLog } from '@/components/resources/ResourceAuditLog';
import { useIsRegistered, useRegisterForEvent, useCancelRegistration, useEventRegistrations } from '@/hooks/useRegistrations';
import { useEventResources } from '@/hooks/useResources';
import { Mail, ShieldCheck } from 'lucide-react';

const categoryColors: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700',
  social: 'bg-pink-100 text-pink-700',
  sports: 'bg-green-100 text-green-700',
  cultural: 'bg-purple-100 text-purple-700',
  workshop: 'bg-orange-100 text-orange-700',
  seminar: 'bg-indigo-100 text-indigo-700',
};

// Inline sub-component: Event Resource Summary
function EventResourceSummary({
  eventId,
  isPastEvent,
  canReturn,
  onReturnClick,
}: {
  eventId: string;
  isPastEvent: boolean;
  canReturn: boolean;
  onReturnClick: () => void;
}) {
  const { data: resources, isLoading } = useEventResources(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!resources || resources.length === 0) return null;

  const totalAllocated = resources.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden mt-6"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Allocated Resources</h3>
          <Badge variant="secondary" className="ml-2">{totalAllocated} total</Badge>
        </div>
        {isPastEvent && canReturn && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReturnClick}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Return Resources
          </Button>
        )}
      </div>
      <div className="divide-y divide-border">
        {resources.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-sm">{r.resource_type?.name || 'Unknown'}</span>
            </div>
            <Badge variant="outline">{r.quantity} units</Badge>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Inline sub-component: Registrant List
function RegistrantList({ eventId }: { eventId: string }) {
  const { data: registrants, isLoading } = useEventRegistrations(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!registrants || registrants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 text-center mt-6"
      >
        <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-20 mb-3" />
        <h3 className="font-semibold text-lg">No Registrants Yet</h3>
        <p className="text-muted-foreground text-sm">Once people sign up, they will appear here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden mt-6"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Event Registrants</h3>
          <Badge variant="secondary" className="ml-2">{registrants.length} total</Badge>
        </div>
        <Button variant="ghost" size="sm" className="text-xs">
          Export List
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/10 text-muted-foreground text-left border-b border-border">
              <th className="px-6 py-3 font-semibold">User</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Registered At</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registrants.map((reg) => (
              <tr key={reg.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {reg.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{reg.user?.name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">{reg.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {reg.attended ? (
                    <Badge className="bg-success/10 text-success border-0 hover:bg-success/20">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Attended
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(reg.registered_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Mail className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id || '');
  const { data: registration, isLoading: isCheckingRegistration } = useIsRegistered(id || '');
  const isRegistered = !!registration;
  const registerMutation = useRegisterForEvent();
  const cancelMutation = useCancelRegistration();
  const updateMeetingStatus = useUpdateEventMeetingStatus();
  const deleteEvent = useDeleteEvent();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Link to="/events">
            <Button variant="link">Back to events</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const spotsLeft = event.capacity - event.registered_count;
  const isAlmostFull = spotsLeft < event.capacity * 0.1;
  const isOwner = user?.id === event.organizer_id;
  const canEdit = isOwner || role === 'admin';

  // An event is only "past" if it was on a previous calendar day
  const eventDateOnly = new Date(event.date);
  eventDateOnly.setHours(0, 0, 0, 0);
  const todayOnly = new Date();
  todayOnly.setHours(0, 0, 0, 0);
  const isPastEvent = eventDateOnly < todayOnly;

  const handleRegister = () => {
    if (event) {
      registerMutation.mutate(event.id);
    }
  };

  const handleUnregister = () => {
    if (event) {
      cancelMutation.mutate(event.id);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            {/* Header */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="h-2 gradient-primary" />
              <div className="p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Event
                      </Button>
                    )}
                    {role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Event
                      </Button>
                    )}
                  </div>
                </div>

                <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

                {/* Online Meeting Controls */}
                {event.category === 'online_meeting' && (
                  <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Online Meeting</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          Status: <span className="text-primary font-medium">{event.meeting_status}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Start Meeting Button (Organizer/Admin) */}
                      {(isOwner || role === 'admin') && event.meeting_status === 'scheduled' && (
                        <Button
                          onClick={() => {
                            updateMeetingStatus.mutate({ id: event.id, status: 'live' });
                            if (event.meeting_link) window.open(event.meeting_link, '_blank');
                          }}
                          className="gradient-primary text-white"
                          disabled={updateMeetingStatus.isPending}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Start Meeting
                        </Button>
                      )}

  {/* Join Meeting Button for Organizer/Admin when live */}
  {(isOwner || role === 'admin') && event.meeting_status === 'live' && (
    <Button
      onClick={() => {
        if (event.meeting_link) window.open(event.meeting_link, '_blank');
      }}
      className="gradient-success text-white"
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      Join Meeting
    </Button>
  )}

  {/* Join Meeting Button for Registered Participants when live or scheduled */}
  {!(isOwner || role === 'admin') && isRegistered && (event.meeting_status === 'live' || event.meeting_status === 'scheduled') && (
    <Button
      onClick={() => {
        if (event.meeting_link) window.open(event.meeting_link, '_blank');
      }}
      className="gradient-success text-white"
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      Join Meeting
    </Button>
  )}


                      {/* End Meeting Button (Organizer/Admin) */}
                      {(isOwner || role === 'admin') && event.meeting_status === 'live' && (
                        <Button
                          variant="outline"
                          onClick={() => updateMeetingStatus.mutate({ id: event.id, status: 'ended' })}
                          disabled={updateMeetingStatus.isPending}
                        >
                          End Meeting
                        </Button>
                      )}
                    </div>
                  </div>
                )}


                <div className="flex items-center gap-4 mb-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{event.organizer_name}</span>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {event.description}
                </p>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date & Time</p>
                      <p className="font-medium">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.time}</p>
                    </div>
                  </div>

                  {event.end_date ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <CalendarRange className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date & Time</p>
                        <p className="font-medium">
                          {new Date(event.end_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {event.end_time && <p className="text-sm text-muted-foreground">{event.end_time}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Time</p>
                        <p className="font-medium">{event.time}</p>
                      </div>
                    </div>
                  )}

                  {/* Duration badge */}
                  {(() => {
                    if (!event.end_date) return null;
                    const s = new Date(event.date); s.setHours(0,0,0,0);
                    const e2 = new Date(event.end_date); e2.setHours(0,0,0,0);
                    const days = Math.round((e2.getTime() - s.getTime()) / 86400000) + 1;
                    if (days <= 0) return null;
                    return (
                      <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                        <CalendarRange className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">Event Duration:</span>
                        <span className="font-bold text-primary">{days === 1 ? '1 Day' : `${days} Days`}</span>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 md:col-span-2">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">{event.venue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Planning Meetings Section */}
            {(role === 'admin' || role === 'organizer') && (
              <EventMeetingsSection
                eventId={event.id}
                eventTitle={event.title}
                isOrganizer={isOwner}
              />
            )}

            {/* Resource Summary Section */}
            {(role === 'admin' || role === 'organizer') && (
              <EventResourceSummary
                eventId={event.id}
                isPastEvent={isPastEvent}
                canReturn={role === 'admin'}
                onReturnClick={() => setShowReturnDialog(true)}
              />
            )}

            {/* Audit Log for this event */}
            {(role === 'admin' || role === 'organizer') && (
              <ResourceAuditLog eventId={event.id} title="Resource Activity Log" />
            )}

            {/* Registrants List — admin & organizer only */}
            {(role === 'admin' || role === 'organizer') && (
              <RegistrantList eventId={event.id} />
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Registration Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Capacity</span>
                </div>
                <span className={cn(
                  "font-semibold",
                  isAlmostFull ? "text-warning" : ""
                )}>
                  {event.registered_count}/{event.capacity}
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    isAlmostFull ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${(event.registered_count / event.capacity) * 100}%` }}
                />
              </div>

              {spotsLeft <= 20 && spotsLeft > 0 && (
                <p className="text-sm text-warning mb-4">Only {spotsLeft} spots left!</p>
              )}

              {(role === 'user' || role === 'student') && (event.status === 'approved' || event.status === 'live') && (
                <>
                  {isPastEvent ? (
                    // Event is in the past — show info only
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center py-2">
                        This event has already taken place.
                      </p>
                      {isRegistered && (
                        <Button
                          className="w-full gradient-success text-white"
                          onClick={() => setShowQRModal(true)}
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          View My Ticket
                        </Button>
                      )}
                    </div>
                  ) : isCheckingRegistration ? (
                    <Button className="w-full" disabled>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </Button>
                  ) : isRegistered ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gradient-success text-white"
                        onClick={() => setShowQRModal(true)}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        View My Ticket
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-destructive text-destructive hover:bg-destructive/10"
                        onClick={handleUnregister}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full gradient-primary text-white"
                      onClick={handleRegister}
                      disabled={spotsLeft <= 0 || registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {registerMutation.isPending ? 'Registering...' : spotsLeft <= 0 ? 'Event Full' : 'Register Now'}
                    </Button>
                  )}
                </>
              )}

              {(role === 'admin' || role === 'organizer') && (event.status === 'approved' || event.status === 'live') && (
                <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Students can register here.</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Button hidden for {role}s)
                  </p>
                </div>
              )}

              {event.status === 'pending' && (
                <p className="text-sm text-warning text-center mt-4">
                  This event is pending approval. Students cannot register yet.
                </p>
              )}
            </div>

            {/* Share Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Share Event</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR Code Preview */}
            {(role === 'organizer' || role === 'admin') && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Event QR Code</h3>
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={`event:${event.id}`}
                    size={150}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Scan to check in attendees
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* QR Code Modal for Users */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Your Event Ticket</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center p-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
                <QRCodeSVG
                  value={`attendance:${registration?.id}`}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {new Date(event.date).toLocaleDateString()} at {event.time}
              </p>
              <p className="text-muted-foreground text-sm">{event.venue}</p>
              <div className="mt-4 p-3 bg-success/10 rounded-lg text-success text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Show this QR code at the venue
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Modal */}
        {
          showEditModal && (
            <EditEventDialog
              open={showEditModal}
              onOpenChange={setShowEditModal}
              event={{
                id: event.id,
                title: event.title,
                description: event.description,
                date: event.date,
                time: event.time,
                venue: event.venue,
                category: event.category,
                capacity: event.capacity,
                meeting_link: event.meeting_link,
                meeting_status: event.meeting_status,
              }}

            />
          )
        }
        {/* Return Resources Dialog */}
        {showReturnDialog && (
          <ReturnResourceDialog
            open={showReturnDialog}
            onOpenChange={setShowReturnDialog}
            eventId={event.id}
            eventTitle={event.title}
          />
        )}

        {/* Delete Event Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{event.title}</strong>? This
                action cannot be undone. All registrations and associated data will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteEvent.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteEvent.isPending}
                onClick={() => {
                  deleteEvent.mutate(event.id, {
                    onSuccess: () => navigate('/events'),
                  });
                }}
              >
                {deleteEvent.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {deleteEvent.isPending ? 'Deleting...' : 'Yes, Delete Event'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout >
  );
}
