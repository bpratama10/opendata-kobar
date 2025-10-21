import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Database, TrendingUp, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/DataCard";
import { SearchBar, SearchFilters } from "@/components/SearchBar";
import { Header } from "@/components/Header";
import { useDatasets } from "@/hooks/useDatasets";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/sky-hero-03.png";
import recentBgImage from "@/assets/hero-footer02-01.png";
import { Footer } from "@/components/Footer";

interface Theme {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const { datasets, loading, error } = useDatasets();
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    const fetchThemes = async () => {
      const { data } = await supabase.from("catalog_themes").select("*").order("name", { ascending: true });

      if (data) {
        setThemes(data);
      }
    };

    fetchThemes();
  }, []);

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleViewDataset = (slug: string) => {
    navigate(`/dataset/${slug}`);
  };

  const filteredDatasets = useMemo(() => {
    let results = [...datasets];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (dataset) =>
          dataset.title.toLowerCase().includes(query) ||
          dataset.description.toLowerCase().includes(query) ||
          dataset.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          dataset.source.toLowerCase().includes(query),
      );
    }

    // Theme filter
    if (searchFilters.theme) {
      results = results.filter(
        (dataset) =>
          dataset.themes.includes(searchFilters.theme) ||
          (searchFilters.theme === "Uncategorized" && dataset.themes.length === 0),
      );
    }

    // Format filter
    if (searchFilters.format) {
      results = results.filter((dataset) => dataset.format === searchFilters.format);
    }

    // Sort
    switch (searchFilters.sortBy) {
      case "Recent":
        results.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case "Popular":
        results.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case "A-Z":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "Z-A":
        results.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    return results;
  }, [searchQuery, searchFilters, datasets]);

  const popularDatasets = datasets.sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 3);

  const recentDatasets = datasets
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 3);

  // Extract all unique themes from datasets, plus "Uncategorized" if any dataset has no themes
  const allThemes = datasets.flatMap((d) => (d.themes.length > 0 ? d.themes : ["Uncategorized"]));
  const categories = Array.from(new Set(allThemes)).sort();
  const totalDownloads = datasets.reduce((sum, d) => sum + d.downloadCount, 0);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Data visualization background" className="w-full h-full object-cover" />
          <div className="absolute inset-0" />
        </div>

        <div className="relative container mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center text-black">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight font-outfit ">
              Data untuk Keputusan 
              <span className="block text-3xl lg:text-5xl font-normal mt-2 opacity-90 italic">yang Lebih Baik</span>
            </h1>

            <p className="text-xl lg:text-2xl mb-8 opacity-90 leading-relaxed">
             Temukan, telusuri, dan gunakan dataset resmi — gratis untuk publik.
            </p>

            <div className="mb-12">
              <SearchBar onSearch={handleSearch} placeholder="Search datasets, topics, or organizations..." />
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <span>
                  {datasets.length} Dataset{datasets.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>{totalDownloads.toLocaleString()} Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Updated Daily</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-[#87CDEC]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground text-lg">Explore datasets organized by topic and domain</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {themes.map((theme) => {
              const count = datasets.filter((d) =>
                d.themes.some((t) => t.toLowerCase() === theme.name.toLowerCase()),
              ).length;
              return (
                <Button
                  key={theme.id}
                  variant="outline"
                  size="lg"
                  onClick={() => handleSearch("", { theme: theme.name })}
                  className="w-48 h-auto py-6 px-4 flex-col text-lg justify-start"
                >
                  {theme.icon_url ? (
                    <img src={theme.icon_url} alt={theme.name} className="w-14 h-14 object-contain" />
                  ) : (
                    <Globe className="w-14 h-14" />
                  )}
                  <div className="flex items-center gap-2">
                    {theme.name}
                    {count > 0 && (
                      <Badge variant="secondary" className="h-5 px-2 text-xs">
                        {count}
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search Results or Featured Sections */}
      {searchQuery || Object.values(searchFilters).some(Boolean) ? (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">
                Search Results
                {searchQuery && <span className="text-muted-foreground font-normal"> for "{searchQuery}"</span>}
              </h2>
              <p className="text-muted-foreground">
                Found {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDatasets.map((dataset) => (
                <DataCard key={dataset.id} dataset={dataset} onView={handleViewDataset} />
              ))}
            </div>

            {filteredDatasets.length === 0 && (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No datasets found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search terms or filters</p>
                <Button variant="outline" onClick={() => handleSearch("", {})}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Popular Datasets */}
          <section className="py-16 bg-[#87CDEC]">
            <div className="container mx-auto px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-semibold mb-2">Popular Datasets</h2>
                  <p className="text-muted-foreground">Most downloaded datasets by the community</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularDatasets.map((dataset) => (
                  <DataCard key={dataset.id} dataset={dataset} onView={handleViewDataset} />
                ))}
              </div>
            </div>
          </section>

          {/* Recent Datasets & Footer - Shared Background */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={recentBgImage}
                alt="Recent datasets and footer background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" />
            </div>

            <div className="relative">
              {/* Recent Datasets */}
              <div className="container mx-auto px-6 py-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-semibold mb-2">Recently Added</h2>
                    <p className="text-muted-foreground">Latest datasets uploaded to the platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentDatasets.map((dataset) => (
                    <DataCard key={dataset.id} dataset={dataset} onView={handleViewDataset} />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <Footer />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Index;
