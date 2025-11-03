import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DataIndicator {
  id: string;
  resource_id: string;
  code: string;
  label: string;
  unit?: string;
  description?: string;
  order_no: number;
  is_active: boolean;
}

export interface DataPoint {
  id: string;
  indicator_id: string;
  resource_id: string;
  time_grain: "YEAR" | "QUARTER" | "MONTH";
  period_start: string;
  period_label: string;
  value?: number;
  qualifier: "NA" | "OFFICIAL" | "PRELIM" | "EST";
}

export interface TableColumn {
  id: string;
  resource_id: string;
  time_grain: "YEAR" | "QUARTER" | "MONTH";
  period_start: string;
  column_label: string;
  is_hidden: boolean;
  column_order: number;
}

export type DataQualityIssueType =
  | "missing_years"
  | "duplicate_values"
  | "mixed_time_grain";

export interface DataQualityIssue {
  type: DataQualityIssueType;
  message: string;
  details?: string[];
}

export interface TimeSeriesDatum {
  indicatorId: string;
  indicatorCode: string;
  indicatorLabel: string;
  unit?: string;
  periodStart: string;
  periodLabel: string;
  year: number | null;
  value: number | null;
  qualifier: DataPoint["qualifier"];
}

const toDate = (value: string) => new Date(value);

export const useDatasetTableData = (datasetId: string) => {
  const [indicators, setIndicators] = useState<DataIndicator[]>([]);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTableData = async () => {
      if (!datasetId) return;

      try {
        setLoading(true);

        const { data: resources } = await supabase
          .from("catalog_resources")
          .select("id")
          .eq("dataset_id", datasetId)
          .eq("resource_type", "TABLE")
          .limit(1);

        if (!resources || resources.length === 0) {
          setIndicators([]);
          setDataPoints([]);
          setColumns([]);
          setError(
            "No TABLE resource found for this dataset. An admin needs to add table data first."
          );
          return;
        }

        const resourceId = resources[0].id;

        const { data: indicatorsData, error: indicatorsError } = await supabase
          .from("data_indicators")
          .select("*")
          .eq("resource_id", resourceId)
          .eq("is_active", true)
          .order("order_no");

        if (indicatorsError) throw indicatorsError;

        const { data: dataPointsData, error: dataPointsError } = await supabase
          .from("data_points")
          .select("*")
          .eq("resource_id", resourceId)
          .order("period_start", { ascending: true });

        if (dataPointsError) throw dataPointsError;

        const { data: columnsData, error: columnsError } = await supabase
          .from("data_table_view_columns")
          .select("*")
          .eq("resource_id", resourceId)
          .eq("is_hidden", false)
          .order("column_order");

        if (columnsError) throw columnsError;

        const sortedColumns =
          columnsData?.slice().sort((a, b) => {
            return toDate(a.period_start).getTime() - toDate(b.period_start).getTime();
          }) ?? [];

        setIndicators(indicatorsData || []);
        setDataPoints(dataPointsData || []);
        setColumns(sortedColumns);
        setError(null);
      } catch (err) {
        console.error("Error fetching table data:", err);
        setIndicators([]);
        setDataPoints([]);
        setColumns([]);
        setError(
          err instanceof Error ? err.message : "Failed to fetch table data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [datasetId]);

  const dataPointMap = useMemo(() => {
    const map = new Map<string, DataPoint>();
    dataPoints.forEach((point) => {
      const key = `${point.indicator_id}:${point.period_start}`;
      map.set(key, point);
    });
    return map;
  }, [dataPoints]);

  const timeSeries = useMemo<TimeSeriesDatum[]>(() => {
    if (!indicators.length || !columns.length) return [];

    return indicators.flatMap((indicator) =>
      columns.map((column) => {
        const key = `${indicator.id}:${column.period_start}`;
        const dataPoint = dataPointMap.get(key);

        const year =
          column.time_grain === "YEAR" || dataPoint?.time_grain === "YEAR"
            ? toDate(column.period_start).getFullYear()
            : null;

        return {
          indicatorId: indicator.id,
          indicatorCode: indicator.code,
          indicatorLabel: indicator.label,
          unit: indicator.unit,
          periodStart: column.period_start,
          periodLabel: column.column_label,
          year,
          value: dataPoint?.value ?? null,
          qualifier: dataPoint?.qualifier ?? "NA",
        };
      })
    );
  }, [indicators, columns, dataPointMap]);

  const issues = useMemo<DataQualityIssue[]>(() => {
    if (!columns.length) return [];

    const detectedIssues: DataQualityIssue[] = [];

    const columnGrains = new Set(columns.map((col) => col.time_grain));
    const pointGrains = new Set(dataPoints.map((point) => point.time_grain));
    const combinedGrains = new Set([...columnGrains, ...pointGrains]);

    if (combinedGrains.size > 1) {
      detectedIssues.push({
        type: "mixed_time_grain",
        message:
          "Detected multiple time granularities in the dataset. Please normalize to a single time dimension (e.g., yearly totals).",
        details: Array.from(combinedGrains),
      });
    }

    if (
      combinedGrains.size === 1 &&
      (combinedGrains.has("YEAR") || combinedGrains.has("YEAR"))
    ) {
      const years = new Set<number>();
      columns.forEach((column) => {
        const year = toDate(column.period_start).getFullYear();
        if (!Number.isNaN(year)) {
          years.add(year);
        }
      });

      if (years.size > 1) {
        const sortedYears = Array.from(years).sort((a, b) => a - b);
        const [minYear, maxYear] = [
          sortedYears[0],
          sortedYears[sortedYears.length - 1],
        ];

        const missingYears: number[] = [];
        for (let year = minYear; year <= maxYear; year += 1) {
          if (!years.has(year)) {
            missingYears.push(year);
          }
        }

        if (missingYears.length > 0) {
          detectedIssues.push({
            type: "missing_years",
            message:
              "Missing yearly totals detected. Consider backfilling data for continuous trend analysis.",
            details: missingYears.map((year) => year.toString()),
          });
        }
      }
    }

    const duplicateKeyCounts = new Map<string, number>();
    dataPoints.forEach((point) => {
      const key = `${point.indicator_id}:${point.period_start}`;
      duplicateKeyCounts.set(key, (duplicateKeyCounts.get(key) ?? 0) + 1);
    });

    const duplicateEntries = Array.from(duplicateKeyCounts.entries()).filter(
      ([, count]) => count > 1
    );

    if (duplicateEntries.length > 0) {
      detectedIssues.push({
        type: "duplicate_values",
        message:
          "Multiple values detected for the same indicator and period. Please ensure only one total per year is stored.",
        details: duplicateEntries.map(
          ([key, count]) => `${key} (${count} entries)`
        ),
      });
    }

    return detectedIssues;
  }, [columns, dataPoints]);

  return {
    indicators,
    dataPoints,
    columns,
    timeSeries,
    issues,
    loading,
    error,
  };
};
