import { motion } from 'framer-motion';
import {
    FileText,
    Package,
    RotateCcw,
    MinusCircle,
    Loader2,
    User,
    Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useResourceAuditLog } from '@/hooks/useResources';
import { cn } from '@/lib/utils';

interface ResourceAuditLogProps {
    eventId?: string;
    title?: string;
}

const actionConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    allocated: { label: 'Allocated', icon: Package, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    deallocated: { label: 'Deallocated', icon: MinusCircle, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    returned: { label: 'Returned', icon: RotateCcw, color: 'bg-green-100 text-green-700 border-green-200' },
};

const conditionBadge: Record<string, string> = {
    good: 'bg-success/10 text-success border-success/20',
    damaged: 'bg-warning/10 text-warning border-warning/20',
    needs_repair: 'bg-orange-100 text-orange-600 border-orange-200',
    lost: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ResourceAuditLog({ eventId, title = 'Resource Audit Log' }: ResourceAuditLogProps) {
    const { data: entries, isLoading } = useResourceAuditLog(eventId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
        >
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{title}</h3>
            </div>

            {!entries || entries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No audit entries yet</p>
                    <p className="text-sm mt-1">Actions will be logged here when resources are allocated, returned, or deallocated.</p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-6 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                        <div className="col-span-2">Action</div>
                        <div className="col-span-3">Resource</div>
                        <div className="col-span-1 text-center">Qty</div>
                        <div className="col-span-2">Condition</div>
                        <div className="col-span-2">By</div>
                        <div className="col-span-2">Date</div>
                    </div>

                    {entries.map((entry, index) => {
                        const actionCfg = actionConfig[entry.action] || actionConfig.allocated;
                        const ActionIcon = actionCfg.icon;

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.02 * index }}
                                className="grid grid-cols-12 gap-2 px-6 py-3 items-center text-sm hover:bg-muted/20 transition-colors"
                            >
                                {/* Action */}
                                <div className="col-span-2">
                                    <Badge variant="outline" className={cn('text-xs', actionCfg.color)}>
                                        <ActionIcon className="w-3 h-3 mr-1" />
                                        {actionCfg.label}
                                    </Badge>
                                </div>

                                {/* Resource */}
                                <div className="col-span-3 font-medium truncate">
                                    {entry.resource_name}
                                </div>

                                {/* Quantity */}
                                <div className="col-span-1 text-center font-semibold">
                                    {entry.quantity}
                                </div>

                                {/* Condition */}
                                <div className="col-span-2">
                                    {entry.condition ? (
                                        <Badge variant="outline" className={cn('text-xs capitalize', conditionBadge[entry.condition] || '')}>
                                            {entry.condition.replace('_', ' ')}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                </div>

                                {/* Performer */}
                                <div className="col-span-2 flex items-center gap-1 text-muted-foreground truncate">
                                    <User className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{entry.performer_name}</span>
                                </div>

                                {/* Date */}
                                <div className="col-span-2 flex items-center gap-1 text-muted-foreground text-xs">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {new Date(entry.performed_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
