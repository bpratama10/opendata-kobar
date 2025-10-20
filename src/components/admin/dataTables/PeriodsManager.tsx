import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical, Calendar } from "lucide-react";
import { usePeriods, type TableColumn } from "@/hooks/usePeriods";
import { useToast } from "@/hooks/use-toast";

interface PeriodsManagerProps {
  resourceId: string;
}

interface PeriodFormData {
  time_grain: 'YEAR' | 'QUARTER' | 'MONTH';
  period_start: string;
  column_label: string;
  is_hidden: boolean;
}

export function PeriodsManager({ resourceId }: PeriodsManagerProps) {
  const { periods, loading, createPeriod, updatePeriod, deletePeriod } = usePeriods(resourceId);
  const [editingPeriod, setEditingPeriod] = useState<TableColumn | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PeriodFormData>({
    time_grain: 'YEAR',
    period_start: '',
    column_label: '',
    is_hidden: false,
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      time_grain: 'YEAR',
      period_start: '',
      column_label: '',
      is_hidden: false,
    });
    setEditingPeriod(null);
  };

  const generateLabel = (timeGrain: string, periodStart: string) => {
    if (!periodStart) return '';
    
    const date = new Date(periodStart);
    const year = date.getFullYear();
    
    switch (timeGrain) {
      case 'YEAR':
        return year.toString();
      case 'QUARTER':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `Q${quarter} ${year}`;
      case 'MONTH':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      default:
        return periodStart;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.period_start.trim() || !formData.column_label.trim()) {
      toast({
        title: "Validation Error",
        description: "Period start date and column label are required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate period_start
    const isDuplicate = periods.some(
      period => 
        period.period_start === formData.period_start && 
        period.id !== editingPeriod?.id
    );

    if (isDuplicate) {
      toast({
        title: "Validation Error",
        description: "A period with this start date already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      const periodData = {
        resource_id: resourceId,
        time_grain: formData.time_grain,
        period_start: formData.period_start,
        column_label: formData.column_label.trim(),
        is_hidden: formData.is_hidden,
        column_order: editingPeriod?.column_order || periods.length + 1,
      };

      if (editingPeriod) {
        await updatePeriod(editingPeriod.id, periodData);
      } else {
        await createPeriod(periodData);
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEdit = (period: TableColumn) => {
    setEditingPeriod(period);
    setFormData({
      time_grain: period.time_grain,
      period_start: period.period_start,
      column_label: period.column_label,
      is_hidden: period.is_hidden,
    });
    setShowForm(true);
  };

  const handleDelete = async (period: TableColumn) => {
    if (confirm(`Are you sure you want to delete period "${period.column_label}"?`)) {
      try {
        await deletePeriod(period.id);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const handleToggleHidden = async (period: TableColumn) => {
    try {
      await updatePeriod(period.id, { is_hidden: !period.is_hidden });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleTimeGrainChange = (timeGrain: 'YEAR' | 'QUARTER' | 'MONTH') => {
    setFormData(prev => ({
      ...prev,
      time_grain: timeGrain,
      column_label: generateLabel(timeGrain, prev.period_start)
    }));
  };

  const handlePeriodStartChange = (periodStart: string) => {
    setFormData(prev => ({
      ...prev,
      period_start: periodStart,
      column_label: generateLabel(prev.time_grain, periodStart)
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading periods...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Time Periods</h3>
          <p className="text-sm text-muted-foreground">
            Manage the columns of your data table. Each period represents a time point.
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Period
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? 'Edit Period' : 'Add New Period'}
                </DialogTitle>
                <DialogDescription>
                  Define a new time period that will appear as a column in your data table.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="time_grain">Time Grain</Label>
                  <Select 
                    value={formData.time_grain} 
                    onValueChange={handleTimeGrainChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time grain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YEAR">Year</SelectItem>
                      <SelectItem value="QUARTER">Quarter</SelectItem>
                      <SelectItem value="MONTH">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="period_start">Period Start Date *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => handlePeriodStartChange(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="column_label">Column Label *</Label>
                  <Input
                    id="column_label"
                    value={formData.column_label}
                    onChange={(e) => setFormData({ ...formData, column_label: e.target.value })}
                    placeholder="Auto-generated from date"
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_hidden"
                    checked={formData.is_hidden}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
                  />
                  <Label htmlFor="is_hidden">Hidden</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPeriod ? 'Update' : 'Create'} Period
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Periods ({periods.length})</CardTitle>
          <CardDescription>
            These periods will appear as columns in your data table
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              No periods created yet. Add your first time period to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Time Grain</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{period.column_label}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {period.time_grain}
                      </code>
                    </TableCell>
                    <TableCell>{period.period_start}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!period.is_hidden}
                          onCheckedChange={() => handleToggleHidden(period)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {period.is_hidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(period)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(period)}
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