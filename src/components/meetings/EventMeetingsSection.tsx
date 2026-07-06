import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingCard } from './MeetingCard';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { useMeetings, useDeleteMeeting, useMarkAttendance } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { useSendCustomMessage } from '@/hooks/useInvitations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface EventMeetingsSectionProps {
  eventId: string;
  eventTitle: string;
  isOrganizer: boolean;
}

export function EventMeetingsSection({
  eventId,
  eventTitle,
  isOrganizer,
}: EventMeetingsSectionProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const { role } = useAuth();
  const { data: meetings, isLoading } = useMeetings(eventId);
  const deleteMeeting = useDeleteMeeting();
  const markAttendance = useMarkAttendance();
  const sendCustom = useSendCustomMessage();

  const canSchedule = isOrganizer || role === 'admin';
  const openCustomDialog = () => setShowCustomDialog(true);
  const closeCustomDialog = () => setShowCustomDialog(false);

  const customForm = useForm({
    resolver: zodResolver(z.object({
      senderEmail: z.string().email('Invalid email'),
      recipientEmail: z.string().email('Invalid email'),
      subject: z.string().min(1, 'Subject required'),
      message: z.string().optional(),
    })),
    defaultValues: {
      senderEmail: '',
      recipientEmail: '',
      subject: '',
      message: '',
    },
  });

  const handleJoin = (meetingId: string, link: string) => {
    markAttendance.mutate({ meetingId, action: 'join' });
    window.open(link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Planning Meetings</h3>
            <p className="text-sm text-muted-foreground">
              {meetings?.length || 0} meeting{meetings?.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
        </div>

        {canSchedule && (
            <>
              <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Schedule
              </Button>
              <Button size="sm" variant="outline" onClick={openCustomDialog} className="ml-2">
                <Send className="w-4 h-4 mr-1" />
                Send Custom Email
              </Button>
            </>
          )}
      </div>

      {meetings && meetings.length > 0 ? (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              showEventTitle={false}
              onDelete={canSchedule ? (id) => deleteMeeting.mutate(id) : undefined}
              onJoin={handleJoin}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No planning meetings scheduled yet.</p>
          {canSchedule && (
            <p className="text-sm mt-1">
              Click "Schedule" to create a meeting.
            </p>
          )}
        </div>
      )}

      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        eventId={eventId}
        eventTitle={eventTitle}
      />
      {/* Custom Email Invitation Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Custom Email Invitation</DialogTitle>
          </DialogHeader>
          <Form {...customForm}>
            <form
              onSubmit={customForm.handleSubmit(async (data) => {
                await sendCustom.mutateAsync({
                  senderEmail: data.senderEmail,
                  recipientEmail: data.recipientEmail,
                  subject: data.subject,
                  message: data.message,
                });
                setShowCustomDialog(false);
                customForm.reset();
              })}
              className="space-y-4 mt-4"
            >
              <FormField name="senderEmail" control={customForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender Email</FormLabel>
                  <FormControl><Input {...field} placeholder="you@domain.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="recipientEmail" control={customForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl><Input {...field} placeholder="recipient@domain.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="subject" control={customForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl><Input {...field} placeholder="Invitation Subject" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="message" control={customForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={4} placeholder="Custom message..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={sendCustom.isPending}>Send</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
