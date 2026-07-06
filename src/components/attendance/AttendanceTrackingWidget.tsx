import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Users,
    CheckCircle,
    TrendingUp,
    ScanLine,
    ArrowRight,
    Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Event } from '@/hooks/useEvents';

interface AttendanceTrackingWidgetProps {
    events: Event[];
}

export function AttendanceTrackingWidget({ events }: AttendanceTrackingWidgetProps) {
    // Only show events that have at least one registration
    const eventsWithAttendance = events
        .filter(e => e.registered_count > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

    // Overall summary stats
    const totalRegistered = events.reduce((sum, e) => sum + e.registered_count, 0);
    const totalAttended = events.reduce((sum, e) => sum + e.attended_count, 0);
    const overallRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

    const getRateColor = (rate: number) => {
        if (rate >= 75) return 'text-success';
        if (rate >= 40) return 'text-warning';
        return 'text-destructive';
    };

    const getBarColor = (rate: number) => {
        if (rate >= 75) return 'bg-success';
        if (rate >= 40) return 'bg-warning';
        return 'bg-destructive';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-8"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Attendance Tracking</h2>
                </div>
                <Link to="/attendance">
                    <Button variant="ghost" size="sm">
                        Open Scanner <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </Link>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Users className="w-4 h-4" />
                        Total Registered
                    </div>
                    <span className="text-3xl font-bold">{totalRegistered.toLocaleString()}</span>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Total Attended
                    </div>
                    <span className="text-3xl font-bold text-success">{totalAttended.toLocaleString()}</span>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Overall Rate
                    </div>
                    <span className={cn('text-3xl font-bold', getRateColor(overallRate))}>
                        {overallRate}%
                    </span>
                </div>
            </div>

            {/* Per-event Attendance Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {eventsWithAttendance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Users className="w-10 h-10 mb-3 opacity-40" />
                        <p className="font-medium">No attendance data yet</p>
                        <p className="text-sm mt-1">Data will appear once participants register for events.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                            <div className="col-span-5">Event</div>
                            <div className="col-span-2 text-center">Registered</div>
                            <div className="col-span-2 text-center">Attended</div>
                            <div className="col-span-3">Attendance Rate</div>
                        </div>

                        {eventsWithAttendance.map((event, index) => {
                            const rate =
                                event.registered_count > 0
                                    ? Math.round((event.attended_count / event.registered_count) * 100)
                                    : 0;

                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors"
                                >
                                    {/* Event name + date */}
                                    <div className="col-span-5 min-w-0">
                                        <Link
                                            to={`/events/${event.id}`}
                                            className="font-medium truncate hover:text-primary transition-colors block"
                                        >
                                            {event.title}
                                        </Link>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>

                                    {/* Registered */}
                                    <div className="col-span-2 text-center">
                                        <span className="font-semibold">{event.registered_count}</span>
                                        <span className="text-xs text-muted-foreground block">
                                            / {event.capacity}
                                        </span>
                                    </div>

                                    {/* Attended */}
                                    <div className="col-span-2 text-center">
                                        <span className={cn('font-semibold', event.attended_count > 0 ? 'text-success' : '')}>
                                            {event.attended_count}
                                        </span>
                                    </div>

                                    {/* Progress bar + badge */}
                                    <div className="col-span-3 flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="w-full bg-muted rounded-full h-2">
                                                <div
                                                    className={cn('h-2 rounded-full transition-all duration-500', getBarColor(rate))}
                                                    style={{ width: `${rate}%` }}
                                                />
                                            </div>
                                        </div>
                                        <Badge
                                            className={cn(
                                                'font-semibold text-xs min-w-[44px] justify-center',
                                                rate >= 75
                                                    ? 'bg-success/10 text-success border-success/20'
                                                    : rate >= 40
                                                        ? 'bg-warning/10 text-warning border-warning/20'
                                                        : 'bg-destructive/10 text-destructive border-destructive/20'
                                            )}
                                            variant="outline"
                                        >
                                            {rate}%
                                        </Badge>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Footer link */}
                <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Showing {eventsWithAttendance.length} of {events.filter(e => e.registered_count > 0).length} events with registrations
                    </p>
                    <Link to="/attendance">
                        <Button size="sm" className="gradient-primary text-white">
                            <ScanLine className="w-4 h-4 mr-2" />
                            Open Attendance Scanner
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
