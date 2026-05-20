import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";
import { BarChart3, Table2, Loader2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface DatasetTableProps {
  datasetId: string;
}

type TableCellData = {
  value?: number;
  qualifier: ReturnType<typeof useDatasetTableData>["dataPoints"][number]["qualifier"];
};

type TableRowData = {
  indicator: string;
  unit?: string;
  code: string;
  cells: Record<string, TableCellData | null>;
};

const formatCellValue = (value?: number) => {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toLocaleString();
};

export const DatasetTable = ({ datasetId }: DatasetTableProps) => {
  const { indicators, dataPoints, columns, issues, loading, error } = useDatasetTableData(datasetId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading table data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Error loading table data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableData: TableRowData[] = indicators.map((indicator) => {
    const cells: Record<string, TableCellData | null> = {};

    columns.forEach((column) => {
      const dataPoint = dataPoints.find(
        (dp) => dp.indicator_id === indicator.id && dp.period_start === column.period_start
      );

      cells[column.period_start] = dataPoint
        ? {
          value: dataPoint.value,
          qualifier: dataPoint.qualifier,
        }
        : null;
    });

    return {
      indicator: indicator.label,
      unit: indicator.unit,
      code: indicator.code,
      cells,
    };
  });

  return (
    <TooltipProvider>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="w-5 h-5" />
          Data Tables
        </CardTitle>
        <CardDescription>Indikator dan Nilai dari Waktu ke Waktu</CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <AlertTitle>Data Quality Checks</AlertTitle>
              <AlertDescription className="space-y-1">
                {issues.map((issue) => (
                  <div key={issue.type}>
                    {issue.message}
                    {issue.details && (
                      <span className="block text-xs text-muted-foreground">
                        Details: {issue.details.join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </AlertDescription>
            </div>
          </Alert>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Indicator</TableHead>
                <TableHead className="font-semibold">Unit</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.id} className="text-center font-semibold">
                    {column.column_label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={row.code ?? index}>
                  <TableCell className="font-medium">{row.indicator}</TableCell>
                  <TableCell>
                    {row.unit && (
                      <Badge variant="outline" className="text-xs">
                        {row.unit}
                      </Badge>
                    )}
                  </TableCell>
                  {columns.map((column) => {
                    const cellData = row.cells[column.period_start];
                    
                    const qualifier = cellData ? cellData.qualifier : "NA";
                    const isNA = !cellData || qualifier === "NA" || cellData.value === null || cellData.value === undefined;
                    
                    let tooltipText = "";
                    if (isNA) {
                      tooltipText = "Tidak Ada Data";
                    } else if (qualifier === "PRELIM") {
                      tooltipText = "Data Sementara";
                    } else if (qualifier === "EST") {
                      tooltipText = "Data Perkiraan";
                    }

                    const cellContent = cellData && !isNA ? (
                      <div className="space-y-1">
                        <div className="font-mono text-sm">{formatCellValue(cellData.value)}</div>
                        {qualifier !== "OFFICIAL" && (
                          <Badge
                            variant={qualifier === "PRELIM" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {qualifier}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    );

                    return (
                      <TableCell key={column.id} className="text-center">
                        {tooltipText ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block cursor-help">{cellContent}</div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-medium">{tooltipText}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          cellContent
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {indicators.length === 0 && !error && (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">Belum ada data yang tersedia pada dataset</p>
            <p className="text-sm text-muted-foreground">
              Silahkan hubungi Penanggung Jawab Data untuk menambahkan data.
            </p>
          </div>
        )}
      </CardContent>
      </Card>
    </TooltipProvider>
  );
};
