import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Tags,
  Check,
  Loader2,
  Info,
  CalendarRange,
  Video,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEvent } from '@/hooks/useEvents';
import { useCreateBulkResourceRequests } from '@/hooks/useResourceRequests';
import { ResourceRequestSection, ResourceRequestItem } from '@/components/events/ResourceRequestSection';

type EventCategory = 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar' | 'online_meeting';


const categories: { value: EventCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'online_meeting', label: 'Online Meeting' },
];


export default function CreateEventPage() {
  const navigate = useNavigate();
  const createEventMutation = useCreateEvent();
  const createResourceRequestsMutation = useCreateBulkResourceRequests();
  const { role } = useAuth();
  const isUser = role === 'user' || role === 'student';
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    venue: '',
    category: '' as EventCategory,
    capacity: '1000',
    meeting_link: '',
  });

  // Auto-calculate event duration
  const durationDays = (() => {
    if (!formData.date || !formData.end_date) return null;
    const start = new Date(formData.date);
    const end = new Date(formData.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : null; // inclusive days
  })();

  const [resourceRequests, setResourceRequests] = useState<ResourceRequestItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const event = await createEventMutation.mutateAsync({
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      end_date: formData.end_date || formData.date,
      end_time: formData.end_time || formData.time,
      venue: formData.venue,
      category: formData.category as EventCategory,
      capacity: parseInt(formData.capacity),
      meeting_link: formData.category === 'online_meeting' ? formData.meeting_link : null,
      meeting_status: formData.category === 'online_meeting' ? 'scheduled' : null,
    });


    // Submit resource requests if any
    const validRequests = resourceRequests.filter(r => r.resource_type_id && r.requested_quantity > 0);
    if (validRequests.length > 0 && event?.id) {
      await createResourceRequestsMutation.mutateAsync({
        event_id: event.id,
        requests: validRequests,
      });
    }

    navigate('/events');
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSubmitting = createEventMutation.isPending || createResourceRequestsMutation.isPending;

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to submit your event for approval
          </p>

          {isUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-purple-500/10 border border-purple-200 rounded-xl flex gap-3 items-start"
            >
              <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-purple-900">Organizer Request</h4>
                <p className="text-sm text-purple-700">
                  Submitting this event also acts as a request to become an <strong>Organizer</strong>.
                  Once the admin approves your event, you will gain access to organizer tools and your role will be upgraded automatically.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Event Title
              </Label>
              <Input
                id="title"
                placeholder="Enter a compelling event title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your event, including key highlights and what attendees can expect..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-32 resize-none"
                required
              />
            </div>

            {/* Date/Time Row — Start */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Start Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Start Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
            </div>

            {/* Date/Time Row — End */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="end_date" className="flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-primary" />
                  End Date
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  min={formData.date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  End Time
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Duration Badge */}
            {durationDays !== null && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <CalendarRange className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Event Duration:</span>
                <span className="font-bold text-primary text-base">
                  {durationDays === 1 ? '1 Day' : `${durationDays} Days`}
                </span>
              </div>
            )}

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Venue
              </Label>
              <Input
                id="venue"
                placeholder="e.g., Main Auditorium, Building A"
                value={formData.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-primary" />
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Link (Only if category is online_meeting) */}
            {formData.category === 'online_meeting' && (
              <div className="space-y-2">
                <Label htmlFor="meeting_link" className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Meeting Link
                </Label>
                <Input
                  id="meeting_link"
                  placeholder="https://zoom.us/j/... or Jitsi Meet link"
                  value={formData.meeting_link}
                  onChange={(e) => handleChange('meeting_link', e.target.value)}
                  className="h-12"
                  required={formData.category === 'online_meeting'}
                />
              </div>
            )}


          </div>


          {/* Resource Requests Section */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <ResourceRequestSection
              requests={resourceRequests}
              onChange={setResourceRequests}
              date={formData.date}
            />

          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-white min-w-32"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </MainLayout>
  );
}
