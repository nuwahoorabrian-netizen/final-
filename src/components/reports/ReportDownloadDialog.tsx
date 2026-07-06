import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Download,
    FileText,
    FileSpreadsheet,
    Filter,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Event } from '@/hooks/useEvents';
import { downloadCSV, downloadPDF, filterEvents, ReportFilters } from '@/lib/reportUtils';

interface ReportDownloadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    events: Event[];
}

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'cancelled'];
const CATEGORY_OPTIONS = ['academic', 'social', 'sports', 'cultural', 'workshop', 'seminar'];

const EMPTY_FILTERS: ReportFilters = {
    dateFrom: '',
    dateTo: '',
    status: '',
    category: '',
};

export function ReportDownloadDialog({
    open,
    onOpenChange,
    events,
}: ReportDownloadDialogProps) {
    const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const matchCount = filterEvents(events, filters).length;

    const patch = (key: keyof ReportFilters, value: string) =>
        setFilters((f) => ({ ...f, [key]: value }));

    const resetStatus = () => {
        setStatus('idle');
        setErrorMsg('');
    };

    const handleDownload = async (format: 'csv' | 'pdf') => {
        if (events.length === 0) {
            setStatus('error');
            setErrorMsg('No event data is available to export.');
            return;
        }
        setStatus('loading');
        setErrorMsg('');
        try {
            // Small timeout so the UI can render the spinner before heavy work
            await new Promise((r) => setTimeout(r, 80));
            if (format === 'csv') await downloadCSV(events, filters);
            else await downloadPDF(events, filters);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2500);
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); resetStatus(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Download Events Report
                    </DialogTitle>
                    <DialogDescription>
                        Apply optional filters, then download the report in your preferred format.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* ── Filters ─────────────────────────────────────────────── */}
                    <div className="bg-muted/40 rounded-xl p-4 space-y-4">
                        <p className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                            <Filter className="w-4 h-4" /> Filters <span className="font-normal">(all optional)</span>
                        </p>

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="dateFrom" className="text-xs">From date</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => patch('dateFrom', e.target.value)}
                                    className="text-sm h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dateTo" className="text-xs">To date</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={filters.dateTo}
                                    min={filters.dateFrom || undefined}
                                    onChange={(e) => patch('dateTo', e.target.value)}
                                    className="text-sm h-9"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Event status</Label>
                            <Select
                                value={filters.status || '__all__'}
                                onValueChange={(v) => patch('status', v === '__all__' ? '' : v)}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All statuses</SelectItem>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Category</Label>
                            <Select
                                value={filters.category || '__all__'}
                                onValueChange={(v) => patch('category', v === '__all__' ? '' : v)}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All categories</SelectItem>
                                    {CATEGORY_OPTIONS.map((c) => (
                                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ── Match count ─────────────────────────────────────────── */}
                    <p className="text-sm text-center text-muted-foreground">
                        <span className="font-semibold text-foreground">{matchCount}</span>{' '}
                        event{matchCount !== 1 ? 's' : ''} match{matchCount === 1 ? 'es' : ''} the current filters
                    </p>

                    {/* ── Status feedback ─────────────────────────────────────── */}
                    {status === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2"
                        >
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>Report downloaded successfully!</span>
                        </motion.div>
                    )}

                    {/* ── Download buttons ─────────────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button
                            variant="outline"
                            disabled={status === 'loading' || matchCount === 0}
                            onClick={() => handleDownload('csv')}
                            className="flex items-center gap-2 h-11 border-green-400 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                            )}
                            Download CSV
                        </Button>

                        <Button
                            disabled={status === 'loading' || matchCount === 0}
                            onClick={() => handleDownload('pdf')}
                            className="flex items-center gap-2 h-11 bg-primary hover:bg-primary/90"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            Download PDF
                        </Button>
                    </div>

                    {matchCount === 0 && (
                        <p className="text-xs text-center text-muted-foreground">
                            Adjust the filters above to include events in the report.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
