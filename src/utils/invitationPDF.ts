import jsPDF from 'jspdf';

export interface PDFConfig {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  personalNote?: string;
  headerText?: string;
  accentColor?: string;
  footerText?: string;
  showLogo?: boolean;
}

/** Generates a branded invitation PDF and returns it as a base64 string. */
export async function generateInvitationPDF(config: PDFConfig): Promise<string> {
  const {
    eventTitle,
    eventDate,
    eventTime,
    eventVenue,
    personalNote,
    headerText = 'You Are Cordially Invited',
    accentColor = '#6366f1',
    footerText = 'Smart University Event Management System',
    showLogo = true,
  } = config;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Parse accent color hex → RGB
  const hex = accentColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // ── Background gradient band ──────────────────────────────────────────────
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 55, 'F');

  // Decorative circle top-right
  doc.setFillColor(255, 255, 255, 0.1);
  doc.circle(W - 20, 10, 35, 'F');

  // ── Header text ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(headerText, W / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(220, 220, 255);
  doc.text('Personal Invitation', W / 2, 38, { align: 'center' });

  // ── Card body ─────────────────────────────────────────────────────────────
  doc.setFillColor(248, 249, 255);
  doc.roundedRect(15, 62, W - 30, 130, 5, 5, 'F');

  // Event title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(30, 30, 60);
  const titleLines = doc.splitTextToSize(eventTitle, W - 50);
  doc.text(titleLines, W / 2, 80, { align: 'center' });

  // Divider
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.8);
  doc.line(30, 92, W - 30, 92);

  // Event details
  const detailY = 104;
  const details = [
    { label: '📅 Date', value: eventDate },
    { label: '🕐 Time', value: eventTime },
    { label: '📍 Venue', value: eventVenue },
  ];

  doc.setFontSize(10);
  details.forEach((d, i) => {
    const y = detailY + i * 14;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(d.label + ':', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 80);
    doc.text(d.value || '—', 60, y);
  });

  // Personal note box
  if (personalNote) {
    const noteY = 152;
    doc.setFillColor(r, g, b, 0.06);
    doc.roundedRect(20, noteY, W - 40, 32, 3, 3, 'F');
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.4);
    doc.line(22, noteY, 22, noteY + 32);

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.setTextColor(r, g, b);
    doc.text('Personal Message:', 28, noteY + 9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 90);
    const noteLines = doc.splitTextToSize(`"${personalNote}"`, W - 60);
    doc.text(noteLines.slice(0, 3), 28, noteY + 18);
  }

  // ── Decorative bottom band ────────────────────────────────────────────────
  doc.setFillColor(r, g, b);
  doc.rect(0, H - 28, W, 28, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(footerText, W / 2, H - 15, { align: 'center' });
  doc.text('We look forward to seeing you!', W / 2, H - 8, { align: 'center' });

  // Return base64 (without the data URI prefix)
  return doc.output('datauristring').split(',')[1];
}
