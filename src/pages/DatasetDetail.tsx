import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Download,
  Calendar,
  FileText,
  Share2,
  BookmarkPlus,
  Eye,
  Database,
  Hash,
  Globe,
  Info,
  BarChart3,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDatasetDetail } from "@/hooks/useDatasetDetail";
import { DatasetTable } from "@/components/DatasetTable";
import { DatasetInfographic } from "@/components/DatasetInfographic";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";
import { format, differenceInYears } from "date-fns";

const DatasetDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { dataset, loading, error } = useDatasetDetail(slug || "");
  const { indicators, dataPoints, columns } = useDatasetTableData(dataset?.id || "");
  const sessionIdRef = useRef<string | null>(null);

  // Calculate Year-over-Year Change and Latest Value
  // Calculate Year-over-Year Change across all indicators for the latest two visible periods
  const visiblePeriodStarts = columns.map(col => col.period_start);
  const latestVisiblePeriod = visiblePeriodStarts.length > 0 ? visiblePeriodStarts[visiblePeriodStarts.length - 1] : null;
  const previousVisiblePeriod = visiblePeriodStarts.length > 1 ? visiblePeriodStarts[visiblePeriodStarts.length - 2] : null;

  let yoyChange = null;
  let latestPeriodSum = 0;
  let previousPeriodSum = 0;

  if (latestVisiblePeriod) {
    latestPeriodSum = dataPoints
      .filter((dp) => dp.period_start === latestVisiblePeriod)
      .reduce((sum, dp) => sum + (dp.value || 0), 0);
  }

  if (previousVisiblePeriod) {
    previousPeriodSum = dataPoints
      .filter((dp) => dp.period_start === previousVisiblePeriod)
      .reduce((sum, dp) => sum + (dp.value || 0), 0);
  }

  if (previousPeriodSum !== 0) {
    yoyChange = ((latestPeriodSum - previousPeriodSum) / previousPeriodSum) * 100;
  } else if (latestPeriodSum !== 0) {
    yoyChange = 100; // Infinite growth from zero
  } else {
    yoyChange = 0; // No change from zero
  }

  // Calculate Total Value (sum of all indicators for the latest visible period)
  const totalValue = latestVisiblePeriod
    ? dataPoints
        .filter((dp) => dp.period_start === latestVisiblePeriod)
        .reduce((sum, dp) => sum + (dp.value || 0), 0)
    : 0;

  const getDownloadSessionId = () => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    if (typeof window === "undefined") {
      return null;
    }

    let stored = window.localStorage.getItem("download_session_id");

    if (!stored) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        stored = crypto.randomUUID();
      } else {
        stored = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }
      window.localStorage.setItem("download_session_id", stored);
    }

    sessionIdRef.current = stored;
    return stored;
  };

  // Track page view when dataset loads
  useEffect(() => {
    const trackView = async () => {
      if (dataset?.id) {
        try {
          await supabase.from('telemetry_views').insert({
            dataset_id: dataset.id,
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
            session_id: sessionStorage.getItem('session_id') || null,
          });
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      }
    };

    trackView();
  }, [dataset?.id]);

  const generateCSV = (indicators: Array<{ id: string; label: string; unit: string; code: string }>,
                       dataPoints: Array<{ indicator_id: string; period_start: string; value: number; qualifier: string }>,
                       columns: Array<{ id: string; column_label: string; period_start: string }>,
                       datasetTitle: string) => {
    if (indicators.length === 0) return '';

    // CSV Header row
    const headers = ['Indicator', 'Unit', 'Code', ...columns.map(col => col.column_label)];

    // Transform data rows
    const rows = indicators.map(indicator => {
      const row = [
        indicator.label || '',
        indicator.unit || '',
        indicator.code || ''
      ];

      // Add data for each time period
      columns.forEach(column => {
        const dataPoint = dataPoints.find(dp =>
          dp.indicator_id === indicator.id &&
          dp.period_start === column.period_start
        );

        if (dataPoint) {
          const value = dataPoint.value?.toLocaleString() || '';
          const qualifier = dataPoint.qualifier && dataPoint.qualifier !== 'OFFICIAL' ? ` (${dataPoint.qualifier})` : '';
          row.push(value + qualifier);
        } else {
          row.push('');
        }
      });

      return row;
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownload = async () => {
    if (!dataset) return;

    try {
      let csvContent = '';
      let csvFilename = `${dataset.slug}.csv`;

      // Use the properly loaded table data from useDatasetTableData hook
      if (indicators && indicators.length > 0) {
        // We have actual data - create CSV with real data
        csvContent = generateCSV(
          indicators.map(ind => ({ id: ind.id, label: ind.label, unit: ind.unit, code: ind.code })),
          dataPoints.map(dp => ({ indicator_id: dp.indicator_id, period_start: dp.period_start, value: dp.value, qualifier: dp.qualifier })),
          columns.map(col => ({ id: col.id, column_label: col.column_label, period_start: col.period_start })),
          dataset.title
        );
      }

      if (!csvContent) {
        // Fallback: Create CSV with basic info about the dataset (metadata only)
        console.log('No table data found, creating metadata CSV');

        const headers = ['Dataset Field', 'Value'];
        const rows = [
          ['Title', dataset.title || ''],
          ['Description', dataset.description || ''],
          ['Source', dataset.source || ''],
          ['Category', dataset.category || ''],
          ['Format', dataset.format || ''],
          ['Size', dataset.size || ''],
          ['Last Updated', dataset.lastUpdated || ''],
          ['Download Count', dataset.downloadCount.toString() || '0'],
          ['Source Email', dataset.contact_email || ''],
          ['Tags', dataset.tags?.join(', ') || ''],
          ['Language', dataset.language || ''],
          ['Classification', dataset.classification_code || '']
        ];

        csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
          .join('\n');

        csvFilename = `${dataset.slug}-metadata.csv`;
      }

      // Find the primary distribution for download tracking
      const { data: resources } = await supabase
        .from('catalog_resources')
        .select(`
          id,
          name,
          catalog_distributions (
            id,
            version,
            media_type
          )
        `)
        .eq('dataset_id', dataset.id)
        .limit(1);

      const mainResource = resources?.[0];
      const mainDistribution = mainResource?.catalog_distributions?.[0];

      // Track download in telemetry with correct channel enum value
      if (mainDistribution?.id) {
        const sessionId = getDownloadSessionId();
        const telemetryPayload: {
          distribution_id: string;
          channel: 'WEB';
          client_info: {
            user_agent: string;
            referrer: string | null;
            session_id?: string | null;
          };
          session_id?: string;
        } = {
          distribution_id: mainDistribution.id,
          channel: 'WEB',
          client_info: {
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
            session_id: sessionId,
          },
        };

        if (sessionId) {
          telemetryPayload.session_id = sessionId;
        }

        const { error: telemetryError } = await supabase
          .from('telemetry_downloads')
          .insert(telemetryPayload);

        if (telemetryError) {
          const message = telemetryError.message?.toLowerCase() ?? '';
          const isCooldown = message.includes('row-level security') || message.includes('can_log_download') || message.includes('cooldown');
          if (!isCooldown) {
            throw telemetryError;
          } else {
            console.info('Download already logged in the last 30 minutes for this session.');
          }
        }
      }

      // Download the CSV file
      downloadCSV(csvContent, csvFilename);

      toast({
        title: "Download Complete",
        description: `Downloaded ${dataset.title} as CSV file.`,
      });
    } catch (error) {
      console.error('Failed to download dataset:', error);
      toast({
        title: "Download Error",
        description: `Failed to download dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleBookmark = () => {
    toast({
      title: "Bookmarked",
      description: "Dataset saved to your bookmarks",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading dataset...</div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Dataset Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || "The requested dataset could not be found."}</p>
          <Button onClick={() => navigate("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Dataset link copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dataset-list")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Datasets
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-4">
                <Badge variant="secondary" className="text-sm">
                  {dataset.category}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {dataset.format}
                </Badge>
              </div>

              <h1 className="text-3xl font-semibold mb-3 leading-tight">{dataset.title}</h1>

              <p className="text-muted-foreground text-lg mb-4">{dataset.source}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {dataset.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Download Dataset
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={handleBookmark} className="gap-2">
                  <BookmarkPlus className="w-4 h-4" />
                  Bookmark
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare} className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Section 1: Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Overview</h2>
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="information">Information</TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{dataset.description}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Dataset Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Informasi Dasar</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Hash className="w-4 h-4" />
                          Dataset ID
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">{dataset.id}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="w-4 h-4" />
                          Judul
                        </div>
                        <p className="text-muted-foreground">{dataset.title}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="w-4 h-4" />
                          Slug
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">dataset-{dataset.id}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Pembaruan Terakhir
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground">{dataset.lastUpdated}</p>
                          {differenceInYears(new Date(), new Date(dataset.lastUpdated)) >= 1 ? (
                            <Badge variant="destructive">Belum Dimutakhirkan</Badge>
                          ) : (
                            <Badge style={{ backgroundColor: '#046307', color: 'white' }}>Termuktahirkan</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Publication Information */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Informasi Publikasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="w-4 h-4" />
                          Nama Sumber
                        </div>
                        <p className="text-muted-foreground">{dataset.source}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="w-4 h-4" />
                          Email Kontak
                        </div>
                        <p className="text-muted-foreground">{dataset.contact_email || "Tidak tersedia"}</p>
                      </div>

                      {dataset.maintainers && dataset.maintainers.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Database className="w-4 h-4" />
                            Penanggung Jawab Data
                          </div>
                          <p className="text-muted-foreground">{dataset.maintainers.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Coverage/Access */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Cakupan & Akses</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Klasifikasi
                        </div>
                        <Badge variant="outline" className="w-fit">
                          PUBLIC
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="w-4 h-4" />
                          Bahasa
                        </div>
                        <p className="text-muted-foreground">Bahasa Indonesia (ID)</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="w-4 h-4" />
                          Kode Lisensi
                        </div>
                        <Badge variant="outline">CC-BY-4.0</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Frekuensi Update
                        </div>
                        <p className="text-muted-foreground">Bulanan</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Periode Temporal
                        </div>
                        <p className="text-muted-foreground">2023-01-01 s/d 2024-12-31</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Status Publikasi
                        </div>
                        <Badge variant="secondary">Published</Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Technical Information */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Informasi Teknis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="w-4 h-4" />
                          Format File
                        </div>
                        <Badge variant="outline">{dataset.format}</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Download className="w-4 h-4" />
                          Ukuran File
                        </div>
                        <p className="text-muted-foreground">{dataset.size}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Total Unduhan
                        </div>
                        <p className="text-muted-foreground">{dataset.downloadCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Keywords */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Kata Kunci</div>
                    <div className="flex flex-wrap gap-2">
                      {dataset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Dataset Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">File Size</span>
                      <span className="font-medium">{dataset.size}</span>
                    </div>
                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Format</span>
                      <Badge variant="outline">{dataset.format}</Badge>
                    </div>
                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Downloads</span>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{dataset.downloadCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Updated</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{dataset.lastUpdated}</span>
                        {differenceInYears(new Date(), new Date(dataset.lastUpdated)) >= 1 ? (
                          <Badge variant="destructive">Belum Dimutakhirkan</Badge>
                        ) : (
                          <Badge style={{ backgroundColor: '#046307', color: 'white' }}>Termuktahirkan</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Usage Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <p>This dataset is provided under Open Data License</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <p>Attribution required when using this data</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <p>Commercial use is permitted with proper citation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <p>Data quality and accuracy cannot be guaranteed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Section 2: Data Tables */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Data Tables
          </h2>
          <DatasetTable datasetId={dataset.id} />
        </section>

        {/* Section 3: Key Metrics Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Key Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Year-over-Year Change
                </CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {yoyChange !== null
                    ? `${yoyChange.toFixed(2)}%`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestVisiblePeriod && previousVisiblePeriod
                    ? `from ${format(new Date(previousVisiblePeriod), "yyyy")} to ${format(new Date(latestVisiblePeriod), "yyyy")}`
                    : "Insufficient data for YoY comparison"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Value
                </CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalValue.toLocaleString() || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestVisiblePeriod
                    ? `sum of all indicators for ${format(new Date(latestVisiblePeriod), "yyyy")}`
                    : "No data available for total value"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Infographic */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Infographic
          </h2>
          <DatasetInfographic
            datasetId={dataset.id}
            datasetTitle={dataset.title}
            primaryResource={dataset.primaryResource}
          />
        </section>
      </div>
      
      <Footer />
    </div>
  );
};

export default DatasetDetail;
