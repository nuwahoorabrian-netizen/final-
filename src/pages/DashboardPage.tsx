import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  Download,
  Video,
  ScanLine,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EventCard } from '@/components/events/EventCard';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, useUpdateEventStatus } from '@/hooks/useEvents';
import { useMeetings, useUserMeetings, useMarkAttendance, useUpdateParticipantStatus } from '@/hooks/useMeetings';
import { ReportDownloadDialog } from '@/components/reports/ReportDownloadDialog';
import { parseISO, isToday, isFuture, startOfDay, isValid } from 'date-fns';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { EventsByMonthList } from '@/components/dashboard/EventsByMonthList';


export default function DashboardPage() {
  const { profile, role } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: allMeetings, isLoading: loadingAll } = useMeetings();
  const { data: userMeetings, isLoading: loadingUser } = useUserMeetings();
  const markAttendance = useMarkAttendance();
  const updateStatus = useUpdateParticipantStatus();
  const updateStatusMutation = useUpdateEventStatus();
  const { data: stats } = useDashboardStats();
  const [reportOpen, setReportOpen] = useState(false);

  const isAdmin = role === 'admin';
  const isOrganizer = role === 'organizer';
  const meetings = isAdmin || isOrganizer ? allMeetings : userMeetings;
  const meetingsLoading = isAdmin || isOrganizer ? loadingAll : loadingUser;

  const approvedEvents = events?.filter(e => e.status === 'approved' || e.status === 'live') || [];
  const pendingEvents = events?.filter(e => e.status === 'pending') || [];
  
  const upcomingEvents = approvedEvents.filter(e => {
    try {
      if (!e.date) return false;
      const parsed = parseISO(e.date);
      if (!isValid(parsed)) return false;
      const d = startOfDay(parsed);
      return d.getTime() >= startOfDay(new Date()).getTime();
    } catch { return false; }
  }).slice(0, 3);

  const pastEvents = approvedEvents.filter(e => {
    try {
      if (!e.date) return false;
      const parsed = parseISO(e.date);
      if (!isValid(parsed)) return false;
      const d = startOfDay(parsed);
      return d.getTime() < startOfDay(new Date()).getTime();
    } catch { return false; }
  }).slice(0, 3);

  const upcomingMeetings = meetings?.filter(m => {
    if (!m.meeting_date) return false;
    const date = parseISO(m.meeting_date);
    if (!isValid(date)) return false;
    return (isToday(date) || isFuture(date)) && m.status !== 'ended';
  }).slice(0, 3) || [];


  // Calculate analytics from real data — role-aware
  const dashboardEvents = isAdmin ? (events || []) : (events?.filter(e => e.organizer_id === profile?.user_id) || []);
  const totalEvents = dashboardEvents.length;
  const totalRegistrations = stats?.totalRegistrations || 0;
  const totalAttended = stats?.totalAttended || 0;
  const rolePendingEvents = dashboardEvents.filter(e => e.status === 'pending');

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleApprove = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'approved' });
  };

  const handleReject = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'rejected' });
  };

  const handleJoinMeeting = (meetingId: string, link: string) => {
    markAttendance.mutate({ meetingId, action: 'join' });
    window.open(link, '_blank');
  };

  const handleAccept = (meetingId: string) => {
    updateStatus.mutate({ meetingId, status: 'accepted' });
  };

  const handleDecline = (meetingId: string) => {
    updateStatus.mutate({ meetingId, status: 'declined' });
  };


  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-primary mb-2"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">{greeting()}</span>
          </motion.div>

          {/* Title row — Download Report button lives here (admin only) */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold"
              >
                Welcome back, {profile?.name?.split(' ')[0] || 'User'}!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mt-1"
              >
                Here's what's happening with your events today.
              </motion.p>
            </div>

            {/* Admin-only Action Buttons */}
            {role === 'admin' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <Link to="/attendance">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5 shadow-sm"
                  >
                    <ScanLine className="w-4 h-4" />
                    Scan Tickets
                  </Button>
                </Link>
                <Button
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Stats Grid — admin and organizer */}
        {(isAdmin || isOrganizer) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Events"
              value={totalEvents}
              icon={Calendar}
              variant="primary"
              delay={0}
            />
            <StatCard
              title="Total Registrations"
              value={totalRegistrations.toLocaleString()}
              icon={Users}
              variant="success"
              delay={0.1}
            />
            <StatCard
              title={isAdmin ? "Pending Approvals" : "My Pending Events"}
              value={rolePendingEvents.length}
              icon={Clock}
              variant="warning"
              delay={0.2}
            />
            <StatCard
              title="Total Attendance Tracking"
              value={`${totalAttended} / ${totalRegistrations}`}
              icon={CheckCircle}
              variant="accent"
              delay={0.3}
            />
          </div>
        )}

        {/* Quick Actions & Pending */}
        {role === 'admin' && pendingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                <h2 className="text-xl font-semibold">Pending Approvals</h2>
              </div>
              <Link to="/approvals">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.organizer_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gradient-success text-white"
                      onClick={() => handleApprove(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Events Grouped By Month - Admin Only */}
        {role === 'admin' && dashboardEvents.length > 0 && (
          <EventsByMonthList events={dashboardEvents} />
        )}


        {/* Upcoming & Live Meetings Highlight */}
        {upcomingMeetings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
              </div>
              <Link to="/meetings">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  participantStatus={meeting.participant_status}
                  onJoin={handleJoinMeeting}
                  onAccept={((role as any) === 'user' || (role as any) === 'student') ? handleAccept : undefined}
                  onDecline={((role as any) === 'user' || (role as any) === 'student') ? handleDecline : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Events */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            <Link to="/events">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : upcomingEvents.length > 0 ? (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description || '',
                    date: event.date,
                    time: event.time,
                    venue: event.venue,
                    category: event.category,
                    capacity: event.capacity,
                    registeredCount: event.registered_count,
                    attendedCount: event.attended_count,
                    status: event.status,
                    organizerId: event.organizer_id,
                    organizerName: event.organizer_name || 'Unknown',
                    imageUrl: event.image_url || undefined,
                    qrCode: event.qr_code || undefined,
                    meeting_link: event.meeting_link,
                    meeting_status: event.meeting_status,
                    createdAt: event.created_at
                  }}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming events yet
            </div>
          )}
        </motion.div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-muted-foreground">Past Events</h2>
              <Link to="/events">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                {pastEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={{
                      id: event.id,
                      title: event.title,
                      description: event.description || '',
                      date: event.date,
                      time: event.time,
                      venue: event.venue,
                      category: event.category,
                      capacity: event.capacity,
                      registeredCount: event.registered_count,
                      attendedCount: event.attended_count,
                      status: event.status,
                      organizerId: event.organizer_id,
                      organizerName: event.organizer_name || 'Unknown',
                      imageUrl: event.image_url || undefined,
                      qrCode: event.qr_code || undefined,
                      meeting_link: event.meeting_link,
                      meeting_status: event.meeting_status,
                      createdAt: event.created_at
                    }}
                    index={index}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Report Download Dialog — admin only, rendered at page level */}
      {role === 'admin' && (
        <ReportDownloadDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          events={events || []}
        />
      )}
    </MainLayout>
  );
}
