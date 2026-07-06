import { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResourceTypes, useResourceAvailability } from '@/hooks/useResources';


export interface ResourceRequestItem {
  resource_type_id: string;
  requested_quantity: number;
  notes?: string;
}

interface ResourceRequestSectionProps {
  requests: ResourceRequestItem[];
  onChange: (requests: ResourceRequestItem[]) => void;
  date?: string;
}

export function ResourceRequestSection({ requests, onChange, date }: ResourceRequestSectionProps) {
  const { data: resourceTypes, isLoading } = useResourceTypes();
  const { data: availability } = useResourceAvailability(date || '');


  const addRequest = () => {
    onChange([...requests, { resource_type_id: '', requested_quantity: 0 }]);
  };

  const removeRequest = (index: number) => {
    onChange(requests.filter((_, i) => i !== index));
  };

  const updateRequest = (index: number, field: keyof ResourceRequestItem, value: string | number) => {
    const updated = [...requests];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading resources...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Package className="w-5 h-5 text-primary" />
          Resource Requests (Optional)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addRequest}>
          <Plus className="w-4 h-4 mr-1" />
          Add Resource
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="text-muted-foreground text-sm py-4 text-center border border-dashed rounded-lg">
          No resources requested. Click "Add Resource" to request items like projectors, chairs, etc.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Resource Type</Label>
                  <Select
                    value={request.resource_type_id}
                    onValueChange={(value) => updateRequest(index, 'resource_type_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceTypes?.map((type) => {
                        const avail = availability?.find(a => a.id === type.id);
                        const remaining = avail?.actual_available ?? type.available_quantity;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({remaining} available)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>

                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={request.requested_quantity}
                    onChange={(e) => updateRequest(index, 'requested_quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Input
                    placeholder="Special requirements..."
                    value={request.notes || ''}
                    onChange={(e) => updateRequest(index, 'notes', e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 mt-6"
                onClick={() => removeRequest(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
