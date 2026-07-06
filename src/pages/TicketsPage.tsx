import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, Calendar, Clock, MapPin, Download, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useMyRegistrations } from '@/hooks/useRegistrations';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function TicketsPage() {
  const { user } = useAuth();
  const { data: registrations, isLoading } = useMyRegistrations();

  // Show all strictly valid registrations (event exists)
  // Even if the event is 'pending', the user should be able to see their registration QR
  const ticketRegistrations = registrations?.filter(r => r.event) || [];

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            My Tickets
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Your QR codes for event check-in
          </motion.p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : ticketRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ticketRegistrations.map((registration, index) => (
              <motion.div
                key={registration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <div className="h-2 gradient-primary" />
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{registration.event?.title}</h3>

                  <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>
                        {registration.event?.date ? new Date(registration.event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{registration.event?.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="truncate">{registration.event?.venue}</span>
                    </div>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-xl mb-4">
                    <QRCodeSVG
                      value={`attendance:${registration.id}`}
                      size={150}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <p className="text-xs text-muted-foreground text-center mb-4">
                    Show this QR code at the venue entrance
                  </p>

                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Ticket
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-4">Register for events to get your tickets</p>
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
