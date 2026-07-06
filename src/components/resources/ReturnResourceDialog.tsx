import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Wrench,
    XCircle,
    RotateCcw,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEventResources, useReturnResource, useResourceReturns } from '@/hooks/useResources';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ReturnResourceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: string;
    eventTitle: string;
}

type Condition = 'good' | 'damaged' | 'needs_repair' | 'lost';

interface ReturnItem {
    eventResourceId: string;
    resourceTypeId: string;
    resourceName: string;
    allocatedQty: number; // total allocated (stock + hired)
    hiredQty: number; // hired quantity
    stockQty: number; // stock quantity
    quantityReturned: number;
    condition: Condition;
    notes: string;
}

const conditionConfig: Record<Condition, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    good: { label: 'Good', icon: CheckCircle, color: 'text-success bg-success/10 border-success/20' },
    damaged: { label: 'Damaged', icon: AlertTriangle, color: 'text-warning bg-warning/10 border-warning/20' },
    needs_repair: { label: 'Needs Repair', icon: Wrench, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    lost: { label: 'Lost', icon: XCircle, color: 'text-destructive bg-destructive/10 border-destructive/20' },
};

export function ReturnResourceDialog({
    open,
    onOpenChange,
    eventId,
    eventTitle,
}: ReturnResourceDialogProps) {
    const { data: eventResources, isLoading: loadingResources } = useEventResources(eventId);
    const { data: existingReturns } = useResourceReturns(eventId);
    const returnMutation = useReturnResource();

    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Build return items from allocations once loaded
    if (eventResources && !initialized && !loadingResources) {
        // Find already returned resource_ids
        const returnedIds = new Set(existingReturns?.map(r => r.event_resource_id) || []);

        const items: ReturnItem[] = eventResources
            .filter(a => !returnedIds.has(a.id)) // exclude already returned
            .map(a => {
                const stock = a.quantity - (a.hired_quantity || 0);
                return {
                    eventResourceId: a.id,
                    resourceTypeId: a.resource_type_id,
                    resourceName: a.resource_type?.name || 'Unknown',
                    allocatedQty: a.quantity,
                    hiredQty: a.hired_quantity || 0,
                    stockQty: stock,
                    quantityReturned: stock, // Default to returning all stock
                    condition: 'good' as Condition,
                    notes: '',
                };
            })
            // Only show items that actually have stock to return (or optionally show hired ones as informational only)
            .filter(item => item.stockQty > 0 || item.hiredQty > 0);

        setReturnItems(items);
        setInitialized(true);
    }

    // Reset when dialog opens/closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) setInitialized(false);
        onOpenChange(newOpen);
    };

    const updateItem = (index: number, field: keyof ReturnItem, value: string | number) => {
        setReturnItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmitAll = async () => {
        for (const item of returnItems) {
            if (item.quantityReturned <= 0) continue;
            await returnMutation.mutateAsync({
                eventResourceId: item.eventResourceId,
                eventId,
                resourceTypeId: item.resourceTypeId,
                quantityReturned: item.quantityReturned,
                condition: item.condition,
                notes: item.notes || undefined,
            });
        }
        setInitialized(false);
        onOpenChange(false);
    };

    const alreadyReturnedItems = existingReturns || [];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-primary" />
                        Return Resources
                    </DialogTitle>
                    <DialogDescription>
                        Record the return of resources from "{eventTitle}"
                    </DialogDescription>
                </DialogHeader>

                {loadingResources ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4 pr-4">

                            {/* Already returned */}
                            {alreadyReturnedItems.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Already Returned</h4>
                                    <div className="space-y-2">
                                        {alreadyReturnedItems.map(r => {
                                            const cfg = conditionConfig[r.condition as Condition] || conditionConfig.good;
                                            const Icon = cfg.icon;
                                            return (
                                                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border opacity-70">
                                                    <div className="flex items-center gap-3">
                                                        <Package className="w-4 h-4 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{r.resource_name}</span>
                                                        <span className="text-sm text-muted-foreground">×{r.quantity_returned}</span>
                                                    </div>
                                                    <Badge variant="outline" className={cn('text-xs', cfg.color)}>
                                                        <Icon className="w-3 h-3 mr-1" />
                                                        {cfg.label}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Items to return */}
                            {returnItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success opacity-50" />
                                    <p className="font-medium">All resources have been returned</p>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Resources to Return</h4>
                                    <div className="space-y-4">
                                        {returnItems.map((item, index) => (
                                            <div key={item.eventResourceId} className="p-4 rounded-xl border border-border bg-card space-y-3">
                                                {/* Resource header */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-5 h-5 text-primary" />
                                                        <span className="font-semibold">{item.resourceName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {item.stockQty > 0 && <Badge variant="secondary">{item.stockQty} from stock</Badge>}
                                                        {item.hiredQty > 0 && (
                                                            <Badge variant="outline" className="text-warning border-warning bg-warning/5">
                                                                {item.hiredQty} external
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Fields */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Stock Qty Returned</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={item.stockQty}
                                                            value={item.quantityReturned}
                                                            disabled={item.stockQty === 0}
                                                            onChange={(e) => {
                                                                const val = Math.min(parseInt(e.target.value) || 0, item.stockQty);
                                                                updateItem(index, 'quantityReturned', val);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Condition</Label>
                                                        <Select
                                                            value={item.condition}
                                                            onValueChange={(val) => updateItem(index, 'condition', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(conditionConfig).map(([key, cfg]) => {
                                                                    const Icon = cfg.icon;
                                                                    return (
                                                                        <SelectItem key={key} value={key}>
                                                                            <span className="flex items-center gap-2">
                                                                                <Icon className={`w-3 h-3 ${key === 'good' ? 'text-success' : key === 'lost' ? 'text-destructive' : 'text-warning'}`} />
                                                                                {cfg.label}
                                                                            </span>
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Notes</Label>
                                                        <Input
                                                            placeholder="Optional notes..."
                                                            value={item.notes}
                                                            onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Condition warning */}
                                                {item.condition !== 'good' && (
                                                    <div className={cn('text-xs p-2 rounded-lg border flex items-center gap-2', conditionConfig[item.condition].color)}>
                                                        {item.condition === 'lost'
                                                            ? '⚠ Lost items will not be returned to available stock.'
                                                            : '⚠ Items marked as damaged or needing repair will not restore stock.'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    {returnItems.length > 0 && (
                        <Button
                            onClick={handleSubmitAll}
                            disabled={returnMutation.isPending}
                            className="gradient-primary text-white"
                        >
                            {returnMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Confirm Returns
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
