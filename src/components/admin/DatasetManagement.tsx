import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Eye, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatasetPreviewDialog } from "./DatasetPreviewDialog";

interface Dataset {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  description: string;
  classification_code: string;
  publication_status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  contact_email: string;
  language: string;
  publisher_org_id: string;
  license_code: string;
  update_frequency_code: string;
  temporal_start: string;
  temporal_end: string;
  keywords: any; // Json type from Supabase
}

export function DatasetManagement() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const fetchDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_metadata')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch datasets",
          variant: "destructive",
        });
        return;
      }

      setDatasets(data || []);
    } catch (error) {
      console.error('Error fetching datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const updatePublicationStatus = async (id: string, newStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED') => {
    try {
      const { error } = await supabase
        .from('catalog_metadata')
        .update({ 
          publication_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update dataset status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Dataset status updated to ${newStatus.toLowerCase()}`,
      });

      fetchDatasets();
    } catch (error) {
      console.error('Error updating dataset:', error);
      toast({
        title: "Error", 
        description: "Failed to update dataset status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'default';
      case 'PENDING_REVIEW': return 'secondary';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusActions = (dataset: Dataset) => {
    const actions = [];
    
    // PRODUSEN can submit for review from DRAFT or REJECTED
    if ((dataset.publication_status === 'DRAFT' || dataset.publication_status === 'REJECTED')) {
      actions.push(
        <Button
          key="submit"
          variant="ghost"
          size="sm"
          onClick={() => updatePublicationStatus(dataset.id, 'PENDING_REVIEW')}
          title="Submit for review"
        >
          Submit for Review
        </Button>
      );
    }
    
    // WALIDATA/ADMIN can publish from PENDING_REVIEW
    if (dataset.publication_status === 'PENDING_REVIEW') {
      actions.push(
        <Button
          key="publish"
          variant="ghost"
          size="sm"
          onClick={() => updatePublicationStatus(dataset.id, 'PUBLISHED')}
          title="Publish dataset"
        >
          Publish
        </Button>
      );
      actions.push(
        <Button
          key="reject"
          variant="ghost"
          size="sm"
          onClick={() => updatePublicationStatus(dataset.id, 'REJECTED')}
          title="Reject dataset"
        >
          Reject
        </Button>
      );
    }
    
    // WALIDATA/ADMIN can unpublish
    if (dataset.publication_status === 'PUBLISHED') {
      actions.push(
        <Button
          key="unpublish"
          variant="ghost"
          size="sm"
          onClick={() => updatePublicationStatus(dataset.id, 'DRAFT')}
          title="Unpublish dataset"
        >
          Unpublish
        </Button>
      );
    }
    
    return actions;
  };

  const handlePreview = (dataset: Dataset) => {
    setPreviewDataset(dataset);
    setPreviewOpen(true);
  };

  const handleEdit = (dataset: Dataset) => {
    navigate(`/admin/datasets/edit/${dataset.id}`);
  };

  const filteredDatasets = datasets.filter(dataset =>
    dataset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.abstract?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading datasets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dataset Management</h2>
          <p className="text-muted-foreground">Manage your data catalog entries</p>
        </div>
        <Button onClick={() => navigate("/admin/datasets/add")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Dataset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datasets ({datasets.length})</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search datasets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDatasets.map((dataset) => (
                <TableRow key={dataset.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{dataset.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {dataset.abstract?.substring(0, 100)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dataset.classification_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(dataset.publication_status)}>
                        {dataset.publication_status.replace('_', ' ')}
                      </Badge>
                      {getStatusActions(dataset)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dataset.language?.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(dataset.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePreview(dataset)}
                        title="Preview dataset"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(dataset)}
                        title="Edit dataset"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/admin/datasets/${dataset.id}/tables`)}
                        title="Manage data tables"
                      >
                        <Database className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <DatasetPreviewDialog 
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        dataset={previewDataset}
      />
    </div>
  );
}