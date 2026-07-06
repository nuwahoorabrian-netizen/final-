import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle,
  XCircle,
  Users,
  Clock,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/hooks/useEvents';
import { useEventRegistrations, useMarkAttendance } from '@/hooks/useRegistrations';
import { QRScanner } from '@/components/attendance/QRScanner';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [recentScans, setRecentScans] = useState<{ name: string; time: string; success: boolean; message?: string }[]>([]);
  const [scanResult, setScanResult] = useState<{ name: string; success: boolean; message: string } | null>(null);

  const { user, role } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();

  // Filter events: Admins see all approved/live events, organizers see their own events.
  const scanableEvents = events?.filter(e => {
    if (role === 'admin') return e.status === 'approved' || e.status === 'live';
    if (e.organizer_id === user?.id) return true; // Organizers can see and scan for their own events
    return e.status === 'approved' || e.status === 'live';
  }) || [];

  console.log('--- SCANNER DEBUG ---');
  console.log('User ID:', user?.id);
  console.log('User Role:', role);
  console.log('Total Events fetched:', events?.length);
  console.log('Events matching scanable filter:', scanableEvents.length);
  scanableEvents.forEach(e => {
    console.log(`Event: ${e.title} | Status: ${e.status} | Organizer: ${e.organizer_id}`);
  });
  console.log('---------------------');

  const event = scanableEvents.find(e => e.id === selectedEvent);

  const { data: registrations } = useEventRegistrations(selectedEvent);
  const markAttendance = useMarkAttendance();

  const checkedInCount = registrations?.filter(r => r.attended).length || 0;
  const totalRegistered = registrations?.length || 0;

  const processQrCode = (code: string) => {
    let ticketEventId: string | null = null;
    let registrationId: string | null = null;

    // Handle different QR code formats
    if (code.startsWith('http')) {
      // Handle URL format: .../checkin?event=...&user=...&reg=...
      try {
        const url = new URL(code);
        if (url.pathname.includes('checkin')) {
          ticketEventId = url.searchParams.get('event');
          registrationId = url.searchParams.get('reg');
        }
      } catch {
        // Ignore invalid URLs
      }
    } else {
      // Not an HTTP URL — try newer attendance:... format or legacy ticket:... format
      const parts = code.split(':');
      if (parts.length >= 2 && parts[0] === 'attendance') {
        registrationId = parts[1];
        ticketEventId = selectedEvent; // We look up the event context from what the user selected
      } else if (parts.length >= 4 && parts[0] === 'ticket') {
        ticketEventId = parts[1];
        registrationId = parts[3];
      }
    }

    if (!ticketEventId || !registrationId) {
      addScan('Unknown', false, 'Invalid QR code format');
      toast({ title: 'Invalid QR code', description: 'This is not a valid ticket QR code.', variant: 'destructive' });
      return;
    }

    if (ticketEventId !== selectedEvent) {
      addScan('Wrong event', false, 'QR code is for a different event');
      toast({ title: 'Wrong event', description: 'This ticket is for a different event.', variant: 'destructive' });
      return;
    }

    const registration = registrations?.find(r => r.id === registrationId);
    if (!registration) {
      addScan('Unknown attendee', false, 'Registration not found');
      toast({ title: 'Not registered', description: 'This attendee is not registered for this event.', variant: 'destructive' });
      return;
    }

    if (registration.attended) {
      const userName = registration.user?.name || 'Attendee';
      addScan(userName, false, 'Already checked in');
      toast({ title: 'Already checked in', description: `${userName} was already checked in.` });
      return;
    }

    const userName = registration.user?.name || 'Attendee';
    markAttendance.mutate(
      { registrationId, attended: true },
      {
        onSuccess: () => {
          addScan(userName, true, 'Checked in successfully');
          showScanResult(userName, true, 'Successfully Checked In!');
        },
        onError: () => {
          addScan(userName, false, 'Check-in failed');
          showScanResult(userName, false, 'Check-in Failed');
        }
      }
    );
  };

  const showScanResult = (name: string, success: boolean, message: string) => {
    setScanResult({ name, success, message });
    setTimeout(() => setScanResult(null), 2800);
  };

  const addScan = (name: string, success: boolean, message?: string) => {
    setRecentScans(prev => [
      { name, time: 'Just now', success, message },
      ...prev.slice(0, 19)
    ]);
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    processQrCode(manualCode.trim());
    setManualCode('');
  };

  return (
    <MainLayout>
      {/* ── Scan Result Overlay ── */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
            scanResult.success ? 'bg-success/95' : 'bg-destructive/95'
          } backdrop-blur-sm`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5, times: [0, 0.6, 1] }}
          >
            {scanResult.success ? (
              <CheckCircle className="w-32 h-32 text-white drop-shadow-xl" />
            ) : (
              <XCircle className="w-32 h-32 text-white drop-shadow-xl" />
            )}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mt-6 text-center"
          >
            {scanResult.message}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-white/80 text-2xl mt-3 font-medium"
          >
            {scanResult.name}
          </motion.p>
        </motion.div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            Attendance Scanner
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Scan QR codes to check in attendees
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Event Selection */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Select Event</h3>
              {eventsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading events...
                </div>
              ) : (
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose an event to scan for" />
                  </SelectTrigger>
                  <SelectContent>
                    {scanableEvents.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id}>
                        {evt.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedEvent && (
              <>
                {/* Scanner Area */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">QR Scanner</h3>
                  <QRScanner onScanSuccess={processQrCode} enabled={!!selectedEvent} />

                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Or paste/enter the full ticket code manually:</p>
                    <div className="flex gap-3">
                      <Input
                        placeholder="e.g. ticket:event-id:user-id:reg-id"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                        className="h-11"
                      />
                      <Button
                        onClick={handleManualCheckIn}
                        className="gradient-primary text-white"
                        disabled={markAttendance.isPending}
                      >
                        {markAttendance.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Check In
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Event QR Code for self check-in */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Event Check-in QR</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Display this QR code for self check-in
                  </p>
                  <div className="flex justify-center p-6 bg-white rounded-xl">
                    <QRCodeSVG
                      value={`event-checkin:${selectedEvent}`}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Stats & Recent Scans */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {selectedEvent && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Event Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Registered
                    </span>
                    <span className="font-semibold">{totalRegistered}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Checked In
                    </span>
                    <span className="font-semibold text-success">{checkedInCount}</span>
                  </div>
                  {totalRegistered > 0 && (
                    <>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-success transition-all"
                          style={{ width: `${(checkedInCount / totalRegistered) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {Math.round((checkedInCount / totalRegistered) * 100)}% check-in rate
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Scans</h3>
              {recentScans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scans yet. Start scanning to see results here.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentScans.map((scan, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {scan.success ? (
                          <CheckCircle className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-medium block truncate">{scan.name}</span>
                          {scan.message && (
                            <span className="text-xs text-muted-foreground">{scan.message}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {scan.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}