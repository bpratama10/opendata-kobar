import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  ExternalLink,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDatasetDetail } from "@/hooks/useDatasetDetail";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DatasetTable } from "@/components/DatasetTable";
import { DatasetInfographic } from "@/components/DatasetInfographic";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useDatasetTableData } from "@/hooks/useDatasetTableData";
import { format, differenceInYears } from "date-fns";

const HoverableOrgText = ({ shortName, fullName }: { shortName: string; fullName: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer transition-all duration-200 ease-in-out border-b border-dotted border-muted-foreground hover:text-foreground font-medium"
    >
      {isHovered ? fullName : shortName}
    </span>
  );
};

const DatasetDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [apaCopied, setApaCopied] = useState(false);
  const [ieeeCopied, setIeeeCopied] = useState(false);

  const { dataset, loading, error } = useDatasetDetail(slug || "");
  const { indicators, dataPoints, columns } = useDatasetTableData(dataset?.id || "");
  const sessionIdRef = useRef<string | null>(null);

  // Calculate metrics based on number of indicators
  const visiblePeriodStarts = columns.map(col => col.period_start);
  const latestVisiblePeriod = visiblePeriodStarts.length > 0 ? visiblePeriodStarts[visiblePeriodStarts.length - 1] : null;
  const previousVisiblePeriod = visiblePeriodStarts.length > 1 ? visiblePeriodStarts[visiblePeriodStarts.length - 2] : null;
  const firstVisiblePeriod = visiblePeriodStarts.length > 0 ? visiblePeriodStarts[0] : null;

  const isSingleIndicator = indicators.length === 1;

  // Calculate Year-over-Year Change or Growth Rate
  let yoyChange = null;
  let yoyDescription = "";
  let latestPeriodSum = 0;
  let previousPeriodSum = 0;
  let firstPeriodSum = 0;

  if (latestVisiblePeriod) {
    latestPeriodSum = dataPoints
      .filter((dp) => dp.period_start === latestVisiblePeriod)
      .reduce((sum, dp) => sum + (dp.value || 0), 0);
  }

  if (isSingleIndicator && firstVisiblePeriod && visiblePeriodStarts.length > 1) {
    // Single indicator: show overall growth rate from first to latest period
    firstPeriodSum = dataPoints
      .filter((dp) => dp.period_start === firstVisiblePeriod)
      .reduce((sum, dp) => sum + (dp.value || 0), 0);

    if (firstPeriodSum !== 0) {
      yoyChange = ((latestPeriodSum - firstPeriodSum) / firstPeriodSum) * 100;
      yoyDescription = `from ${format(new Date(firstVisiblePeriod), "yyyy")} to ${format(new Date(latestVisiblePeriod), "yyyy")}`;
    } else if (latestPeriodSum !== 0) {
      yoyChange = 100;
      yoyDescription = `from ${format(new Date(firstVisiblePeriod), "yyyy")} to ${format(new Date(latestVisiblePeriod), "yyyy")}`;
    } else {
      yoyChange = 0;
      yoyDescription = "No change";
    }
  } else if (previousVisiblePeriod) {
    // Multiple indicators: show YoY change
    previousPeriodSum = dataPoints
      .filter((dp) => dp.period_start === previousVisiblePeriod)
      .reduce((sum, dp) => sum + (dp.value || 0), 0);

    if (previousPeriodSum !== 0) {
      yoyChange = ((latestPeriodSum - previousPeriodSum) / previousPeriodSum) * 100;
      yoyDescription = latestVisiblePeriod && previousVisiblePeriod
        ? `from ${format(new Date(previousVisiblePeriod), "yyyy")} to ${format(new Date(latestVisiblePeriod), "yyyy")}`
        : "Insufficient data for YoY comparison";
    } else if (latestPeriodSum !== 0) {
      yoyChange = 100;
      yoyDescription = "Infinite growth from zero";
    } else {
      yoyChange = 0;
      yoyDescription = "No change from zero";
    }
  }

  // Calculate Total Value or Highest Value
  let cardTwoTitle = "";
  let cardTwoValue = 0;
  let cardTwoDescription = "";

  if (isSingleIndicator) {
    // Single indicator: show highest value across all periods
    const allValues = dataPoints.map(dp => ({
      value: dp.value || 0,
      period: dp.period_start
    }));

    if (allValues.length > 0) {
      const highest = allValues.reduce((max, current) => 
        current.value > max.value ? current : max
      , allValues[0]);

      cardTwoTitle = "Highest Value";
      cardTwoValue = highest.value;

      if (latestPeriodSum !== 0 && highest.value !== 0) {
        const percentageDiff = ((latestPeriodSum - highest.value) / highest.value) * 100;
        const sign = percentageDiff >= 0 ? "+" : "";
        cardTwoDescription = `Peak of ${highest.value.toLocaleString()} in ${format(new Date(highest.period), "yyyy")}, currently ${latestPeriodSum.toLocaleString()} (${sign}${percentageDiff.toFixed(2)}%)`;
      } else {
        cardTwoDescription = `Peak of ${highest.value.toLocaleString()} in ${format(new Date(highest.period), "yyyy")}`;
      }
    }
  } else {
    // Multiple indicators: show total value for latest period
    cardTwoTitle = "Total Value";
    cardTwoValue = latestPeriodSum;
    cardTwoDescription = latestVisiblePeriod
      ? `sum of all indicators for ${format(new Date(latestVisiblePeriod), "yyyy")}`
      : "No data available for total value";
  }

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

  const getTemporalEndDisplay = (dataset: any) => {
    if (!dataset.temporal_end) return "—";
    if (!dataset.created_at) return dataset.temporal_end;
    try {
      const endParts = dataset.temporal_end.split("-");
      const createdDate = new Date(dataset.created_at);
      if (endParts.length === 3 && !isNaN(createdDate.getTime())) {
        const endYear = parseInt(endParts[0], 10);
        const endMonth = parseInt(endParts[1], 10) - 1; // 0-indexed month
        const endDay = parseInt(endParts[2], 10);

        // Check UTC comparison (most accurate for DB timezone)
        const isSameUTC =
          endYear === createdDate.getUTCFullYear() &&
          endMonth === createdDate.getUTCMonth() &&
          endDay === createdDate.getUTCDate();

        // Check Local comparison as fallback/alternative
        const isSameLocal =
          endYear === createdDate.getFullYear() &&
          endMonth === createdDate.getMonth() &&
          endDay === createdDate.getDate();

        // Simple string prefix check as another robust validation
        const createdDatePrefix = dataset.created_at.split('T')[0];
        const isSameString = createdDatePrefix === dataset.temporal_end;

        if (isSameUTC || isSameLocal || isSameString) {
          return "Masih Berjalan / Ongoing";
        }
      }
    } catch (e) {
      console.error("Error parsing temporal dates:", e);
    }
    return dataset.temporal_end;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Dataset link copied to clipboard",
    });
  };

  const getCitationYear = () => {
    if (dataset.lastUpdated) {
      const parsed = new Date(dataset.lastUpdated);
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    if (dataset.created_at) {
      const parsed = new Date(dataset.created_at);
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return new Date().getFullYear();
  };

  const citationYear = getCitationYear();
  const organizationName = dataset.organization?.name || "Pemerintah Kabupaten Kotawaringin Barat";
  const citationVersion = dataset.version || "1.0.0";
  const citationUrl = window.location.href;

  const apaCitation = `${organizationName}. (${citationYear}). ${dataset.title} (Versi ${citationVersion}) [Data set]. Portal Satu Data Kobar. ${citationUrl}`;
  const ieeeCitation = `[1] ${organizationName}, "${dataset.title}," Portal Satu Data Kobar, Versi ${citationVersion}, ${citationYear}. [Online]. Available: ${citationUrl}`;

  const copyToClipboard = (text: string, type: 'APA' | 'IEEE') => {
    navigator.clipboard.writeText(text);
    if (type === 'APA') {
      setApaCopied(true);
      setTimeout(() => setApaCopied(false), 2000);
    } else {
      setIeeeCopied(true);
      setTimeout(() => setIeeeCopied(false), 2000);
    }
    toast({
      title: "Citation Copied",
      description: `Copied ${type} citation to clipboard successfully!`,
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
                {dataset.is_priority && (
                  <Badge variant="destructive" className="text-sm">
                    Priority Data
                  </Badge>
                )}
                <Badge variant="secondary" className="text-sm">
                  {dataset.category}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {dataset.format}
                </Badge>
              </div>

              <h1 className="text-3xl font-semibold mb-3 leading-tight">{dataset.title}</h1>

              <div className="text-muted-foreground text-lg mb-4 flex items-center gap-2 flex-wrap">
                <span>
                  {dataset.maintainers && dataset.maintainers.length > 0 
                    ? dataset.maintainers.join(", ") 
                    : "Tidak ada penanggung jawab"}
                </span>
                {dataset.organization && (
                  <>
                    <span>-</span>
                    <HoverableOrgText 
                      shortName={dataset.organization.short_name || dataset.organization.name}
                      fullName={dataset.organization.name}
                    />
                  </>
                )}
              </div>

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
                        <p className="text-muted-foreground font-mono text-sm">{dataset.slug}</p>
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
                        <Badge variant="outline" className={
                          dataset.classification_code === 'TERBATAS'
                            ? "border-amber-500 text-amber-500 bg-amber-500/10"
                            : "border-green-500 text-green-500 bg-green-500/10"
                        }>
                          {dataset.classification_code === 'TERBATAS' ? 'TERBATAS' : 'PUBLIC'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="w-4 h-4" />
                          Bahasa
                        </div>
                        <p className="text-muted-foreground">
                          {dataset.language?.toLowerCase() === 'id' ? 'Bahasa Indonesia (ID)' : 
                           dataset.language?.toLowerCase() === 'en' ? 'English (EN)' : 
                           dataset.language || 'Bahasa Indonesia (ID)'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="w-4 h-4" />
                          Lisensi
                        </div>
                        <div>
                          {dataset.license ? (
                            dataset.license.url ? (
                              <a 
                                href={dataset.license.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 hover:underline"
                              >
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted font-mono inline-flex items-center gap-1">
                                  {dataset.license.name}
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </Badge>
                              </a>
                            ) : (
                              <Badge variant="outline" className="font-mono">{dataset.license.name}</Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="font-mono">{dataset.license_code || "CC-BY-4.0"}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Frekuensi Update
                        </div>
                        <p className="text-muted-foreground">
                          {dataset.frequency?.name || "Tidak tersedia"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          Periode Temporal
                        </div>
                        <p className="text-muted-foreground">
                          {dataset.temporal_start ? (
                            `${dataset.temporal_start} s/d ${getTemporalEndDisplay(dataset)}`
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="w-4 h-4" />
                          Cakupan Wilayah (Spasial)
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dataset.spatial_coverage && dataset.spatial_coverage.length > 0 ? (
                            dataset.spatial_coverage.map((sc) => (
                              <Badge key={sc.id} variant="secondary" className="text-xs">
                                {sc.name}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-muted-foreground">—</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Status Publikasi
                        </div>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {dataset.publication_status || "Published"}
                        </Badge>
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
                      <p>
                        This dataset is licensed under{" "}
                        <span className="font-semibold text-foreground">
                          {dataset.license?.name || dataset.license_code || "Open Data License"}
                        </span>.
                      </p>
                    </div>
                    {dataset.license?.notes ? (
                      dataset.license.notes.split('\n').filter(line => line.trim().length > 0).map((line, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <p>{line.replace(/^[-\*\s]+/, '')}</p>
                        </div>
                      ))
                    ) : (
                      <>
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
                      </>
                    )}
                    {dataset.license?.url && (
                      <div className="pt-2">
                        <a
                          href={dataset.license.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Read full license terms
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Citation Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookmarkPlus className="w-5 h-5 text-primary" />
                    Sitasi Dataset / Cite Dataset
                  </CardTitle>
                  <CardDescription>
                    Gunakan format sitasi berikut untuk merujuk dataset ini dalam karya akademis, penelitian, atau publikasi Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* APA format */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">APA Style</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apaCitation, 'APA')}
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {apaCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Citation
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-md text-sm font-mono break-all leading-relaxed select-all">
                      {apaCitation}
                    </div>
                  </div>

                  {/* IEEE format */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IEEE Style</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ieeeCitation, 'IEEE')}
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {ieeeCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Citation
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-md text-sm font-mono break-all leading-relaxed select-all">
                      {ieeeCitation}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  {isSingleIndicator ? "Growth Rate" : "Year-over-Year Change"}
                </CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {yoyChange !== null
                    ? `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(2)}%`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {yoyDescription || "Insufficient data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {cardTwoTitle || "Total Value"}
                </CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cardTwoValue ? cardTwoValue.toLocaleString() : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cardTwoDescription || "No data available"}
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
