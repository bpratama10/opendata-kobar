import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Globe, Building, Clock, FileText, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar, SearchFilters } from "@/components/SearchBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useDatasets } from "@/hooks/useDatasets";

const ITEMS_PER_PAGE = 5;

const DatasetList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const { datasets, loading, error } = useDatasets();
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize filters from URL parameters
  useEffect(() => {
    const theme = searchParams.get('theme');
    const format = searchParams.get('format');
    const sortBy = searchParams.get('sortBy');

    const initialFilters: SearchFilters = {};
    if (theme) initialFilters.theme = theme;
    if (format) initialFilters.format = format;
    if (sortBy) initialFilters.sortBy = sortBy;

    setSearchFilters(initialFilters);
  }, [searchParams]);

  // Reset page when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchFilters]);

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleViewDataset = (slug: string) => {
    navigate(`/dataset/${slug}`);
  };

  const filteredDatasets = useMemo(() => {
    let results = [...datasets];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(dataset =>
        dataset.title.toLowerCase().includes(query) ||
        dataset.description.toLowerCase().includes(query) ||
        dataset.tags.some(tag => tag.toLowerCase().includes(query)) ||
        dataset.source.toLowerCase().includes(query)
      );
    }

    if (searchFilters.theme) {
      results = results.filter(dataset => 
        dataset.themes.includes(searchFilters.theme) || 
        (searchFilters.theme === 'Uncategorized' && dataset.themes.length === 0)
      );
    }

    if (searchFilters.format) {
      results = results.filter(dataset => dataset.format === searchFilters.format);
    }

    switch (searchFilters.sortBy) {
      case "Recent":
        results.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case "Most Downloaded":
        results.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case "Most Viewed":
        results.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "A-Z":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "Z-A":
        results.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return results;
  }, [searchQuery, searchFilters, datasets]);

  const totalPages = Math.ceil(filteredDatasets.length / ITEMS_PER_PAGE);

  const paginatedDatasets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDatasets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDatasets, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading datasets...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">
          <div className="text-lg">Error loading datasets</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const formatIndonesianDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getThemeStyle = (themeName?: string) => {
    const name = themeName?.toLowerCase() || "";
    if (name.includes("sosial") || name.includes("kesehatan") || name.includes("pendidikan")) {
      return {
        bg: "from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/30",
        border: "border-rose-200/50 dark:border-rose-800/30",
        iconBg: "bg-rose-600 dark:bg-rose-500",
      };
    }
    if (name.includes("ekonomi") || name.includes("keuangan") || name.includes("industri") || name.includes("pajak")) {
      return {
        bg: "from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/30",
        border: "border-emerald-200/50 dark:border-emerald-800/30",
        iconBg: "bg-emerald-600 dark:bg-emerald-500",
      };
    }
    if (name.includes("pemerintah") || name.includes("hukum") || name.includes("politik") || name.includes("publik")) {
      return {
        bg: "from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/30",
        border: "border-blue-200/50 dark:border-blue-800/30",
        iconBg: "bg-blue-600 dark:bg-blue-500",
      };
    }
    return {
      bg: "from-teal-50 to-teal-100 dark:from-teal-950/20 dark:to-teal-900/30",
      border: "border-teal-200/50 dark:border-teal-800/30",
      iconBg: "bg-teal-600 dark:bg-teal-500",
    };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <div>
        <Header />
        
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground tracking-tight">Dataset</h1>
            <p className="text-muted-foreground text-base mb-6">
              Temukan data kependudukan, kesehatan, pendidikan, dan lainnya yang disediakan oleh Pemerintah Kabupaten Kotawaringin Barat.
            </p>
            <SearchBar onSearch={handleSearch} placeholder="Cari dataset di sini..." initialFilters={searchFilters} />
          </div>

          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <h2 className="text-2xl font-bold text-foreground">Hasil pencarian</h2>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border shadow-sm self-start md:self-auto">
              Menampilkan <span className="font-semibold text-foreground">{filteredDatasets.length}</span> dari <span className="font-semibold text-foreground">{datasets.length}</span> dataset
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {paginatedDatasets.map((dataset) => {
              const themeStyle = getThemeStyle(dataset.category);
              return (
                <div
                  key={dataset.id}
                  onClick={() => handleViewDataset(dataset.slug)}
                  className="bg-card hover:bg-muted/30 border border-muted hover:border-border rounded-xl p-5 flex flex-col md:flex-row gap-5 cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm"
                >
                  {/* Left Side: Thumbnail with Badge */}
                  <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-xl bg-gradient-to-br ${themeStyle.bg} flex items-center justify-center shrink-0 border ${themeStyle.border} shadow-sm overflow-hidden group-hover:scale-[1.02] transition-transform duration-200`}>
                    {/* Visual Icon / Illustration */}
                    <div className={`w-11 h-11 md:w-14 md:h-14 ${themeStyle.iconBg} rounded-xl flex items-center justify-center text-white shadow-md relative z-10 transition-transform duration-300 group-hover:rotate-3`}>
                      <FileText className="w-5.5 h-5.5 md:w-7 md:h-7" />
                    </div>
                    
                    {/* Background decorative accent */}
                    <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-white/20 dark:bg-black/10 rounded-full blur-xl"></div>
                    
                    {/* Dataset Green Badge on top left corner */}
                    <span className="absolute top-0 left-0 bg-[#046307] text-white text-[9px] font-semibold px-2 py-0.5 rounded-br-lg shadow-sm z-20">
                      Dataset
                    </span>
                  </div>

                  {/* Middle Section: Content & Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Title */}
                      <h3 className="font-semibold text-lg md:text-xl text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug mb-2 md:mb-1.5">
                        {dataset.title}
                      </h3>

                      {/* Second line: Region & Organization */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe className="w-4 h-4 shrink-0 text-muted-foreground/75" />
                          <span className="truncate max-w-[200px] md:max-w-[300px]">
                            {dataset.maintainers && dataset.maintainers.length > 0
                              ? dataset.maintainers.join(", ")
                              : "Pemerintah Kab. Kotawaringin Barat"}
                          </span>
                        </div>
                        {dataset.organization && (
                          <div className="flex items-center gap-1.5">
                            <Building className="w-4 h-4 shrink-0 text-muted-foreground/75" />
                            <span className="truncate max-w-[250px] md:max-w-[400px]">
                              {dataset.organization.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Third line: Badges & Info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Priority / Sectoral Badge */}
                      {dataset.is_priority ? (
                        <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full font-semibold border border-amber-500/20 shadow-sm">
                          <Check className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Data Prioritas</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium border border-green-500/20">
                          <Check className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" />
                          <span>Data Sektoral</span>
                        </div>
                      )}

                      {/* Gray Theme Badge */}
                      {dataset.category && (
                        <div className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-2.5 py-1 rounded-full border border-border">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground/75" />
                          <span>{dataset.category}</span>
                        </div>
                      )}

                      {/* Clock & Date Badge */}
                      <div className="inline-flex items-center gap-1.5 text-muted-foreground px-1 py-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatIndonesianDate(dataset.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: View Count */}
                  <div className="flex items-center gap-1.5 text-muted-foreground md:self-center shrink-0 text-sm mt-3 md:mt-0 font-medium md:pl-4 md:border-l border-border/60 pt-3 md:pt-0 border-t md:border-t-0">
                    <Eye className="w-4 h-4" />
                    <span>{dataset.viewCount?.toLocaleString() || "0"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 border-t pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 p-0 ${currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : ""}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {filteredDatasets.length === 0 && (
            <div className="text-center py-16 border rounded-2xl bg-card shadow-sm mt-4">
              <h3 className="text-xl font-semibold mb-2">Tidak ada dataset ditemukan</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Coba sesuaikan kata kunci pencarian Anda atau atur ulang filter yang aktif.
              </p>
              <Button variant="outline" onClick={() => handleSearch("", {})}>
                Atur Ulang Pencarian
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default DatasetList;
