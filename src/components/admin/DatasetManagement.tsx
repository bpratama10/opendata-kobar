import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Eye, Database, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatasetPreviewDialog } from "./DatasetPreviewDialog";
import { UnpublishRequestDialog } from "./UnpublishRequestDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { addDays, addMonths, addYears, isAfter } from "date-fns";

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
  keywords: string[];
  is_priority: boolean;
  unpublish_request_reason?: string;
  custom_id?: string | null;
  urusan_code?: string | null;
  metadata_updated_at?: string | null;
  data_updated_at?: string | null;
  last_published_at?: string | null;
  frequency?: {
    code: string;
    name: string;
    notes: string | null;
    grace_period_months: number;
  } | null;
}

export async function generateCustomId(
  publisherOrgId: string,
  urusanCode: string | null | undefined
): Promise<string> {
  // 1. Get organization code
  let orgCode = "00";
  if (publisherOrgId) {
    const { data: orgData } = await supabase
      .from("org_organizations")
      .select("org_code")
      .eq("id", publisherOrgId)
      .maybeSingle();
    if (orgData?.org_code) {
      orgCode = orgData.org_code.padStart(2, "0");
    }
  }

  // 2. Build prefix
  // If urusanCode is provided (e.g. "1.06"), middle code is "U1.06"
  // If not, middle code is "C[orgCode]" (e.g. "C01")
  const middlePart = urusanCode ? `U${urusanCode}` : `C${orgCode}`;
  const prefix = `6201.${middlePart}.`;

  // 3. Find next sequence number
  const { data: existingDatasets, error } = await supabase
    .from("catalog_metadata")
    .select("custom_id")
    .like("custom_id", `${prefix}%`);

  let nextSeq = 1;
  if (!error && existingDatasets && existingDatasets.length > 0) {
    const seqs = existingDatasets
      .map((d) => {
        const parts = d.custom_id?.split(".");
        const seqStr = parts ? parts[parts.length - 1] : "";
        const parsed = parseInt(seqStr, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
    nextSeq = Math.max(...seqs, 0) + 1;
  }

  const sequenceStr = String(nextSeq).padStart(4, "0");
  return `${prefix}${sequenceStr}`;
}

export function DatasetManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { permissions, isProdusen, isAdmin } = useRoleAccess();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const getExpectedUpdateInfo = (dataset: Dataset) => {
    const baseDateStr = dataset.data_updated_at || dataset.created_at || dataset.updated_at;
    const baseDate = new Date(baseDateStr);

    if (isNaN(baseDate.getTime())) {
      return { isExpired: false, dateDisplay: "—", statusText: "—" };
    }

    const frequencyCode = dataset.frequency?.code || "TAH";
    let nextUpdateDue = new Date(baseDate);

    switch (frequencyCode) {
      case 'HAR': // Harian
        nextUpdateDue = addDays(baseDate, 1);
        break;
      case 'BLN': // Bulanan
        nextUpdateDue = addMonths(baseDate, 1);
        break;
      case 'TRI': // Triwulan
        nextUpdateDue = addMonths(baseDate, 3);
        break;
      case 'SEM': // Semester
        nextUpdateDue = addMonths(baseDate, 6);
        break;
      case 'TAH': // Tahunan
        nextUpdateDue = addYears(baseDate, 1);
        break;
      case 'HUB': // Hubungi Penyedia
      default:
        return { isExpired: false, dateDisplay: "Hubungi Penyedia", statusText: "Hubungi Penyedia" };
    }

    // Apply Tolerance Grace Period (Masa Tenggang) from Update Frequency configuration
    const graceMonths = dataset.frequency?.grace_period_months || 0;
    if (graceMonths > 0) {
      nextUpdateDue = addMonths(nextUpdateDue, graceMonths);
    }

    const isExpired = isAfter(new Date(), nextUpdateDue);
    const formattedDate = nextUpdateDue.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    return {
      isExpired,
      dateDisplay: formattedDate,
      statusText: isExpired ? "Terlambat" : "Terpenuhi"
    };
  };

  const getReviewType = (dataset: Dataset) => {
    const isPendingReview = dataset.publication_status === 'PENDING_REVIEW';
    if (!isPendingReview) return null;

    const metadataUpdatedAt = dataset.metadata_updated_at ? new Date(dataset.metadata_updated_at) : null;
    const dataUpdatedAt = dataset.data_updated_at ? new Date(dataset.data_updated_at) : null;
    const lastPublishedAt = dataset.last_published_at ? new Date(dataset.last_published_at) : null;

    let reviewType: 'metadata_only' | 'real_data' | 'new_dataset' = 'new_dataset';

    if (lastPublishedAt) {
      if (metadataUpdatedAt && dataUpdatedAt) {
        if (metadataUpdatedAt > lastPublishedAt && dataUpdatedAt <= lastPublishedAt) {
          reviewType = 'metadata_only';
        } else if (dataUpdatedAt > lastPublishedAt) {
          reviewType = 'real_data';
        }
      }
    }
    return reviewType;
  };

  useEffect(() => {
    const fetchUserOrg = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("org_users")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setUserOrgId(data.org_id);
    };
    fetchUserOrg();
  }, [user]);

  const fetchDatasets = async () => {
    try {
      let query = supabase
        .from('catalog_metadata')
        .select(`
          *,
          frequency:freq_upd!fk_catalog_metadata_update_frequency_code (
            code,
            name,
            notes,
            grace_period_months
          )
        `);

      // Filter by org for PRODUSEN users
      if (isProdusen && userOrgId) {
        query = query.eq('publisher_org_id', userOrgId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch datasets",
          variant: "destructive",
        });
        return;
      }

      setDatasets(data as Dataset[] || []);
    } catch (error) {
      console.error('Error fetching datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isProdusen ? userOrgId !== null : true) {
      fetchDatasets();
    }
  }, [userOrgId, isProdusen]);

  const updatePublicationStatus = async (id: string, newStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED') => {
    try {
      const dataset = datasets.find(d => d.id === id);
      let updatePayload: any = {
        publication_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'PUBLISHED' && dataset && !dataset.custom_id) {
        const customId = await generateCustomId(dataset.publisher_org_id, dataset.urusan_code);
        updatePayload.custom_id = customId;
      }

      const { error } = await supabase
        .from('catalog_metadata')
        .update(updatePayload)
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

    // Unpublish handling based on role
    if (dataset.publication_status === 'PUBLISHED') {
      if (isProdusen) {
        // PRODUSEN requests unpublish
        actions.push(
          <Button
            key="request-unpublish"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDataset(dataset);
              setUnpublishDialogOpen(true);
            }}
            title="Request unpublish"
          >
            Request Unpublish
          </Button>
        );
      } else if (permissions.canPublishDatasets) {
        // ADMIN/WALIDATA can unpublish directly
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

  const handleDelete = async (dataset: Dataset) => {
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;
    setDeleting(true);
    try {
      const catalogId = datasetToDelete.id;

      // 1. Delete theme associations
      const { error: themesErr } = await supabase
        .from('catalog_dataset_themes')
        .delete()
        .eq('dataset_id', catalogId);
      if (themesErr) throw themesErr;

      // 2. Delete data resources
      const { error: resourcesErr } = await supabase
        .from('catalog_resources')
        .delete()
        .eq('dataset_id', catalogId);
      if (resourcesErr) throw resourcesErr;

      // 3. Handle priority dataset status reset if applicable
      if (datasetToDelete.is_priority) {
        // Find priority dataset id from the metadata row
        const { data: catData } = await supabase
          .from('catalog_metadata')
          .select('priority_dataset_id')
          .eq('id', catalogId)
          .maybeSingle();

        if (catData?.priority_dataset_id) {
          const priorityId = catData.priority_dataset_id;

          // Reset priority dataset status to unassigned
          await supabase.from('priority_datasets').update({
            status: 'unassigned',
            assigned_org: null,
            assigned_by: null,
            assigned_at: null,
            claimed_by: null,
            claimed_at: null
          }).eq('id', priorityId);

          // Log the reset event
          await supabase.from('priority_dataset_logs').insert({
            priority_dataset_id: priorityId,
            action: 'unassign',
            actor_id: user?.id || 'system',
            notes: 'Reset to unassigned due to catalog dataset deletion'
          });
        }
      }

      // 4. Finally, delete the catalog dataset itself
      const { error: deleteErr } = await supabase
        .from('catalog_metadata')
        .delete()
        .eq('id', catalogId);

      if (deleteErr) throw deleteErr;

      toast({
        title: "Success",
        description: "Dataset and its referenced values deleted successfully",
      });

      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
      fetchDatasets();
    } catch (error: any) {
      console.error("Error deleting dataset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete dataset",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Calculate counts for filter cards
  const priorityCount = datasets.filter(d => d.is_priority).length;
  const basicCount = datasets.filter(d => !d.is_priority).length;
  const draftCount = datasets.filter(d => d.publication_status === 'DRAFT').length;
  const pendingCount = datasets.filter(d => d.publication_status === 'PENDING_REVIEW').length;
  const publishedCount = datasets.filter(d => d.publication_status === 'PUBLISHED').length;
  const rejectedCount = datasets.filter(d => d.publication_status === 'REJECTED').length;

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dataset.abstract && dataset.abstract.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDatasetType = true;
    if (datasetFilter) {
      if (datasetFilter === 'priority') {
        matchesDatasetType = dataset.is_priority;
      } else if (datasetFilter === 'basic') {
        matchesDatasetType = !dataset.is_priority;
      }
    }

    let matchesStatus = true;
    if (statusFilter) {
      matchesStatus = dataset.publication_status === statusFilter;
    }

    return matchesSearch && matchesDatasetType && matchesStatus;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, datasetFilter, statusFilter]);

  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const paginatedDatasets = filteredDatasets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const pageRangeDisplayed = 5;

    let startPage = currentPage;
    const endPage = Math.min(totalPages, currentPage + pageRangeDisplayed - 1);

    if (endPage - startPage + 1 < pageRangeDisplayed && startPage > 1) {
      startPage = Math.max(1, endPage - pageRangeDisplayed + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button variant="ghost" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</Button>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
          </PaginationItem>
          {startPage > 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {pageNumbers.map(number => (
            <PaginationItem key={number}>
              <PaginationLink href="#" isActive={number === currentPage} onClick={(e) => { e.preventDefault(); handlePageChange(number); }}>
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
          </PaginationItem>
          <PaginationItem>
            <Button variant="ghost" size="sm" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>Last</Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Datasets ({datasets.length})</CardTitle>
              <CardDescription>
                Manage your data catalog entries
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search datasets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${datasetFilter === 'priority' ? 'ring-2 ring-amber-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setDatasetFilter(datasetFilter === 'priority' ? null : 'priority');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Priority</p>
                    <p className="text-lg font-bold">{priorityCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs px-1 py-0 h-4 w-4 flex items-center justify-center">★</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${datasetFilter === 'basic' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setDatasetFilter(datasetFilter === 'basic' ? null : 'basic');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Basic</p>
                    <p className="text-lg font-bold">{basicCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Database className="h-3 w-3 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'DRAFT' ? 'ring-2 ring-gray-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'DRAFT' ? null : 'DRAFT');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Draft</p>
                    <p className="text-lg font-bold">{draftCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Edit className="h-3 w-3 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'PENDING_REVIEW' ? 'ring-2 ring-yellow-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'PENDING_REVIEW' ? null : 'PENDING_REVIEW');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold">{pendingCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Eye className="h-3 w-3 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'PUBLISHED' ? 'ring-2 ring-green-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'PUBLISHED' ? null : 'PUBLISHED');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Published</p>
                    <p className="text-lg font-bold">{publishedCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Search className="h-3 w-3 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-500' : 'hover:bg-gray-50'}`}
              onClick={() => {
                setStatusFilter(statusFilter === 'REJECTED' ? null : 'REJECTED');
                setCurrentPage(1);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                    <p className="text-lg font-bold">{rejectedCount}</p>
                  </div>
                  <div className="h-6 w-6 bg-red-100 rounded-full flex items-center justify-center">
                    <Badge className="bg-red-500 text-white border-0 text-xs px-1 py-0 h-3 w-3 flex items-center justify-center">✕</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(datasetFilter || statusFilter) && (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <span className="text-sm text-blue-700">
                Filtered by: <strong>
                  {datasetFilter === 'priority' ? 'Priority Datasets' :
                    datasetFilter === 'basic' ? 'Basic Datasets' :
                      statusFilter === 'DRAFT' ? 'Draft Status' :
                        statusFilter === 'PENDING_REVIEW' ? 'Pending Review' :
                          statusFilter === 'PUBLISHED' ? 'Published' :
                            statusFilter === 'REJECTED' ? 'Rejected' : ''}
                </strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDatasetFilter(null);
                  setStatusFilter(null);
                  setCurrentPage(1);
                }}
                className="text-blue-700 hover:text-blue-800"
              >
                Clear Filter
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Update</TableHead>
                <TableHead>Tipe Perubahan</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDatasets.map((dataset) => {
                const reviewType = getReviewType(dataset);
                const expectedUpdate = getExpectedUpdateInfo(dataset);

                return (
                  <TableRow key={dataset.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 py-1">
                        <div className="font-semibold text-sm text-foreground">
                          {dataset.title}
                        </div>
                        <div className="flex items-center">
                          {dataset.custom_id ? (
                            <Badge variant="outline" className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {dataset.custom_id}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50 border-amber-200">
                              Belum Terdaftar (Draft/Review)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">{dataset.classification_code}</Badge>
                        {dataset.is_priority && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                            Prioritas
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {dataset.unpublish_request_reason && dataset.publication_status === 'PUBLISHED' ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-500">
                              UNPUBLISH REVIEW
                            </Badge>
                          ) : (
                            <Badge variant={getStatusBadgeVariant(dataset.publication_status)}>
                              {dataset.publication_status.replace('_', ' ')}
                            </Badge>
                          )}
                          {getStatusActions(dataset)}
                        </div>
                        {dataset.unpublish_request_reason && permissions.canPublishDatasets && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold">Reason:</span> {dataset.unpublish_request_reason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dataset.publication_status === 'PUBLISHED' ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={
                              expectedUpdate.isExpired
                                ? "bg-red-500 hover:bg-red-600 text-white font-semibold border-0 text-xs w-fit"
                                : "bg-green-500 hover:bg-green-600 text-white font-semibold border-0 text-xs w-fit"
                            }
                          >
                            {expectedUpdate.statusText}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            Batas: {expectedUpdate.dateDisplay}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground font-medium">
                          {dataset.frequency?.name || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reviewType ? (
                        <div className="flex flex-col gap-1">
                          {reviewType === 'metadata_only' && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs w-fit">
                              📝 Informasi
                            </Badge>
                          )}
                          {reviewType === 'real_data' && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-semibold text-xs w-fit">
                              📊 Data Tabel
                            </Badge>
                          )}
                          {reviewType === 'new_dataset' && (
                            <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 font-semibold text-xs w-fit">
                              🔰 Baru
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground font-medium">—</span>
                      )}
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
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dataset)}
                            title="Hapus dataset"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter>
            {renderPagination()}
          </CardFooter>
        )}
      </Card>

      <DatasetPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        dataset={previewDataset}
      />

      <UnpublishRequestDialog
        open={unpublishDialogOpen}
        onOpenChange={setUnpublishDialogOpen}
        dataset={selectedDataset}
        onSuccess={fetchDatasets}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Hapus Dataset
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
              <p className="text-sm font-semibold text-red-800">{datasetToDelete?.title}</p>
              <p className="text-xs text-red-600">ID: {datasetToDelete?.id}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus dataset ini beserta semua data resource dan relasi tema secara permanen?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
