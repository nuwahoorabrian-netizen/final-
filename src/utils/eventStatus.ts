import { isToday, isPast, parseISO, startOfDay } from 'date-fns';

export type DynamicStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'live' | 'past' | 'upcoming';

export function getDynamicEventStatus(baseStatus: string, dateString: string): DynamicStatus {
  if (baseStatus !== 'approved' && baseStatus !== 'live') {
    return baseStatus as DynamicStatus;
  }
  
  try {
    if (!dateString) return baseStatus as DynamicStatus;
    const eventDate = parseISO(dateString);
    if (isNaN(eventDate.getTime())) return baseStatus as DynamicStatus;
    
    const today = startOfDay(new Date());
    const eventDay = startOfDay(eventDate);
    
    if (eventDay.getTime() === today.getTime()) {
      return 'live';
    } else if (eventDay.getTime() < today.getTime()) {
      return 'past';
    } else {
      // Upcoming, we can show 'approved' or 'upcoming'
      // The user said: "when the event is approved it should be showing Approved."
      return 'approved';
    }
  } catch (e) {
    return baseStatus as DynamicStatus;
  }
}

export function getDynamicStatusDisplay(status: DynamicStatus): string {
  switch (status) {
    case 'live':
      return 'Live Now';
    case 'past':
      return 'Past';
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export const dynamicStatusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  live: 'bg-primary/10 text-primary border-primary/20 animate-pulse',
  past: 'bg-muted text-muted-foreground border-muted',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-muted',
  upcoming: 'bg-info/10 text-info border-info/20',
};
