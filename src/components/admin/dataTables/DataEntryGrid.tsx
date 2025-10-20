import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, Database, AlertCircle } from "lucide-react";
import { useIndicators } from "@/hooks/useIndicators";
import { usePeriods } from "@/hooks/usePeriods";
import { useDataPoints } from "@/hooks/useDataPoints";
import { useToast } from "@/hooks/use-toast";

interface DataEntryGridProps {
  resourceId: string;
}

interface CellValue {
  value: number | null;
  qualifier: 'NA' | 'OFFICIAL' | 'PRELIM' | 'EST';
}

export function DataEntryGrid({ resourceId }: DataEntryGridProps) {
  const { indicators, loading: indicatorsLoading } = useIndicators(resourceId);
  const { periods, loading: periodsLoading } = usePeriods(resourceId);
  const { dataPoints, loading: dataPointsLoading, bulkUpsertDataPoints, getDataPointValue } = useDataPoints(resourceId);
  const [gridData, setGridData] = useState<Record<string, CellValue>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loading = indicatorsLoading || periodsLoading || dataPointsLoading;

  // Initialize grid data from existing data points (only when not saving)
  useEffect(() => {
    if (isSaving || indicatorsLoading || periodsLoading || dataPointsLoading) return;
    
    const activeIndicators = indicators.filter(ind => ind.is_active);
    const visiblePeriods = periods.filter(per => !per.is_hidden);
    const newGridData: Record<string, CellValue> = {};
    
    activeIndicators.forEach(indicator => {
      visiblePeriods.forEach(period => {
        const key = `${indicator.id}|${period.period_start}`;
        const existingDataPoint = dataPoints.find(dp => 
          dp.indicator_id === indicator.id && dp.period_start === period.period_start
        );
        
        newGridData[key] = {
          value: existingDataPoint?.value ?? null,
          qualifier: existingDataPoint?.qualifier ?? 'OFFICIAL'
        };
      });
    });
    
    setGridData(newGridData);
    setHasChanges(false);
  }, [indicators, periods, dataPoints, isSaving, indicatorsLoading, periodsLoading, dataPointsLoading]);

  const activeIndicators = indicators.filter(ind => ind.is_active);
  const visiblePeriods = periods.filter(per => !per.is_hidden);

  const getCellKey = (indicatorId: string, periodStart: string) => {
    return `${indicatorId}|${periodStart}`;
  };

  const updateCellValue = (indicatorId: string, periodStart: string, value: number | null) => {
    const key = getCellKey(indicatorId, periodStart);
    setGridData(prev => {
      const currentCell = prev[key] || { value: null, qualifier: 'OFFICIAL' };
      // Auto-set qualifier based on business rules
      const newQualifier = value === null ? 'NA' : 
        (currentCell.qualifier === 'NA' ? 'OFFICIAL' : currentCell.qualifier);
      
      return {
        ...prev,
        [key]: {
          value,
          qualifier: newQualifier
        }
      };
    });
    setHasChanges(true);
  };

  const updateCellQualifier = (indicatorId: string, periodStart: string, qualifier: 'NA' | 'OFFICIAL' | 'PRELIM' | 'EST') => {
    const key = getCellKey(indicatorId, periodStart);
    setGridData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        qualifier
      }
    }));
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    try {
      setIsSaving(true);
      const dataPointsToUpdate = [];
      
      console.log('Starting save operation...');
      console.log('GridData:', gridData);
      console.log('ActiveIndicators:', activeIndicators);
      console.log('VisiblePeriods:', visiblePeriods);
      
      for (const [key, cellValue] of Object.entries(gridData)) {
        const [indicatorId, periodStart] = key.split('|');
        const indicator = activeIndicators.find(ind => ind.id === indicatorId);
        const period = visiblePeriods.find(per => per.period_start === periodStart);
        
        console.log(`Processing key: ${key}, value: ${cellValue.value}, qualifier: ${cellValue.qualifier}`);
        console.log(`Found indicator: ${indicator?.label}, Found period: ${period?.column_label}`);
        
        if (indicator && period) {
          const existingDataPoint = dataPoints.find(dp => 
            dp.indicator_id === indicatorId && dp.period_start === periodStart
          );
          const hasValueChanged = existingDataPoint?.value !== cellValue.value;
          const hasQualifierChanged = existingDataPoint?.qualifier !== cellValue.qualifier;
          
          console.log(`Existing data point:`, existingDataPoint);
          console.log(`Value changed: ${hasValueChanged}, Qualifier changed: ${hasQualifierChanged}`);
          
          if (hasValueChanged || hasQualifierChanged || !existingDataPoint) {
            // Validate and ensure proper qualifier before sending to database
            let validQualifier = cellValue.qualifier;
            if (!validQualifier || validQualifier === null) {
              validQualifier = cellValue.value === null ? 'NA' : 'OFFICIAL';
            }
            
            dataPointsToUpdate.push({
              indicator_id: indicatorId,
              resource_id: resourceId,
              time_grain: period.time_grain,
              period_start: periodStart,
              period_label: period.column_label,
              value: cellValue.value,
              qualifier: validQualifier
            });
          }
        }
      }

      console.log('Data points to update:', dataPointsToUpdate);

      if (dataPointsToUpdate.length > 0) {
        console.log('Calling bulkUpsertDataPoints...');
        await bulkUpsertDataPoints(dataPointsToUpdate);
        
        toast({
          title: "Success",
          description: `Updated ${dataPointsToUpdate.length} data points`,
        });
      } else {
        console.log('No data points to update');
        toast({
          title: "Info",
          description: "No changes to save",
        });
      }

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error",
        description: "Failed to save data points",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getQualifierBadgeVariant = (qualifier: string) => {
    switch (qualifier) {
      case 'OFFICIAL': return 'default';
      case 'PRELIM': return 'secondary';
      case 'EST': return 'outline';
      case 'NA': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading data grid...</div>;
  }

  if (activeIndicators.length === 0 || visiblePeriods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Setup Required
          </CardTitle>
          <CardDescription>
            You need both indicators and periods before you can enter data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {activeIndicators.length === 0 && (
              <p className="text-muted-foreground">• No active indicators found. Add indicators in the "Indicators" tab.</p>
            )}
            {visiblePeriods.length === 0 && (
              <p className="text-muted-foreground">• No visible periods found. Add periods in the "Periods" tab.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Entry Grid</h3>
          <p className="text-sm text-muted-foreground">
            Enter data values for each indicator and time period combination.
          </p>
        </div>
        <Button 
          onClick={saveAllChanges} 
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
          {hasChanges && <Badge variant="secondary" className="ml-1">•</Badge>}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Matrix
          </CardTitle>
          <CardDescription>
            {activeIndicators.length} indicators × {visiblePeriods.length} periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-background">Indicator</TableHead>
                  {visiblePeriods.map(period => (
                    <TableHead key={period.id} className="text-center min-w-[120px]">
                      {period.column_label}
                      <br />
                      <Badge variant="outline" className="text-xs">
                        {period.time_grain}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeIndicators.map(indicator => (
                  <TableRow key={indicator.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      <div>
                        <div className="font-medium">{indicator.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {indicator.code}
                          {indicator.unit && ` (${indicator.unit})`}
                        </div>
                      </div>
                    </TableCell>
                    {visiblePeriods.map(period => {
                      const key = getCellKey(indicator.id, period.period_start);
                      const cellData = gridData[key] || { value: null, qualifier: 'OFFICIAL' };
                      
                      return (
                        <TableCell key={period.id} className="p-2">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="any"
                              value={cellData.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                updateCellValue(indicator.id, period.period_start, value);
                              }}
                              placeholder="—"
                              className="text-center text-sm h-8"
                            />
                            <Select
                              value={cellData.qualifier}
                              onValueChange={(value: 'NA' | 'OFFICIAL' | 'PRELIM' | 'EST') =>
                                updateCellQualifier(indicator.id, period.period_start, value)
                              }
                            >
                              <SelectTrigger className="text-xs h-6">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OFFICIAL">Official</SelectItem>
                                <SelectItem value="PRELIM">Preliminary</SelectItem>
                                <SelectItem value="EST">Estimate</SelectItem>
                                <SelectItem value="NA">Not Available</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}