import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Minus,
  Loader2,
  Monitor,
  Music,
  Armchair,
  Presentation,
  Mic,
  Speaker,
  ClipboardList,
  Box,
  Info,
} from 'lucide-react';
import { useResourceTypes, useAllocateResource, useEventResources, useDeallocateResource, useLogResourceAction } from '@/hooks/useResources';
import { useResourceRequests } from '@/hooks/useResourceRequests';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResourceAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const resourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Chairs': Armchair,
  'Computers': Monitor,
  'Music Instruments': Music,
  'Projectors': Presentation,
  'Microphones': Mic,
  'Speakers': Speaker,
  'Whiteboards': ClipboardList,
  'Tables': Box,
};

export function ResourceAllocationDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle
}: ResourceAllocationDialogProps) {
  const { data: resourceTypes, isLoading: loadingTypes } = useResourceTypes();
  const { data: eventResources, isLoading: loadingResources } = useEventResources(eventId);
  const { data: resourceRequests, isLoading: loadingRequests } = useResourceRequests(eventId);
  const allocateMutation = useAllocateResource();
  const deallocateMutation = useDeallocateResource();
  const logAction = useLogResourceAction();

  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const isLoading = loadingTypes || loadingResources || loadingRequests;

  // Build a set of resource type IDs that were requested for this event
  const requestedResourceTypeIds = new Set(
    resourceRequests?.map(r => r.resource_type_id) || []
  );

  // Map: resource_type_id -> requested_quantity (for pre-fill & max cap)
  const requestedQtyMap = new Map(
    resourceRequests?.map(r => [r.resource_type_id, r.requested_quantity]) || []
  );

  // Only show resource types that were actually requested for this event
  const requestedResources = resourceTypes?.filter(r => requestedResourceTypeIds.has(r.id)) || [];

  const getAllocatedQuantity = (resourceTypeId: string) =>
    eventResources?.find(r => r.resource_type_id === resourceTypeId)?.quantity || 0;

  const getAllocation = (resourceTypeId: string) =>
    eventResources?.find(r => r.resource_type_id === resourceTypeId);

  const handleAllocate = async () => {
    if (!selectedResource) return;

    await allocateMutation.mutateAsync({
      eventId,
      resourceTypeId: selectedResource,
      quantity,
      notes: notes || undefined,
    });

    // Write audit log
    await logAction.mutateAsync({
      eventId,
      resourceTypeId: selectedResource,
      action: 'allocated',
      quantity,
      notes: notes || undefined,
    });

    setSelectedResource(null);
    setQuantity(1);
    setNotes('');
  };

  const handleDeallocate = async (resourceTypeId: string) => {
    const allocation = getAllocation(resourceTypeId);
    if (!allocation) return;

    await deallocateMutation.mutateAsync({
      allocationId: allocation.id,
      resourceTypeId,
      quantity: allocation.quantity,
    });

    // Write audit log
    await logAction.mutateAsync({
      eventId,
      resourceTypeId,
      action: 'deallocated',
      quantity: allocation.quantity,
    });
  };

  const getIcon = (name: string) => resourceIcons[name] || Package;

  // When a resource card is clicked, pre-fill quantity with the requested amount
  const handleSelectResource = (resourceId: string, isAlreadyAllocated: boolean) => {
    if (isAlreadyAllocated) return;
    const isSelected = selectedResource === resourceId;
    setSelectedResource(isSelected ? null : resourceId);
    if (!isSelected) {
      setQuantity(requestedQtyMap.get(resourceId) || 1);
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Allocate Resources
          </DialogTitle>
          <DialogDescription>
            Manage resource allocation for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">

              {/* Info banner */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>
                  Only resources <strong>requested</strong> for this event are shown below.
                  Quantities are capped at the requested amount.
                </span>
              </div>

              {/* Currently Allocated */}
              {eventResources && eventResources.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                    Currently Allocated
                  </h4>
                  <div className="space-y-2">
                    {eventResources.map((allocation) => {
                      const Icon = getIcon(allocation.resource_type?.name || '');
                      const requested = requestedQtyMap.get(allocation.resource_type_id);
                      return (
                        <div
                          key={allocation.id}
                          className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{allocation.resource_type?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {allocation.quantity} allocated
                                {requested ? ` / ${requested} requested` : ''}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeallocate(allocation.resource_type_id)}
                            disabled={deallocateMutation.isPending}
                          >
                            <Minus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Requested Resources */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                  Requested Resources
                </h4>

                {requestedResources.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No resource requests have been made for this event.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {requestedResources.map((resource) => {
                      const Icon = getIcon(resource.name);
                      const allocated = getAllocatedQuantity(resource.id);
                      const requested = requestedQtyMap.get(resource.id) || 0;
                      const isSelected = selectedResource === resource.id;
                      const isAlreadyAllocated = allocated > 0;

                      return (
                        <div
                          key={resource.id}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : isAlreadyAllocated
                              ? 'border-border opacity-60 cursor-not-allowed'
                              : resource.available_quantity === 0
                                ? 'border-destructive/30 bg-destructive/5 cursor-not-allowed'
                                : 'border-border hover:border-primary/50'
                            }`}
                          onClick={() => handleSelectResource(resource.id, isAlreadyAllocated)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium">{resource.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Requested: <strong>{requested}</strong>
                                </p>
                              </div>
                            </div>
                            <Badge variant={resource.available_quantity >= requested ? 'secondary' : 'destructive'}>
                              {resource.available_quantity} in stock
                            </Badge>
                          </div>

                          {isAlreadyAllocated && (
                            <Badge className="mt-2 bg-primary/10 text-primary border-0">
                              {allocated} already allocated
                            </Badge>
                          )}

                          {!isAlreadyAllocated && resource.available_quantity < requested && (
                            <Badge className="mt-2 bg-destructive/10 text-destructive border-0">
                              Insufficient stock
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Allocation Form — shown when a resource card is selected */}
              {selectedResource && (() => {
                const res = requestedResources.find(r => r.id === selectedResource);
                const maxQty = Math.min(
                  requestedQtyMap.get(selectedResource) || 1,
                  res?.available_quantity || 1
                );
                return (
                  <div className="mt-6 p-4 bg-muted/50 rounded-xl border space-y-4">
                    <h4 className="font-medium">
                      Allocate {res?.name}
                    </h4>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setQuantity(Math.min(val, maxQty));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Requested</Label>
                        <div className="h-10 flex items-center px-3 bg-background rounded-md border text-muted-foreground">
                          {requestedQtyMap.get(selectedResource)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>In Stock</Label>
                        <div className="h-10 flex items-center px-3 bg-background rounded-md border text-muted-foreground">
                          {res?.available_quantity}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Add any special notes about this allocation..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                  </div>
                );
              })()}

            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedResource && (
            <Button
              onClick={handleAllocate}
              disabled={allocateMutation.isPending}
              className="gradient-primary text-white"
            >
              {allocateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Allocate Resource
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
