import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useIndicators, type DataIndicator } from "@/hooks/useIndicators";
import { useToast } from "@/hooks/use-toast";

interface IndicatorsManagerProps {
  resourceId: string;
}

interface IndicatorFormData {
  code: string;
  label: string;
  unit: string;
  description: string;
  is_active: boolean;
}

export function IndicatorsManager({ resourceId }: IndicatorsManagerProps) {
  const { indicators, loading, createIndicator, updateIndicator, deleteIndicator } = useIndicators(resourceId);
  const [editingIndicator, setEditingIndicator] = useState<DataIndicator | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<IndicatorFormData>({
    code: "",
    label: "",
    unit: "",
    description: "",
    is_active: true,
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      code: "",
      label: "",
      unit: "",
      description: "",
      is_active: true,
    });
    setEditingIndicator(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.code.trim() || !formData.label.trim()) {
      toast({
        title: "Validation Error",
        description: "Code and Label are required fields",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate codes
    const isDuplicateCode = indicators.some(
      indicator => 
        indicator.code === formData.code.trim() && 
        indicator.id !== editingIndicator?.id
    );

    if (isDuplicateCode) {
      toast({
        title: "Validation Error",
        description: "An indicator with this code already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      const indicatorData = {
        resource_id: resourceId,
        code: formData.code.trim(),
        label: formData.label.trim(),
        unit: formData.unit.trim() || null,
        description: formData.description.trim() || null,
        order_no: editingIndicator?.order_no || indicators.length + 1,
        is_active: formData.is_active,
      };

      if (editingIndicator) {
        await updateIndicator(editingIndicator.id, indicatorData);
      } else {
        await createIndicator(indicatorData);
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEdit = (indicator: DataIndicator) => {
    setEditingIndicator(indicator);
    setFormData({
      code: indicator.code,
      label: indicator.label,
      unit: indicator.unit || "",
      description: indicator.description || "",
      is_active: indicator.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (indicator: DataIndicator) => {
    if (confirm(`Are you sure you want to delete indicator "${indicator.label}"?`)) {
      try {
        await deleteIndicator(indicator.id);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const handleToggleActive = async (indicator: DataIndicator) => {
    try {
      await updateIndicator(indicator.id, { is_active: !indicator.is_active });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading indicators...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Indicators</h3>
          <p className="text-sm text-muted-foreground">
            Manage the rows of your data table. Each indicator represents a metric or variable.
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Indicator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingIndicator ? 'Edit Indicator' : 'Add New Indicator'}
                </DialogTitle>
                <DialogDescription>
                  Define a new data indicator that will appear as a row in your data table.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., GDP_TOTAL"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Total GDP"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., Million USD"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingIndicator ? 'Update' : 'Create'} Indicator
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indicators ({indicators.length})</CardTitle>
          <CardDescription>
            These indicators will appear as rows in your data table
          </CardDescription>
        </CardHeader>
        <CardContent>
          {indicators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No indicators created yet. Add your first indicator to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((indicator) => (
                  <TableRow key={indicator.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {indicator.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{indicator.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {indicator.unit || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={indicator.is_active}
                          onCheckedChange={() => handleToggleActive(indicator)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {indicator.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(indicator)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(indicator)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}