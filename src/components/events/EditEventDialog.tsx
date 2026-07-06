import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, FileText, Tags, Loader2, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/select';
import { useUpdateEvent } from '@/hooks/useUpdateEvent';

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


interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time: string;
    venue: string;
    category: EventCategory;
    capacity: number;
    meeting_link?: string | null;
    meeting_status?: 'scheduled' | 'live' | 'ended' | null;
  };
}


export function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const updateEventMutation = useUpdateEvent();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    category: '' as EventCategory,
    capacity: '',
    meeting_link: '',
  });


  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time,
        venue: event.venue,
        category: event.category,
        capacity: event.capacity.toString(),
        meeting_link: event.meeting_link || '',
      });

    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateEventMutation.mutateAsync({
      id: event.id,
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      venue: formData.venue,
      category: formData.category,
      capacity: parseInt(formData.capacity),
      meeting_link: formData.category === 'online_meeting' ? formData.meeting_link : null,
      meeting_status: formData.category === 'online_meeting' ? (event.meeting_status || 'scheduled') : null,
    });


    onOpenChange(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the event details below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Event Title
            </Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Description
            </Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Date
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Time
              </Label>
              <Input
                id="edit-time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className="h-11"
                required
              />
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="edit-venue" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Venue
            </Label>
            <Input
              id="edit-venue"
              value={formData.venue}
              onChange={(e) => handleChange('venue', e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Category and Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-primary" />
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
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
            <div className="space-y-2">
              <Label htmlFor="edit-capacity" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Capacity
              </Label>
              <Input
                id="edit-capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                className="h-11"
                min={1}
                required
              />
            </div>
          </div>

          {/* Meeting Link (Only if category is online_meeting) */}
          {formData.category === 'online_meeting' && (
            <div className="space-y-2">
              <Label htmlFor="edit-meeting-link" className="flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                Meeting Link
              </Label>
              <Input
                id="edit-meeting-link"
                placeholder="https://zoom.us/j/... or Jitsi Meet link"
                value={formData.meeting_link}
                onChange={(e) => handleChange('meeting_link', e.target.value)}
                className="h-11"
                required={formData.category === 'online_meeting'}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-white"
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
