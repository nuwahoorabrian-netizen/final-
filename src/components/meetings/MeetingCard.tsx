import { motion } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Video,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Users,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Meeting } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';

interface MeetingCardProps {
  meeting: Meeting;
  participantStatus?: 'invited' | 'accepted' | 'declined';
  onDelete?: (id: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onJoin?: (id: string, link: string) => void;
  showEventTitle?: boolean;
}

export function MeetingCard({
  meeting,
  participantStatus,
  onDelete,
  onAccept,
  onDecline,
  onJoin,
  showEventTitle = true,
}: MeetingCardProps) {
  const { user, role } = useAuth();
  const meetingDate = parseISO(meeting.meeting_date);
  const isPastMeeting = isPast(meetingDate) && !isToday(meetingDate);
  const canManage = user?.id === meeting.created_by || role === 'admin';

  const getDateLabel = () => {
    if (isToday(meetingDate)) return 'Today';
    if (isTomorrow(meetingDate)) return 'Tomorrow';
    return format(meetingDate, 'EEE, MMM d');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleJoinClick = () => {
    if (onJoin) {
      onJoin(meeting.id, meeting.meeting_link);
    } else {
      window.open(meeting.meeting_link, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isPastMeeting && "opacity-60"
      )}>
        <div className={cn(
          "h-1",
          isToday(meetingDate) ? "bg-success" : isPastMeeting ? "bg-muted" : "bg-primary"
        )} />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-semibold text-base truncate">{meeting.title}</h3>
              </div>
              {showEventTitle && meeting.event_title && (
                <p className="text-sm text-muted-foreground truncate">
                  Event: {meeting.event_title}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isToday(meetingDate) && !isPastMeeting && (
                <Badge className="bg-success text-success-foreground">
                  Today
                </Badge>
              )}
              {participantStatus && (
                <Badge variant={
                  participantStatus === 'accepted' ? 'default' :
                    participantStatus === 'declined' ? 'destructive' : 'secondary'
                }>
                  {participantStatus}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{getDateLabel()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{meeting.meeting_time} ({formatDuration(meeting.duration_minutes)})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>Hosted by {meeting.creator_name}</span>
          </div>

          {meeting.agenda && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2 text-sm text-muted-foreground cursor-help">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{meeting.agenda}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="whitespace-pre-wrap">{meeting.agenda}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
          {!isPastMeeting && (
            <>
              <Button
                size="sm"
                onClick={handleJoinClick}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {canManage ? 'Start Meeting' : 'Join Meeting'}
              </Button>

              {participantStatus === 'invited' && (
                <>
                  {onAccept && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success hover:bg-success/10"
                          onClick={() => onAccept(meeting.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Accept invitation</TooltipContent>
                    </Tooltip>
                  )}
                  {onDecline && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => onDecline(meeting.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Decline invitation</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </>
          )}

          {canManage && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this meeting and remove all participants. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(meeting.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}