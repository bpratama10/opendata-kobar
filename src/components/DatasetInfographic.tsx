import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Loader2, PieChart as PieChartIcon } from "lucide-react";

interface DatasetInfographicProps {
  datasetId: string;
}

const COLORS = [
  '#215044',
  '#007187',
  '#9FC4CC',
  '#FECD00',
  '#FC8073',
  '#6CCA00',
  '#FA4B23',
  '#7A3133',
];

export const DatasetInfographic = ({ datasetId }: DatasetInfographicProps) => {
  const { indicators, dataPoints, columns, loading, error } = useDatasetTableData(datasetId);

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

  if (indicators.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No data available for visualization</p>
            <p className="text-sm text-muted-foreground">Contact an administrator to add data indicators and values.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for bar chart (first indicator over time)
  const firstIndicator = indicators[0];
  const chartData = columns.map(column => {
    const dataPoint = dataPoints.find(dp => 
      dp.indicator_id === firstIndicator?.id && 
      dp.period_start === column.period_start
    );
    
    return {
      year: column.column_label,
      value: dataPoint?.value || 0,
      qualifier: dataPoint?.qualifier
    };
  });

  // Prepare data for line chart (trend analysis)
  const trendData = columns.map(column => {
    const result: any = { year: column.column_label };
    
    indicators.forEach(indicator => {
      const dataPoint = dataPoints.find(dp => 
        dp.indicator_id === indicator.id && 
        dp.period_start === column.period_start
      );
      result[indicator.code] = dataPoint?.value || 0;
    });
    
    return result;
  });

  // Prepare data for pie chart (latest year indicator distribution)
  const latestYear = columns[columns.length - 1];
  const pieData = indicators.map(indicator => ({
    name: indicator.label,
    value: dataPoints.find(dp => 
      dp.indicator_id === indicator.id &&
      dp.period_start === latestYear?.period_start
    )?.value || 0
  })).filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Data Visualization
        </CardTitle>
        <CardDescription>
          Interactive charts and infographics based on the dataset
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Primary Indicator Trend Bar Chart */}
        <div>
          <h4 className="text-sm font-semibold mb-4">{firstIndicator?.label} Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="year" 
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()}
                />
                <Tooltip 
                  formatter={(value: number, name) => [
                    `${value.toLocaleString()} ${firstIndicator?.unit || ''}`,
                    firstIndicator?.label
                  ]}
                  labelFormatter={(label) => `Period ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-indicator Trend Chart */}
        <div>
          <h4 className="text-sm font-semibold mb-4">All Indicators Trend</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="year" 
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()}
                />
                <Tooltip 
                  formatter={(value: number, name) => {
                    const indicator = indicators.find(i => i.code === name);
                    return [
                      `${value.toLocaleString()} ${indicator?.unit || ''}`,
                      indicator?.label || name
                    ];
                  }}
                  labelFormatter={(label) => `Period ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                {indicators.map((indicator, index) => (
                  <Line 
                    key={indicator.id}
                    type="monotone" 
                    dataKey={indicator.code} 
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicator Distribution Pie Chart */}
        {pieData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Indicator Distribution ({latestYear?.column_label})
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
                      const indicator = indicators.find(i => i.label === name);
                      return [`${value.toLocaleString()} ${indicator?.unit || ''}`, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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