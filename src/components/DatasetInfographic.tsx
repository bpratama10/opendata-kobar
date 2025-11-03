import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Loader2, PieChart as PieChartIcon, AlertTriangle } from "lucide-react";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";
import type { Dataset } from "@/hooks/useDatasets";

interface DatasetInfographicProps {
  datasetId: string;
  datasetTitle?: string;
  primaryResource?: Dataset["primaryResource"];
}

const COLORS = [
  "#215044",
  "#007187",
  "#9FC4CC",
  "#FECD00",
  "#FC8073",
  "#6CCA00",
  "#FA4B23",
  "#7A3133",
];

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return "N/A";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
};

export const DatasetInfographic = ({ datasetId, datasetTitle, primaryResource }: DatasetInfographicProps) => {
  const { indicators, columns, timeSeries, issues, loading, error } = useDatasetTableData(datasetId);

  const indicatorCount = indicators.length;
  const isSingleIndicator = indicatorCount === 1;
  const resolvedChartType =
    primaryResource?.chartType ??
    (isSingleIndicator ? "line" : primaryResource?.isTimeSeries ? "line" : "area");

  const periods = useMemo(
    () =>
      columns.map((column) => ({
        key: column.period_start,
        label: column.column_label,
      })),
    [columns]
  );

  const chartData = useMemo(() => {
    if (!periods.length) return [];

    return periods.map((period) => {
      const row: Record<string, number | string | null> = {
        periodKey: period.key,
        periodLabel: period.label,
        total: 0,
      };

      indicators.forEach((indicator) => {
        const datum = timeSeries.find(
          (entry) => entry.indicatorId === indicator.id && entry.periodStart === period.key
        );
        const value = datum?.value ?? 0;
        row[indicator.code] = value;
        row.total = (row.total as number) + value;
      });

      return row;
    });
  }, [indicators, periods, timeSeries]);

  const latestPeriod = periods[periods.length - 1];
  const previousPeriod = periods[periods.length - 2];
  const latestValues = latestPeriod
    ? timeSeries.filter((datum) => datum.periodStart === latestPeriod.key)
    : [];
  const previousValues = previousPeriod
    ? timeSeries.filter((datum) => datum.periodStart === previousPeriod.key)
    : [];

  const primaryDatum = latestValues[0];
  const primaryPrevious = previousValues.find(
    (datum) => datum.indicatorId === primaryDatum?.indicatorId
  );
  const yoyChange =
    primaryDatum && primaryPrevious && primaryDatum.value !== null && primaryPrevious.value !== null
      ? primaryPrevious.value === 0
        ? null
        : ((primaryDatum.value - primaryPrevious.value) / primaryPrevious.value) * 100
      : null;

  const slopeData =
    chartData.length >= 2
      ? [chartData[0], chartData[chartData.length - 1]].map((row) => ({
          ...row,
          periodLabel: row.periodLabel,
        }))
      : chartData;

  const pieData =
    indicatorCount > 1 && latestPeriod
      ? indicators
          .map((indicator) => {
            const datum = timeSeries.find(
              (entry) => entry.indicatorId === indicator.id && entry.periodStart === latestPeriod.key
            );
            return {
              name: indicator.label,
              value: datum?.value ?? 0,
            };
          })
          .filter((item) => item.value > 0)
      : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading infographic...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Error loading visualization data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!indicatorCount || !periods.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No data available for visualization</p>
            <p className="text-sm text-muted-foreground">
              Contact an administrator to add data indicators and values.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPrimaryChart = () => {
    switch (resolvedChartType) {
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="periodLabel"
              className="text-xs fill-muted-foreground"
            />
            <YAxis className="text-xs fill-muted-foreground" tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), "Total"]}
              labelFormatter={(label) => `Period ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              strokeWidth={2}
            />
          </AreaChart>
        );
      case "slope":
        return (
          <LineChart data={slopeData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="periodLabel"
              className="text-xs fill-muted-foreground"
            />
            <YAxis className="text-xs fill-muted-foreground" tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), datasetTitle || "Total"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        );
      default:
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="periodLabel"
              className="text-xs fill-muted-foreground"
            />
            <YAxis className="text-xs fill-muted-foreground" tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value: number, name) => {
                const indicator = indicators.find((i) => i.code === name);
                return [
                  `${formatNumber(value)} ${indicator?.unit || primaryResource?.unit || ""}`,
                  indicator?.label || name,
                ];
              }}
              labelFormatter={(label) => `Period ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            {isSingleIndicator ? (
              <Line
                type="monotone"
                dataKey={indicators[0].code}
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ strokeWidth: 2, r: 4 }}
              />
            ) : (
              indicators.map((indicator, index) => (
                <Line
                  key={indicator.id}
                  type="monotone"
                  dataKey={indicator.code}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length], r: 3 }}
                />
              ))
            )}
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Data Visualization
            </CardTitle>
            <CardDescription>
              Metadata-driven charts for {datasetTitle || "dataset"} trends and indicators
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {primaryResource?.frequency && (
              <Badge variant="outline">Frequency: {primaryResource.frequency}</Badge>
            )}
            {primaryResource?.unit && (
              <Badge variant="outline">Unit: {primaryResource.unit}</Badge>
            )}
            {primaryResource?.aggregationMethod && (
              <Badge variant="outline">Aggregation: {primaryResource.aggregationMethod}</Badge>
            )}
            {primaryResource?.timeDimension && (
              <Badge variant="outline">Time: {primaryResource.timeDimension}</Badge>
            )}
            {primaryResource?.chartType && (
              <Badge variant="secondary">Chart: {primaryResource.chartType}</Badge>
            )}
          </div>
        </div>
        {primaryResource?.interpretation && (
          <Alert>
            <AlertTitle>Interpretation</AlertTitle>
            <AlertDescription>{primaryResource.interpretation}</AlertDescription>
          </Alert>
        )}
        {issues.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <AlertTitle>Data Quality Checks</AlertTitle>
              <AlertDescription className="space-y-1">
                {issues.map((issue) => (
                  <div key={issue.type}>
                    {issue.message}
                    {issue.details && (
                      <div className="text-xs text-muted-foreground">
                        Details: {issue.details.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {resolvedChartType === "kpi" && primaryDatum && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latest Value ({latestPeriod?.label})
                </CardTitle>
                <CardDescription className="text-3xl font-semibold text-foreground">
                  {formatNumber(primaryDatum.value)} {primaryResource?.unit || primaryDatum.unit || ""}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Year-over-Year Change
                </CardTitle>
                <CardDescription
                  className={`text-2xl font-semibold ${
                    yoyChange === null
                      ? "text-muted-foreground"
                      : yoyChange >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                  }`}
                >
                  {yoyChange === null ? "N/A" : `${yoyChange >= 0 ? "+" : ""}${yoyChange.toFixed(1)}%`}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-4">{datasetTitle || "Dataset"} Trend</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderPrimaryChart()}
            </ResponsiveContainer>
          </div>
        </div>

        {indicatorCount > 1 && (
          <div>
            <h4 className="text-sm font-semibold mb-4">Indicator Comparison</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="periodLabel"
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" tickFormatter={formatNumber} />
                  <Tooltip
                    formatter={(value: number, name) => {
                      const indicator = indicators.find((i) => i.code === name);
                      return [
                        `${formatNumber(value)} ${indicator?.unit || primaryResource?.unit || ""}`,
                        indicator?.label || name,
                      ];
                    }}
                    labelFormatter={(label) => `Period ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  {indicators.map((indicator, index) => (
                    <Bar
                      key={indicator.id}
                      dataKey={indicator.code}
                      stackId="series"
                      fill={COLORS[index % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {pieData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Indicator Distribution ({latestPeriod?.label})
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name) => {
                      const indicator = indicators.find((i) => i.label === name);
                      return [`${formatNumber(value)} ${indicator?.unit || ""}`, name];
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
