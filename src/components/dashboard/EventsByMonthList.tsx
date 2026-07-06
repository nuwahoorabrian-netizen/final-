import { useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getDynamicEventStatus, getDynamicStatusDisplay, dynamicStatusColors } from '@/utils/eventStatus';

interface EventData {
  id: string;
  title: string;
  created_at?: string;
  date?: string;
  venue?: string;
  status: string;
  [key: string]: any;
}

interface EventsByMonthListProps {
  events: EventData[];
}

export function EventsByMonthList({ events }: EventsByMonthListProps) {
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EventData[]> = {};
    
    events.forEach(event => {
      if (event.created_at) {
        try {
          const date = parseISO(event.created_at);
          const sortKey = format(date, 'yyyy-MM');
          const displayMonth = format(date, 'MMMM yyyy');
          
          if (!groups[sortKey]) {
            groups[sortKey] = [];
          }
          groups[sortKey].push({ ...event, displayMonth });
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }
    });

    return Object.entries(groups)
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // newest month first
      .map(([key, monthEvents]) => {
         return {
           key,
           month: monthEvents[0].displayMonth,
           events: monthEvents
         };
      });
  }, [events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border/5 rounded-xl p-6 shadow-sm mb-8"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">All Events by Month</h2>
      </div>
      
      {groupedEvents.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {groupedEvents.map((group) => (
            <AccordionItem key={group.key} value={group.key}>
              <AccordionTrigger className="hover:no-underline font-medium text-lg text-left">
                <div className="flex items-center gap-2">
                  <span>{group.month}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    ({group.events.length} event{group.events.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2 pb-4">
                  {group.events.map(event => (
                    <div key={event.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-muted/50">
                      <div>
                        <h4 className="font-semibold text-base">{event.title}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                          {event.date && (
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4" />
                              {(() => {
                                const parsedDate = parseISO(event.date);
                                return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : 'Date TBA';
                              })()}
                            </div>
                          )}
                          {event.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.venue}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {(() => {
                          const dynStatus = getDynamicEventStatus(event.status, event.date || '');
                          const displayStatus = getDynamicStatusDisplay(dynStatus);
                          const colorClass = dynamicStatusColors[dynStatus] || dynamicStatusColors.pending;
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No events found
        </div>
      )}
    </motion.div>
  );
}
