import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBar, SearchFilters } from "@/components/SearchBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useDatasets } from "@/hooks/useDatasets";

const DatasetList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const { datasets, loading, error } = useDatasets();

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

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleViewDataset = (slug: string) => {
    navigate(`/dataset/${slug}`);
  };

  const filteredDatasets = useMemo(() => {
    // Add mock view count for now (TODO: implement proper view tracking)
    let results = datasets.map(dataset => ({
      ...dataset,
      viewCount: Math.floor(Math.random() * 1000) // Mock view count until logging is implemented
    }));

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
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Dataset List</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Browse all available datasets in a comprehensive list view
          </p>
          <SearchBar onSearch={handleSearch} placeholder="Search datasets..." initialFilters={searchFilters} />
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDatasets.length} of {datasets.length} datasets
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Dataset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-center">Downloads</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDatasets.map((dataset) => (
                <TableRow key={dataset.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium mb-1">{dataset.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {dataset.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dataset.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {dataset.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{dataset.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {dataset.themes.slice(0, 2).map((theme) => (
                        <Badge key={theme} variant="outline" className="text-xs w-fit">
                          {theme}
                        </Badge>
                      ))}
                      {dataset.themes.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{dataset.themes.length - 2} more
                        </span>
                      )}
                      {dataset.is_priority && (
                        <Badge variant="secondary" className="text-xs w-fit bg-yellow-500 text-black mt-1">
                          Priority Data
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{dataset.format}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{dataset.downloadCount.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(dataset.lastUpdated).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDataset(dataset.slug)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredDatasets.length === 0 && (
          <div className="text-center py-12 border rounded-lg">
            <h3 className="text-xl font-medium mb-2">No datasets found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button variant="outline" onClick={() => handleSearch("", {})}>
              Clear Search
            </Button>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default DatasetList;
