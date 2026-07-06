export type UserRole = 'admin' | 'organizer' | 'user';

export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'live';

export type EventCategory = 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar' | 'online_meeting';


export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  category: EventCategory;
  capacity: number;
  registeredCount: number;
  attendedCount: number;
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  imageUrl?: string;
  qrCode?: string;
  meeting_link?: string | null;
  meeting_status?: string | null;
  total_resource_cost?: number;
  createdAt: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: string;
  attended: boolean;
  attendedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  totalEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  attendanceRate: number;
  popularEvents: { name: string; registrations: number }[];
  departmentParticipation: { department: string; count: number }[];
  monthlyTrends: { month: string; events: number; registrations: number }[];
}
