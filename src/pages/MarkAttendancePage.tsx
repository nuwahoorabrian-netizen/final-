import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    MapPin,
    Calendar,
    Clock,
    AlertCircle,
    Home,
    Ticket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout/MainLayout';

type Status = 'loading' | 'verifying' | 'success' | 'already-marked' | 'error' | 'not-live';

export default function MarkAttendancePage() {
    const { eventId } = useParams<{ eventId: string }>();
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [status, setStatus] = useState<Status>('loading');
    const [eventData, setEventData] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!eventId) {
            setStatus('error');
            setErrorMessage('Invalid event link.');
            return;
        }

        if (!user) {
            // Redirect to login if user is not authenticated
            // The current URL will be preserved in state if needed, but for now just redirect
            toast({
                title: "Authentication Required",
                description: "Please log in to mark your attendance.",
            });
            navigate('/login', { state: { from: `/mark-attendance/${eventId}` } });
            return;
        }

        const verifyAndMarkAttendance = async () => {
            try {
                setStatus('verifying');

                // 1. Fetch Event Details
                const { data: event, error: eventError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (eventError || !event) {
                    setStatus('error');
                    setErrorMessage('Event not found.');
                    return;
                }

                setEventData(event);

                // 2. Check if event is "Live"
                if (event.status !== 'live') {
                    setStatus('not-live');
                    return;
                }

                // 3. Check if already marked (in the new attendance table)
                const { data: existingAttendance, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('event_id', eventId)
                    .eq('student_id', user.id)
                    .maybeSingle();

                if (existingAttendance) {
                    setStatus('already-marked');
                    return;
                }

                // 4. Mark attendance (Insert into attendance table)
                const { error: markError } = await supabase
                    .from('attendance')
                    .insert({
                        event_id: eventId,
                        student_id: user.id,
                        timestamp: new Date().toISOString()
                    });

                if (markError) {
                    console.error('Error marking attendance:', markError);
                    // If the unique constraint was hit just now (race condition), show already-marked
                    if (markError.code === '23505') {
                        setStatus('already-marked');
                    } else {
                        setStatus('error');
                        setErrorMessage('Failed to record attendance. Please try again.');
                    }
                    return;
                }

                // 5. Update registrations table (attended = true) to sync with legacy system
                // We do this as a secondary step to maintain compatibility
                await supabase
                    .from('registrations')
                    .update({
                        attended: true,
                        attended_at: new Date().toISOString()
                    })
                    .eq('event_id', eventId)
                    .eq('user_id', user.id);

                setStatus('success');
                toast({
                    title: "Attendance Recorded",
                    description: "Your attendance has been successfully recorded.",
                });

            } catch (err) {
                console.error('Unexpected error:', err);
                setStatus('error');
                setErrorMessage('An unexpected error occurred.');
            }
        };

        verifyAndMarkAttendance();
    }, [eventId, user, navigate, toast]);

    const renderContent = () => {
        switch (status) {
            case 'loading':
            case 'verifying':
                return (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <h2 className="text-xl font-medium">Verifying your attendance...</h2>
                        <p className="text-muted-foreground">Please wait a moment</p>
                    </div>
                );

            case 'success':
                return (
                    <div className="flex flex-col items-center text-center py-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6"
                        >
                            <CheckCircle2 className="w-12 h-12 text-success" />
                        </motion.div>
                        <h2 className="text-3xl font-bold mb-2">Success!</h2>
                        <p className="text-xl text-muted-foreground mb-8">Attendance successfully recorded.</p>

                        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mb-8 text-left">
                            <h3 className="font-semibold text-lg mb-4">{eventData?.title}</h3>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>{new Date(eventData?.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>{eventData?.time}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>{eventData?.venue}</span>
                                </div>
                            </div>
                        </div>

                        <Link to="/dashboard">
                            <Button className="gradient-primary text-white h-12 px-8 rounded-full">
                                <Home className="w-4 h-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        </Link>
                    </div>
                );

            case 'already-marked':
                return (
                    <div className="flex flex-col items-center text-center py-10">
                        <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-warning" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Already Marked</h2>
                        <p className="text-muted-foreground mb-8">You have already marked attendance for this event.</p>
                        <Link to="/tickets">
                            <Button variant="outline" className="h-12 px-8 rounded-full">
                                <Ticket className="w-4 h-4 mr-2" />
                                View My Tickets
                            </Button>
                        </Link>
                    </div>
                );

            case 'not-live':
                return (
                    <div className="flex flex-col items-center text-center py-10">
                        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                            <Clock className="w-12 h-12 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Check-in Not Available</h2>
                        <p className="text-muted-foreground mb-8">
                            Check-in is only allowed for events that are currently "Live".
                        </p>
                        <Link to="/dashboard">
                            <Button variant="outline" className="h-12 px-8 rounded-full">
                                Return to Home
                            </Button>
                        </Link>
                    </div>
                );

            case 'error':
                return (
                    <div className="flex flex-col items-center text-center py-10">
                        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-12 h-12 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Check-in Error</h2>
                        <p className="text-muted-foreground mb-8">{errorMessage}</p>
                        <Link to="/dashboard">
                            <Button variant="outline" className="h-12 px-8 rounded-full">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                );
        }
    };

    return (
        <MainLayout>
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={status}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </MainLayout>
    );
}
// End of MarkAttendancePage
