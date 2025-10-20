import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarDays, Globe, Mail, FileText, AlertCircle } from "lucide-react";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";

interface Dataset {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  description: string;
  classification_code: string;
  publication_status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  contact_email: string;
  language: string;
}

interface DatasetPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset | null;
}

export function DatasetPreviewDialog({ open, onOpenChange, dataset }: DatasetPreviewDialogProps) {
  const { indicators, dataPoints, columns, loading, error } = useDatasetTableData(dataset?.id || '');
  
  if (!dataset) return null;

  const hasTableData = indicators.length > 0 && columns.length > 0;
  const hasDataPoints = dataPoints.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{dataset.title}</DialogTitle>
          <DialogDescription>
            Dataset preview - {dataset.slug}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={dataset.publication_status === 'PUBLISHED' ? "default" : "secondary"}>
              {dataset.publication_status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">{dataset.classification_code}</Badge>
            <Badge variant="outline">{dataset.language?.toUpperCase()}</Badge>
          </div>

          {dataset.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{dataset.description}</p>
              </CardContent>
            </Card>
          )}

          {dataset.abstract && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{dataset.abstract}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(dataset.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(dataset.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Language</p>
                  <p className="text-sm text-muted-foreground">
                    {dataset.language === 'id' ? 'Indonesian' : 'English'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Classification</p>
                  <p className="text-sm text-muted-foreground">
                    {dataset.classification_code}
                  </p>
                </div>
                {dataset.contact_email && (
                  <div>
                    <p className="text-sm font-medium flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      Contact
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dataset.contact_email}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Table Preview</CardTitle>
              <CardDescription>
                Preview of structured data table
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading table data...</p>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : !hasTableData ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Data Table Not Completed</AlertTitle>
                  <AlertDescription>
                    No indicators or periods have been set up for this dataset yet. Configure them in the Data Tables management section.
                  </AlertDescription>
                </Alert>
              ) : !hasDataPoints ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Data Table Not Completed</AlertTitle>
                  <AlertDescription>
                    Table structure is configured but no data has been entered yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Indicator</TableHead>
                        {columns.map((col) => (
                          <TableHead key={col.id}>{col.column_label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indicators.map((indicator) => (
                        <TableRow key={indicator.id}>
                          <TableCell className="font-medium">
                            <div>{indicator.label}</div>
                            {indicator.unit && (
                              <div className="text-xs text-muted-foreground">({indicator.unit})</div>
                            )}
                          </TableCell>
                          {columns.map((col) => {
                            const dataPoint = dataPoints.find(
                              (dp) => dp.indicator_id === indicator.id && dp.period_start === col.period_start
                            );
                            return (
                              <TableCell key={col.id}>
                                {dataPoint?.value !== null && dataPoint?.value !== undefined ? (
                                  <div className="flex items-center gap-2">
                                    <span>{dataPoint.value.toLocaleString()}</span>
                                    {dataPoint.qualifier !== 'OFFICIAL' && (
                                      <Badge variant="outline" className="text-xs">
                                        {dataPoint.qualifier}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}