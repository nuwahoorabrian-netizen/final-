import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Event } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { getDynamicEventStatus, getDynamicStatusDisplay } from '@/utils/eventStatus';

export interface ReportFilters {
    dateFrom: string;
    dateTo: string;
    status: string;   // '' = all
    category: string; // '' = all
}

/** Apply filters to events and return filtered list. */
export function filterEvents(events: Event[], filters: ReportFilters): Event[] {
    return events.filter((e) => {
        if (filters.dateFrom && e.date < filters.dateFrom) return false;
        if (filters.dateTo && e.date > filters.dateTo) return false;
        if (filters.status && e.status !== filters.status) return false;
        if (filters.category && e.category !== filters.category) return false;
        return true;
    });
}

async function fetchEventAttendees(events: Event[]) {
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) return {};

    // 1. Fetch registrations for these events
    const { data: registrations } = await supabase
        .from('registrations')
        .select('event_id, user_id, attended')
        .in('event_id', eventIds);

    const attendeesMap: Record<string, { registered: string[], attended: string[] }> = {};
    events.forEach(e => {
        attendeesMap[e.id] = { registered: [], attended: [] };
    });

    if (!registrations || registrations.length === 0) return attendeesMap;

    // 2. Fetch profiles for these users
    const userIds = [...new Set(registrations.map(r => r.user_id))];
    const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

    // 3. Map names to events
    registrations.forEach(reg => {
        const eventId = reg.event_id;
        const name = profileMap.get(reg.user_id) || 'Unknown User';
        if (attendeesMap[eventId]) {
            attendeesMap[eventId].registered.push(name);
            if (reg.attended) {
                attendeesMap[eventId].attended.push(name);
            }
        }
    });

    return attendeesMap;
}

async function fetchHiredResources(events: Event[]) {
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) return {};

    const { data: resources } = await supabase
        .from('event_resources')
        .select(`
           event_id, 
           hired_quantity, 
           hire_cost,
           resource_types(name)
        `)
        .in('event_id', eventIds)
        .gt('hired_quantity', 0);

    const hiredMap: Record<string, { summary: string[], totalQuantity: number, totalCost: number }> = {};
    events.forEach(e => {
        hiredMap[e.id] = { summary: [], totalQuantity: 0, totalCost: 0 };
    });

    if (!resources) return hiredMap;

    (resources as any[]).forEach(res => {
        const eventId = res.event_id;
        const name = res.resource_types?.name || 'Unknown';
        const qty = res.hired_quantity || 0;
        const cost = typeof res.hire_cost === 'number' ? res.hire_cost : parseFloat(res.hire_cost as any) || 0;
        
        if (qty > 0) {
            hiredMap[eventId].summary.push(`${name} (Qty: ${qty}, Cost: ${cost})`);
            hiredMap[eventId].totalQuantity += qty;
            hiredMap[eventId].totalCost += cost;
        }
    });

    return hiredMap;
}

/** Build table rows for both CSV and PDF. */
function buildRows(
    events: Event[], 
    attendeesMap: Record<string, { registered: string[], attended: string[] }>,
    hiredMap: Record<string, { summary: string[], totalQuantity: number, totalCost: number }>
): string[][] {
    return events.map((e) => {
        const registeredList = attendeesMap[e.id]?.registered || [];
        const attendedList = attendeesMap[e.id]?.attended || [];
        const hiredData = hiredMap[e.id] || { summary: [], totalQuantity: 0, totalCost: 0 };

        // Include names and total count in the fields
        let registeredNames = registeredList.join(', ');
        if (registeredList.length > 0) registeredNames += ` (Total: ${registeredList.length})`;

        let attendedNames = attendedList.join(', ');
        if (attendedList.length > 0) attendedNames += ` (Total: ${attendedList.length})`;

        // Also fix the individual count columns using the actual fetched array lengths
        const registeredCount = Math.max(e.registered_count || 0, registeredList.length);
        const attendedCount = Math.max(e.attended_count || 0, attendedList.length);

        return [
            e.title,
            e.date,
            e.time,
            e.venue,
            e.category,
            e.organizer_name || 'Unknown',
            String(registeredCount),
            String(attendedCount),
            getDynamicStatusDisplay(getDynamicEventStatus(e.status, e.date)),
            hiredData.summary.join(' | ') || '-',
            String(hiredData.totalQuantity),
            String(e.total_resource_cost || hiredData.totalCost),
            registeredNames,
            attendedNames
        ];
    });
}

const HEADERS = [
    'Event Name',
    'Date',
    'Time',
    'Location',
    'Category',
    'Organizer',
    'Regs',
    'Attended',
    'Status',
    'Hired Items',
    'Hired Qty',
    'Hiring Cost',
    'Registered Names',
    'Attended Names'
];

/** Download filtered events as a CSV file. */
export async function downloadCSV(events: Event[], filters: ReportFilters): Promise<void> {
    const filtered = filterEvents(events, filters);
    if (filtered.length === 0) throw new Error('No events match the selected filters.');

    const attendeesMap = await fetchEventAttendees(filtered);
    const hiredMap = await fetchHiredResources(filtered);
    const rows = buildRows(filtered, attendeesMap, hiredMap);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const csvLines = [
        HEADERS.map(escape).join(','),
        ...rows.map((r) => r.map(escape).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Download filtered events as a PDF file. */
export async function downloadPDF(events: Event[], filters: ReportFilters): Promise<void> {
    const filtered = filterEvents(events, filters);
    if (filtered.length === 0) throw new Error('No events match the selected filters.');

    const attendeesMap = await fetchEventAttendees(filtered);
    const hiredMap = await fetchHiredResources(filtered);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart-UEMS Events Report', 14, 16);

    // Subtitle / filter summary
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const subtitle = [
        filters.dateFrom || filters.dateTo
            ? `Date: ${filters.dateFrom || 'any'} → ${filters.dateTo || 'any'}`
            : null,
        filters.status ? `Status: ${filters.status}` : null,
        filters.category ? `Category: ${filters.category}` : null,
        `Generated: ${new Date().toLocaleString()}`,
    ]
        .filter(Boolean)
        .join('   |   ');
    doc.text(subtitle, 14, 23);

    autoTable(doc, {
        startY: 28,
        head: [HEADERS],
        body: buildRows(filtered, attendeesMap, hiredMap),
        headStyles: {
            fillColor: [79, 70, 229], // indigo-600
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7,
        },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { cellWidth: 25 }, // Event Name
            3: { cellWidth: 20 }, // Location
            9: { cellWidth: 35 }, // Hired Items
            12: { cellWidth: 35 }, // Registered Names
            13: { cellWidth: 35 }, // Attended Names
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
            // Footer with page number
            const pageSize = doc.internal.pageSize;
            doc.setFontSize(7);
            doc.text(
                `Page ${data.pageNumber}`,
                pageSize.getWidth() - 20,
                pageSize.getHeight() - 6
            );
        },
    });

    doc.save(`events-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
