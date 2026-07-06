import { motion } from 'framer-motion';
 import { CheckCircle, Calendar, Clock, MapPin, XCircle, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
 import { useMyRegistrations, useCancelRegistration } from '@/hooks/useRegistrations';
import { Link } from 'react-router-dom';

export default function RegistrationsPage() {
   const { data: registrations, isLoading } = useMyRegistrations();
   const cancelMutation = useCancelRegistration();

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
            My Registrations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Events you've registered for
          </motion.p>
        </div>

 
         {isLoading ? (
           <div className="flex items-center justify-center py-16">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
           </div>
         ) : registrations && registrations.length > 0 ? (
           <div className="space-y-4">
             {registrations.map((registration, index) => (
            <motion.div
                 key={registration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   {registration.attended ? (
                     <Badge className="bg-primary/10 text-primary border-0 flex items-center gap-1">
                       <CheckCircle className="w-3 h-3" />
                       Attended
                     </Badge>
                   ) : (
                     <Badge className="bg-success/10 text-success border-0 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Registered
                  </Badge>
                   )}
                  <Badge variant="outline" className="capitalize">
                     {registration.event?.category}
                  </Badge>
                </div>
                 <h3 className="text-lg font-semibold mb-1">{registration.event?.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                     {registration.event?.date ? new Date(registration.event.date).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                     {registration.event?.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                     {registration.event?.venue}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="text-destructive border-destructive hover:bg-destructive/10"
                   onClick={() => registration.event && cancelMutation.mutate(registration.event.id)}
                   disabled={cancelMutation.isPending}
                 >
                   {cancelMutation.isPending ? (
                     <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                   ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                   )}
                  Cancel
                </Button>
                 <Link to={`/events/${registration.event?.id}`}>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </Link>
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
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No registrations yet</h3>
            <p className="text-muted-foreground mb-4">Browse events and register for ones you're interested in</p>
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
