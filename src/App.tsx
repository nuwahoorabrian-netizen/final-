import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";

import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import CreateEventPage from "@/pages/CreateEventPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import TicketsPage from "@/pages/TicketsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import RegistrationsPage from "@/pages/RegistrationsPage";
import AttendancePage from "@/pages/AttendancePage";
import MarkAttendancePage from "@/pages/MarkAttendancePage";
import UsersPage from "@/pages/UsersPage";
import ResourcesPage from "@/pages/ResourcesPage";
import MeetingsPage from "@/pages/MeetingsPage";
import EmailSettingsPage from "@/pages/EmailSettingsPage";
import RejectedEventsPage from "@/pages/RejectedEventsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ViewModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/create" element={<CreateEventPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/registrations" element={<RegistrationsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/mark-attendance/:eventId" element={<MarkAttendancePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/email-settings" element={<EmailSettingsPage />} />
              <Route path="/rejected-events" element={<RejectedEventsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ViewModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
