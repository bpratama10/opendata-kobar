import { useParams, useNavigate } from "react-router-dom";
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

const DatasetDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { dataset, loading, error } = useDatasetDetail(slug || "");

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

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: `Downloading ${dataset.title}...`,
    });
  };

  const handleBookmark = () => {
    toast({
      title: "Bookmarked",
      description: "Dataset saved to your bookmarks",
    });
  };

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
                        <p className="text-muted-foreground">{dataset.lastUpdated}</p>
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

        {/* Section 3: Infographic */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Infographic
          </h2>
          <DatasetInfographic datasetId={dataset.id} />
        </section>
      </div>
      
      <Footer />
    </div>
  );
};

export default DatasetDetail;
