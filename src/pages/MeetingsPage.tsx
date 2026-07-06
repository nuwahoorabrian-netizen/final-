import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Loader2, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import {
  useMeetings,
  useUserMeetings,
  useDeleteMeeting,
  useUpdateParticipantStatus,
  useMarkAttendance,
} from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { parseISO, isToday, isFuture, isPast, isValid } from 'date-fns';

export default function MeetingsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Admins/organizers see all meetings, users see their invited meetings
  const { data: allMeetings, isLoading: loadingAll } = useMeetings();
  const { data: userMeetings, isLoading: loadingUser } = useUserMeetings();

  const deleteMeeting = useDeleteMeeting();
  const updateStatus = useUpdateParticipantStatus();
  const markAttendance = useMarkAttendance();

  const isAdmin = role === 'admin';
  const isOrganizer = role === 'organizer';
  const meetings = isAdmin || isOrganizer ? allMeetings : userMeetings;
  const isLoading = isAdmin || isOrganizer ? loadingAll : loadingUser;

  const upcomingMeetings = meetings?.filter(m => {
    if (!m.meeting_date) return false;
    const date = parseISO(m.meeting_date);
    if (!isValid(date)) return false;
    return isToday(date) || isFuture(date);
  }) || [];

  const pastMeetings = meetings?.filter(m => {
    if (!m.meeting_date) return false;
    const date = parseISO(m.meeting_date);
    if (!isValid(date)) return false;
    return isPast(date) && !isToday(date);
  }) || [];

  const todayMeetings = meetings?.filter(m => {
    if (!m.meeting_date) return false;
    const date = parseISO(m.meeting_date);
    if (!isValid(date)) return false;
    return isToday(date);
  }) || [];

  const handleJoin = (meetingId: string, link: string) => {
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Planning Meetings</h1>
          </div>
          <p className="text-muted-foreground">
            {isAdmin || isOrganizer
              ? 'Manage and participate in event planning meetings'
              : 'View and join your scheduled planning meetings'}
          </p>
        </motion.div>

        {/* Today's Meetings Highlight */}
        {todayMeetings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-success" />
              <h2 className="font-semibold text-success">Today's Meetings</h2>
              <span className="bg-success text-success-foreground text-xs px-2 py-0.5 rounded-full">
                {todayMeetings.length}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todayMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  participantStatus={meeting.participant_status}
                  onJoin={handleJoin}
                  onDelete={isAdmin || isOrganizer ? (id) => deleteMeeting.mutate(id) : undefined}
                  onAccept={((role as any) === 'user' || (role as any) === 'student') ? handleAccept : undefined}
                  onDecline={((role as any) === 'user' || (role as any) === 'student') ? handleDecline : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" className="gap-2">
              Upcoming
              {upcomingMeetings.length > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">
                  {upcomingMeetings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Past
              {pastMeetings.length > 0 && (
                <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
                  {pastMeetings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="upcoming">
                {upcomingMeetings.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingMeetings
                      .filter(m => {
                        if (!m.meeting_date) return true;
                        const d = parseISO(m.meeting_date);
                        return !isValid(d) || !isToday(d);
                      })
                      .map(meeting => (
                        <MeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          participantStatus={meeting.participant_status}
                          onJoin={handleJoin}
                          onDelete={isAdmin || isOrganizer ? (id) => deleteMeeting.mutate(id) : undefined}
                          onAccept={((role as any) === 'user' || (role as any) === 'student') ? handleAccept : undefined}
                          onDecline={((role as any) === 'user' || (role as any) === 'student') ? handleDecline : undefined}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No upcoming meetings"
                    description={
                      isAdmin || isOrganizer
                        ? 'Schedule meetings from event detail pages.'
                        : 'You have no scheduled meetings coming up.'
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="past">
                {pastMeetings.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pastMeetings.map(meeting => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        showEventTitle
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No past meetings"
                    description="Past meetings will appear here."
                  />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
