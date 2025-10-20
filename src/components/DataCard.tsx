import { Calendar, Download, Eye, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface Dataset {
  id: string;
  slug: string;
  title: string;
  description: string;
  abstract?: string;
  source: string;
  tags: string[];
  downloadCount: number;
  lastUpdated: string;
  size: string;
  format: string;
  category: string;
  classification_code?: string;
  publication_status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  contact_email?: string;
  language?: string;
}

interface DataCardProps {
  dataset: Dataset;
  onView: (slug: string) => void;
}

export const DataCard = ({ dataset, onView }: DataCardProps) => {
  return (
    <Card className="data-card group h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {dataset.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {dataset.source}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {dataset.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {dataset.description}
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {dataset.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs h-6">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {dataset.tags.length > 3 && (
            <Badge variant="outline" className="text-xs h-6">
              +{dataset.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {dataset.downloadCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dataset.lastUpdated}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {dataset.size} • {dataset.format}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          onClick={() => onView(dataset.slug)} 
          className="w-full" 
          variant="outline"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Dataset
        </Button>
      </CardFooter>
    </Card>
  );
};