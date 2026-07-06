import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Settings,
  Monitor,
  Music,
  Armchair,
  Presentation,
  Mic,
  Speaker,
  ClipboardList,
  Box,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { useResourceTypes, useCreateResourceType } from '@/hooks/useResources';
import { ResourceAuditLog } from '@/components/resources/ResourceAuditLog';

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

export default function ResourcesPage() {
  const { data: resources, isLoading } = useResourceTypes();
  const createMutation = useCreateResourceType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    name: '',
    description: '',
    total_quantity: 0,
  });

  const getIcon = (name: string) => {
    return resourceIcons[name] || Package;
  };

  const handleCreate = async () => {
    await createMutation.mutateAsync(newResource);
    setIsDialogOpen(false);
    setNewResource({ name: '', description: '', total_quantity: 0 });
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Resource Management
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Manage and allocate resources for events
            </motion.p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource Type</DialogTitle>
                <DialogDescription>
                  Create a new type of resource that can be allocated to events
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Resource Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Projectors"
                    value={newResource.name}
                    onChange={(e) => setNewResource(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the resource"
                    value={newResource.description}
                    onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Total Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    value={newResource.total_quantity}
                    onChange={(e) => setNewResource(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newResource.name || newResource.total_quantity <= 0}
                  className="gradient-primary text-white"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Resource
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources?.map((resource, index) => {
              const Icon = getIcon(resource.name);
              const usagePercentage = ((resource.total_quantity - resource.available_quantity) / resource.total_quantity) * 100;
              const inUse = resource.total_quantity - resource.available_quantity;

              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  <h3 className="font-semibold text-lg mb-1">{resource.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {resource.description || 'No description'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">{inUse} / {resource.total_quantity}</span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{resource.available_quantity} available</span>
                      <span>{usagePercentage.toFixed(0)}% in use</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {resources?.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
            <p className="text-muted-foreground mb-4">Add your first resource type to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Resource Type
            </Button>
          </motion.div>
        )}

        {/* Global Audit Log */}
        {resources && resources.length > 0 && (
          <div className="mt-10">
            <ResourceAuditLog title="Global Resource Audit Log" />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
