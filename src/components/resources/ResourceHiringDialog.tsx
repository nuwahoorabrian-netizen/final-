import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useResourceTypes, useBulkAllocateResources, useEventResources } from '@/hooks/useResources';
import { useResourceRequests } from '@/hooks/useResourceRequests';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateEventStatus } from '@/hooks/useEvents';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResourceHiringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onSuccess?: () => void;
}

export function ResourceHiringDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onSuccess
}: ResourceHiringDialogProps) {
  const { data: resourceTypes, isLoading: loadingTypes } = useResourceTypes();
  const { data: resourceRequests, isLoading: loadingRequests } = useResourceRequests(eventId);
  const { data: eventResources, isLoading: loadingAllocations } = useEventResources(eventId);
  const bulkAllocateMutation = useBulkAllocateResources();
  const updateStatusMutation = useUpdateEventStatus();
  
  const [unitCosts, setUnitCosts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = loadingTypes || loadingRequests || loadingAllocations;

  // Calculate missing resources
  const requestedItems = useMemo(() => {
    if (!resourceRequests || !resourceTypes) return [];

    return resourceRequests.map(req => {
      const type = resourceTypes.find(t => t.id === req.resource_type_id);
      const available = type ? type.available_quantity : 0;
      const requested = req.requested_quantity;
      
      const existingAlloc = eventResources?.find(r => r.resource_type_id === req.resource_type_id);
      const alreadyAllocated = existingAlloc?.quantity || 0;
      
      const remainingNeeded = Math.max(0, requested - alreadyAllocated);
      
      const allocatingFromStock = remainingNeeded > available ? available : remainingNeeded;
      const missing = remainingNeeded - allocatingFromStock;

      return {
        resourceTypeId: req.resource_type_id,
        name: type?.name || 'Unknown',
        requested,
        available,
        alreadyAllocated,
        remainingNeeded,
        missing,
        allocatingFromStock
      };
    }).filter(item => item.remainingNeeded > 0); // Only show items that still need allocation
  }, [resourceRequests, resourceTypes, eventResources]);

  const hasMissingResources = requestedItems.some(item => item.missing > 0);

  const { totalMissing, totalAllocatingFromStock, totalCost } = useMemo(() => {
    let cost = 0;
    let missing = 0;
    let stock = 0;
    requestedItems.forEach(item => {
      stock += item.allocatingFromStock;
      if (item.missing > 0) {
        missing += item.missing;
        const costPerUnit = unitCosts[item.resourceTypeId] || 0;
        cost += item.missing * costPerUnit;
      }
    });
    return { totalMissing: missing, totalAllocatingFromStock: stock, totalCost: cost };
  }, [requestedItems, unitCosts]);

  const handleUnitCostChange = (resourceTypeId: string, costStr: string) => {
    const cost = parseInt(costStr) || 0;
    setUnitCosts(prev => ({ ...prev, [resourceTypeId]: cost }));
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      // 1. Bulk Allocate
      const allocations = requestedItems.map(item => {
        const costPerUnit = unitCosts[item.resourceTypeId] || 0;
        return {
          resourceTypeId: item.resourceTypeId,
          quantity: item.allocatingFromStock,
          hiredQuantity: item.missing,
          hireCost: item.missing * costPerUnit
        };
      });

      if (allocations.length > 0) {
        await bulkAllocateMutation.mutateAsync({
          eventId,
          allocations,
          totalResourceCost: totalCost
        });
      }

      // 2. Approve Event
      await updateStatusMutation.mutateAsync({ id: eventId, status: 'approved' });
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to approve event with resources:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || bulkAllocateMutation.isPending || updateStatusMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasMissingResources ? (
              <AlertTriangle className="w-5 h-5 text-warning" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
            Review Resources & Approve Event
          </DialogTitle>
          <DialogDescription>
            {hasMissingResources 
              ? `Some requested resources for "${eventTitle}" are out of stock. You can hire them to proceed.`
              : `All requested resources for "${eventTitle}" are available in stock.`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              
              {requestedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success opacity-80" />
                  <p className="text-sm">All requested resources are already fully allocated!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead className="text-center">Required</TableHead>
                        <TableHead className="text-center">Available</TableHead>
                        <TableHead className="text-center">Missing Quantity</TableHead>
                        <TableHead>Unit Cost (UGX)</TableHead>
                        <TableHead className="text-right">Total Amount (UGX)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestedItems.map(item => {
                        const cost = unitCosts[item.resourceTypeId] || 0;
                        const subtotal = item.missing * cost;
                        
                        return (
                          <TableRow key={item.resourceTypeId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {item.name}
                                {item.missing > 0 && (
                                  <Badge variant="outline" className="text-xs text-warning border-warning">
                                    Out of Stock
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.requested}</TableCell>
                            <TableCell className="text-center text-success font-medium">{item.available}</TableCell>
                            <TableCell className="text-center">
                              <span className={item.missing > 0 ? "text-destructive font-bold" : ""}>
                                {item.missing}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.missing > 0 ? (
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={unitCosts[item.resourceTypeId] || ''}
                                  onChange={(e) => handleUnitCostChange(item.resourceTypeId, e.target.value)}
                                  className="w-28 h-9"
                                />
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.missing > 0 ? subtotal.toLocaleString() : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {hasMissingResources && (
                <div className="mt-6 p-5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm border-b pb-3 border-border">
                    <span className="text-muted-foreground font-medium">Auto-Allocated from Stock:</span>
                    <span className="font-semibold">{totalAllocatingFromStock} items</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-3 border-border">
                    <span className="text-muted-foreground font-medium">Total Missing to Hire:</span>
                    <span className="font-semibold text-warning">{totalMissing} items</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <h3 className="font-bold text-primary text-base">Total Hiring Cost</h3>
                      <p className="text-xs text-muted-foreground">Will be recorded under event expenses</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      UGX {totalCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending || isLoading}
            className="gradient-success text-white"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {hasMissingResources ? 'Approve & Hire Resources' : 'Approve & Allocate Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
