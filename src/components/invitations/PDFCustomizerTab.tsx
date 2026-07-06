import { useState } from 'react';
import { FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateInvitationPDF } from '@/utils/invitationPDF';
import { useToast } from '@/hooks/use-toast';

const ACCENT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
];

export function PDFCustomizerTab() {
  const { toast } = useToast();
  const [headerText, setHeaderText] = useState('You Are Cordially Invited');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [customColor, setCustomColor] = useState('');
  const [footerText, setFooterText] = useState('Smart University Event Management System');
  const [sampleNote, setSampleNote] = useState('We would love to have you join us for this special occasion!');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const activeColor = customColor || accentColor;

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const base64 = await generateInvitationPDF({
        eventTitle: 'Annual University Gala 2026',
        eventDate: 'Saturday, June 14, 2026',
        eventTime: '6:00 PM – 10:00 PM',
        eventVenue: 'UCU Main Hall, Kampala',
        personalNote: sampleNote,
        headerText,
        accentColor: activeColor,
        footerText,
      });
      // Open PDF in a new tab
      const byteChars = atob(base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err: any) {
      toast({ title: 'Preview failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-5">
          <p className="text-sm text-blue-700">
            Customise the look of the PDF invitation that gets attached to your emails. Changes apply to all future invitations you send.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — controls */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Header Text</CardTitle></CardHeader>
            <CardContent>
              <Input
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                placeholder="You Are Cordially Invited"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accent Colour</CardTitle>
              <CardDescription>Used for the header, dividers and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => { setAccentColor(c.value); setCustomColor(''); }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      accentColor === c.value && !customColor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={customColor || accentColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">Custom colour</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Footer Text</CardTitle></CardHeader>
            <CardContent>
              <Input
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="Smart University Event Management System"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sample Personal Note</CardTitle>
              <CardDescription>Preview how a personal message looks in the PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sampleNote}
                onChange={e => setSampleNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right — preview card */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-2" style={{ borderColor: activeColor + '40' }}>
            <div className="p-6 text-white text-center" style={{ background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}cc 100%)` }}>
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Personal Invitation</p>
              <h3 className="font-bold text-lg">{headerText || 'You Are Cordially Invited'}</h3>
            </div>
            <CardContent className="p-5 space-y-3 bg-slate-50">
              <p className="font-bold text-center text-gray-800">Annual University Gala 2026</p>
              <hr style={{ borderColor: activeColor + '60' }} />
              <div className="text-sm space-y-1 text-gray-700">
                <p><strong style={{ color: activeColor }}>📅 Date:</strong> Saturday, June 14, 2026</p>
                <p><strong style={{ color: activeColor }}>🕐 Time:</strong> 6:00 PM – 10:00 PM</p>
                <p><strong style={{ color: activeColor }}>📍 Venue:</strong> UCU Main Hall, Kampala</p>
              </div>
              {sampleNote && (
                <div className="p-3 rounded-lg text-xs italic text-gray-600" style={{ background: activeColor + '10', borderLeft: `3px solid ${activeColor}` }}>
                  "{sampleNote}"
                </div>
              )}
              <div className="text-center text-xs text-white py-2 rounded" style={{ background: activeColor }}>
                {footerText || 'Smart University Event Management System'}
              </div>
            </CardContent>
          </Card>

          <Button
            id="preview-pdf-btn"
            className="w-full gap-2"
            onClick={handlePreview}
            disabled={isPreviewing}
            style={{ background: activeColor }}
          >
            <Eye className="h-4 w-4" />
            {isPreviewing ? 'Generating…' : 'Open PDF Preview'}
          </Button>
        </div>
      </div>
    </div>
  );
}
