import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Plus, X, Upload, Users, FileText, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { useContactLists, useSendInvitations, type ContactEntry } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { generateInvitationPDF } from '@/utils/invitationPDF';

export function SendInvitationsTab() {
  const { role } = useAuth();
  const { data: events } = useEvents();
  const { data: contactLists } = useContactLists();
  const sendInvitations = useSendInvitations();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [recipients, setRecipients] = useState<ContactEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [attachPDF, setAttachPDF] = useState(true);
  const [csvText, setCsvText] = useState('');
  const [showCSV, setShowCSV] = useState(false);

  const approvedEvents = (events || []).filter(e =>
    e.status === 'approved' || e.status === 'live'
  );
  const selectedEvent = approvedEvents.find(e => e.id === selectedEventId);

  const addRecipient = () => {
    if (!newEmail.trim()) return;
    setRecipients(prev => [...prev, { name: newName, email: newEmail, organization: newOrg }]);
    setNewName(''); setNewEmail(''); setNewOrg('');
  };

  const removeRecipient = (idx: number) =>
    setRecipients(prev => prev.filter((_, i) => i !== idx));

  const loadFromList = (listId: string) => {
    const list = contactLists?.find(l => l.id === listId);
    if (!list) return;
    const unique = list.contacts.filter(
      c => !recipients.some(r => r.email === c.email)
    );
    setRecipients(prev => [...prev, ...unique]);
  };

  const importCSV = () => {
    const lines = csvText.split('\n').filter(Boolean);
    const parsed: ContactEntry[] = lines.map(line => {
      const [name, email, organization] = line.split(',').map(s => s.trim());
      return { name: name || '', email: email || name || '', organization };
    }).filter(c => c.email.includes('@'));
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email));
      return [...prev, ...parsed.filter(c => !existing.has(c.email))];
    });
    setCsvText(''); setShowCSV(false);
  };

  const handleSend = async () => {
    if (!selectedEvent || recipients.length === 0) return;
    let pdfBase64: string | undefined;
    let pdfFilename: string | undefined;
    if (attachPDF) {
      try {
        pdfBase64 = await generateInvitationPDF({
          eventTitle: selectedEvent.title,
          eventDate: selectedEvent.date,
          eventTime: selectedEvent.time,
          eventVenue: selectedEvent.venue,
          personalNote,
        });
        pdfFilename = `invitation-${selectedEvent.title.replace(/\s+/g, '-')}.pdf`;
      } catch (_) { /* send without PDF */ }
    }
    await sendInvitations.mutateAsync({
      event_id: selectedEvent.id,
      event_title: selectedEvent.title,
      event_date: selectedEvent.date,
      event_time: selectedEvent.time,
      event_venue: selectedEvent.venue,
      recipients,
      personal_note: personalNote || undefined,
      pdf_attachment: pdfBase64,
      pdf_filename: pdfFilename,
    });
    setRecipients([]); setPersonalNote('');
  };

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> Select Event
          </CardTitle>
          <CardDescription>Choose an approved event to send invitations for</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger id="invitation-event-select">
              <SelectValue placeholder="Choose an event…" />
            </SelectTrigger>
            <SelectContent>
              {approvedEvents.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} — {e.date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm space-y-1"
            >
              <p><strong>📅 Date:</strong> {selectedEvent.date} at {selectedEvent.time}</p>
              <p><strong>📍 Venue:</strong> {selectedEvent.venue}</p>
              <p><strong>👥 Capacity:</strong> {selectedEvent.capacity}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" /> Recipients ({recipients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick-add row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Email address *" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="sm:col-span-2" />
            <Input placeholder="Organization" value={newOrg} onChange={e => setNewOrg(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={addRecipient} disabled={!newEmail}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
            {contactLists && contactLists.length > 0 && (
              <Select onValueChange={loadFromList}>
                <SelectTrigger className="h-9 w-auto gap-1 text-sm">
                  <SelectValue placeholder="Load contact list" />
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {contactLists.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.contacts.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowCSV(v => !v)}>
              <Upload className="w-4 h-4 mr-1" /> Import CSV
            </Button>
          </div>

          {showCSV && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">One per line: Name, Email, Organization</p>
              <Textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={4} placeholder="John Doe, john@example.com, Acme Corp" />
              <Button size="sm" onClick={importCSV}>Import</Button>
            </div>
          )}

          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {recipients.map((r, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {r.name || r.email}
                  <button onClick={() => removeRecipient(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal note + PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personalisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Personal Note (optional)</label>
            <Textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              rows={3}
              placeholder="Add a personal message that will appear in the email…"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={attachPDF}
              onChange={e => setAttachPDF(e.target.checked)}
            />
            <span className="text-sm font-medium">Attach branded PDF invitation</span>
          </label>
        </CardContent>
      </Card>

      {/* Send button */}
      <Button
        id="send-invitations-btn"
        className="w-full gap-2 gradient-primary text-white h-12 text-base"
        onClick={handleSend}
        disabled={!selectedEvent || recipients.length === 0 || sendInvitations.isPending}
      >
        {sendInvitations.isPending
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
          : <><Send className="w-5 h-5" /> Send {recipients.length > 0 ? `${recipients.length} ` : ''}Invitation{recipients.length !== 1 ? 's' : ''}</>
        }
      </Button>
    </div>
  );
}
