import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  initialFilters?: SearchFilters;
}

export interface SearchFilters {
  theme?: string;
  format?: string;
  sortBy?: string;
}

export const SearchBar = ({ onSearch, placeholder = "Search datasets...", initialFilters = {} }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);

  useEffect(() => {
    const fetchThemes = async () => {
      const { data } = await supabase
        .from('catalog_themes')
        .select('name')
        .order('name');

      if (data) {
        setThemes(data.map(t => t.name));
      }
    };
    fetchThemes();
  }, []);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [JSON.stringify(initialFilters)]);

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const clearFilters = () => {
    setFilters({});
    onSearch(query, {});
  };

  const formats = ["CSV", "JSON", "XML", "PDF", "API"];
  const sortOptions = ["Relevance", "Recent", "Most Downloaded", "Most Viewed", "A-Z", "Z-A"];

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={placeholder}
          className="pl-12 pr-32 h-14 text-lg rounded-2xl border-2 focus:border-primary/50 bg-card shadow-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 ${activeFiltersCount > 0 ? 'text-primary' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 text-xs rounded-full">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <Button onClick={handleSearch} size="sm" className="h-10 px-6">
            Search
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filter Results</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <Select
                value={filters.theme || "all"}
                onValueChange={(value) => setFilters({ ...filters, theme: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All themes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All themes</SelectItem>
                  {themes.map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <Select
                value={filters.format || "all"}
                onValueChange={(value) => setFilters({ ...filters, format: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  {formats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort by</label>
              <Select
                value={filters.sortBy || "Relevance"}
                onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
