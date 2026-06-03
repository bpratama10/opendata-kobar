import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ArrowLeft, Save, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LicenseExplanationDialog } from "@/components/admin/LicenseExplanationDialog";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateCustomId } from "@/components/admin/DatasetManagement";

interface GovAffairs {
  code: string;
  name: string;
}

const datasetSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  slug: z.string().trim().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
  abstract: z.string().trim().max(2000, "Abstract must be less than 2000 characters").optional(),
  contact_email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional(),
  language: z.string().min(1, "Language is required"),
  classification_code: z.string().min(1, "Classification is required"),
  license_code: z.string().min(1, "License is required"),
  update_frequency_code: z.string().min(1, "Update frequency is required"),
  temporal_start: z.string().optional(),
  temporal_end: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

interface License {
  code: string;
  name: string;
}

interface UpdateFrequency {
  code: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  short_name: string;
}

interface Theme {
  id: string;
  code: string;
  name: string;
}

export default function AdminDatasetEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isWalidata, isProdusen, isKoordinator, profile } = useRoleAccess();
  const { user, orgRoles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingDataset, setFetchingDataset] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [isPriorityDataset, setIsPriorityDataset] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [frequencies, setFrequencies] = useState<UpdateFrequency[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [govAffairs, setGovAffairs] = useState<GovAffairs[]>([]);
  const [existingCustomId, setExistingCustomId] = useState<string | null>(null);
  const [existingPublicationStatus, setExistingPublicationStatus] = useState<string | null>(null);
  const [existingUrusanCode, setExistingUrusanCode] = useState<string | null>(null);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [isSlugLocked, setIsSlugLocked] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isOngoing, setIsOngoing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    abstract: "",
    contact_email: "",
    language: "id",
    classification_code: "PUBLIC" as "PUBLIC" | "TERBATAS",
    license_code: "",
    update_frequency_code: "",
    temporal_start: "",
    temporal_end: "",
    keywords: [] as string[],
    selected_theme_ids: [] as string[],
    selected_org_id: "",
    maintainers: "", // Comma-separated maintainers
    urusan_code: "", // Add urusan_code selection
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keywordInput, setKeywordInput] = useState("");

  const hasAdminOrWalidata = orgRoles.some((role) => ["ADMIN", "WALIDATA"].includes(role.code));

  useEffect(() => {
    fetchLicenses();
    fetchUpdateFrequencies();
    fetchOrganizations();
    fetchThemes();
    fetchTags();
    fetchGovAffairs();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserOrg();
    }
  }, [user?.id]);

  useEffect(() => {
    if (id) {
      fetchDataset();
    }
  }, [id]);

  const fetchUserOrg = async () => {
    const { data, error } = await supabase.from("org_users").select("org_id").eq("id", user?.id).single();
    if (error) {
      console.error("Error fetching user org:", error);
      return;
    }
    if (data?.org_id) {
      setUserOrgId(data.org_id);
    }
  };

  const fetchDataset = async () => {
    if (!id) return;

    setFetchingDataset(true);
    try {
      // Fetch dataset metadata
      const { data: dataset, error: datasetError } = await supabase
        .from('catalog_metadata')
        .select('*')
        .eq('id', id)
        .single();

      if (datasetError) {
        toast({
          title: "Error",
          description: "Failed to fetch dataset",
          variant: "destructive",
        });
        navigate("/admin/datasets");
        return;
      }

      // RLS policies will handle access control automatically
      // If we got here and can read the dataset, we should be able to edit it
      setCanEdit(true);

      // Check if this is a priority dataset
      setIsPriorityDataset(dataset.is_priority === true);

      // Fetch associated themes
      const { data: themeData } = await supabase
        .from('catalog_dataset_themes')
        .select('theme_id')
        .eq('dataset_id', id);

      const themeIds = themeData?.map(t => t.theme_id) || [];

      // Populate form
      const keywordsArray: string[] = Array.isArray(dataset.keywords)
        ? dataset.keywords.filter((k): k is string => typeof k === 'string')
        : [];

      // Convert maintainers array to comma-separated string
      const maintainersArray: string[] = Array.isArray(dataset.maintainers)
        ? dataset.maintainers.filter((m): m is string => typeof m === 'string')
        : [];
      const maintainersString = maintainersArray.join(', ');

      // Check if temporal_end matches created_at prefix or is ongoing
      const createdDatePrefix = dataset.created_at ? dataset.created_at.split('T')[0] : "";
      const isOngoingVal = dataset.temporal_end === createdDatePrefix || dataset.temporal_end === new Date().toISOString().split('T')[0];
      setIsOngoing(isOngoingVal);

      setExistingCustomId(dataset.custom_id);
      setExistingPublicationStatus(dataset.publication_status);
      setExistingUrusanCode(dataset.urusan_code);
      setExistingOrgId(dataset.publisher_org_id);

      setFormData({
        title: dataset.title || "",
        slug: dataset.slug || "",
        description: dataset.description || "",
        abstract: dataset.abstract || "",
        contact_email: dataset.contact_email || "",
        language: dataset.language || "id",
        classification_code: dataset.classification_code || "PUBLIC",
        license_code: dataset.license_code || "",
        update_frequency_code: dataset.update_frequency_code || "",
        temporal_start: dataset.temporal_start || "",
        temporal_end: dataset.temporal_end || "",
        keywords: keywordsArray,
        selected_theme_ids: themeIds,
        selected_org_id: dataset.publisher_org_id || "",
        maintainers: maintainersString,
        urusan_code: dataset.urusan_code || "",
      });
    } catch (error) {
      console.error('Error fetching dataset:', error);
      toast({
        title: "Error",
        description: "Failed to load dataset",
        variant: "destructive",
      });
    } finally {
      setFetchingDataset(false);
    }
  };

  const fetchLicenses = async () => {
    const { data, error } = await supabase.from('lisensi').select('code, name').order('name', { ascending: true });
    if (!error && data) {
      setLicenses(data);
    }
  };

  const fetchUpdateFrequencies = async () => {
    const { data, error } = await supabase.from('freq_upd').select('code, name');
    if (!error && data) {
      setFrequencies(data);
    }
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase.from('org_organizations').select('id, name, short_name').order('name', { ascending: true });
    if (!error && data) {
      setOrganizations(data);
    }
  };

  const fetchThemes = async () => {
    const { data, error } = await supabase.from('catalog_themes').select('id, code, name').order('name');
    if (!error && data) {
      setThemes(data);
    }
  };

  const fetchTags = async () => {
    const { data, error } = await supabase.from('catalog_tags').select('name').order('name');
    if (!error && data) {
      setAvailableTags(data.map(t => t.name));
    }
  };

  const fetchGovAffairs = async () => {
    const { data, error } = await supabase.from("gov_affairs").select("code, name").order("code");
    if (!error && data) {
      setGovAffairs(data);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => {
      const prevGeneratedSlug = generateSlug(prev.title);
      const isSlugAutoSync = !prev.slug || prev.slug === prevGeneratedSlug;
      return {
        ...prev,
        title: value,
        slug: isSlugAutoSync ? generateSlug(value) : prev.slug,
      };
    });
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const toggleTheme = (themeId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_theme_ids: prev.selected_theme_ids.includes(themeId)
        ? prev.selected_theme_ids.filter(tid => tid !== themeId)
        : [...prev.selected_theme_ids, themeId]
    }));
  };

  const validateForm = () => {
    try {
      datasetSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update dataset metadata
      const { selected_org_id, selected_theme_ids, maintainers, urusan_code, ...datasetFields } = formData;

      // Parse maintainers from comma-separated string to array
      const maintainersArray = maintainers
        ? maintainers.split(',').map(m => m.trim()).filter(m => m.length > 0)
        : [];

      // For priority datasets, exclude title and slug from updates
      const updateFields = isPriorityDataset
        ? Object.fromEntries(
          Object.entries(datasetFields).filter(([key]) => key !== 'title' && key !== 'slug')
        )
        : datasetFields;

      let customId = existingCustomId;
      const targetUrusanCode = urusan_code && urusan_code !== "none" ? urusan_code : null;

      if (existingPublicationStatus === 'PUBLISHED') {
        const isUrusanChanged = targetUrusanCode !== existingUrusanCode;
        const isOrgChanged = selected_org_id !== existingOrgId;

        if (!existingCustomId || isUrusanChanged || isOrgChanged) {
          customId = await generateCustomId(selected_org_id, targetUrusanCode, id);
        }
      }

      const { error: updateError } = await supabase
        .from('catalog_metadata')
        .update({
          ...updateFields,
          publisher_org_id: selected_org_id,
          urusan_code: targetUrusanCode,
          custom_id: customId,
          keywords: formData.keywords,
          maintainers: maintainersArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Dataset update error:', updateError);
        toast({
          title: "Error",
          description: `Failed to update dataset: ${updateError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Delete existing theme associations
      await supabase
        .from('catalog_dataset_themes')
        .delete()
        .eq('dataset_id', id);

      // Create new theme associations
      if (formData.selected_theme_ids.length > 0) {
        const themeAssociations = formData.selected_theme_ids.map(themeId => ({
          dataset_id: id,
          theme_id: themeId
        }));

        await supabase
          .from('catalog_dataset_themes')
          .insert(themeAssociations);
      }

      toast({
        title: "Success",
        description: "Dataset updated successfully",
      });

      navigate("/admin/datasets");
    } catch (error) {
      console.error('Error updating dataset:', error);
      toast({
        title: "Error",
        description: "Failed to update dataset",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingDataset) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          Loading dataset...
        </div>
      </AdminLayout>
    );
  }

  if (!canEdit) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                You don't have permission to edit this dataset.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/admin/datasets")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Datasets
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Edit Dataset</h2>
              <p className="text-muted-foreground">Update dataset information</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dataset Information</CardTitle>
            <CardDescription>
              Update the information for this dataset
              {isPriorityDataset && (
                <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                  Data Prioritas
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">1. Informasi Dasar</TabsTrigger>
                <TabsTrigger value="taxonomy">2. Taksonomi & Klasifikasi</TabsTrigger>
                <TabsTrigger value="access">3. Pengaturan & Akses</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title *
                      {isPriorityDataset && (
                        <span className="ml-2 text-xs text-muted-foreground">(Locked - Priority Data)</span>
                      )}
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter dataset title"
                      disabled={isPriorityDataset}
                      className={isPriorityDataset ? "bg-muted cursor-not-allowed" : ""}
                    />
                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">
                      Slug *
                      {isPriorityDataset && (
                        <span className="ml-2 text-xs text-muted-foreground">(Locked - Priority Data)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="dataset-slug"
                        disabled={isPriorityDataset || isSlugLocked}
                        className={(isPriorityDataset || isSlugLocked) ? "bg-muted cursor-not-allowed flex-1" : "flex-1"}
                      />
                      {!isPriorityDataset && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newLocked = !isSlugLocked;
                            setIsSlugLocked(newLocked);
                            if (newLocked) {
                              setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
                            }
                          }}
                          title={isSlugLocked ? "Buka Kunci Slug (Edit Manual)" : "Kunci Slug dengan Judul"}
                        >
                          {isSlugLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-primary" />}
                        </Button>
                      )}
                    </div>
                    {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Deskripsi singkat tentang dataset"
                      rows={4}
                    />
                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="abstract">Abstraksi</Label>
                    <Textarea
                      id="abstract"
                      value={formData.abstract}
                      onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
                      placeholder="Abstraksi singkat tentang dataset"
                      rows={4}
                    />
                    {errors.abstract && <p className="text-sm text-destructive">{errors.abstract}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintainers">Penanggung Jawab Data</Label>
                  <Input
                    id="maintainers"
                    value={formData.maintainers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maintainers: e.target.value }))}
                    placeholder="Masukkan nama bidang atau unit penanggung jawab, pisahkan dengan koma"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contoh: Bidang Statistik, Bidang TI, Bidang Kominfo
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="taxonomy" className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organisasi *</Label>
                    <Select
                      value={formData.selected_org_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, selected_org_id: value }))}
                      disabled={!isAdmin && !isWalidata}
                    >
                      <SelectTrigger className={!isAdmin && !isWalidata ? 'bg-muted cursor-not-allowed' : ''}>
                        <SelectValue placeholder="Pilih organisasi">
                          {formData.selected_org_id && organizations.find((org) => org.id === formData.selected_org_id)
                            ? organizations.find((org) => org.id === formData.selected_org_id)?.short_name ||
                            organizations.find((org) => org.id === formData.selected_org_id)?.name
                            : "Pilih organisasi"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const filteredOrgs = hasAdminOrWalidata
                            ? organizations
                            : organizations.filter(org => org.id === userOrgId || org.id === formData.selected_org_id);

                          return filteredOrgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.short_name || org.name}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    {isProdusen && formData.selected_org_id && (
                      <p className="text-xs text-muted-foreground">
                        Produsen tidak dapat mengubah organisasi
                      </p>
                    )}
                    {isKoordinator && formData.selected_org_id && (
                      <p className="text-xs text-muted-foreground">
                        Koordinator hanya dapat melihat informasi organisasi
                      </p>
                    )}
                    {(isAdmin || isWalidata) && formData.selected_org_id && (
                      <p className="text-xs text-muted-foreground">
                        Anda dapat mengubah organisasi dataset
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urusan">Urusan Pemerintahan (Kode Urusan)</Label>
                    <Select
                      value={formData.urusan_code}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, urusan_code: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Urusan Pemerintahan (Opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tidak Memilih / Menggunakan Kode Kolaborator (C)</SelectItem>
                        {govAffairs.map((affair) => (
                          <SelectItem key={affair.code} value={affair.code}>
                            {affair.code} - {affair.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Urusan yang dipilih akan digunakan sebagai bagian dari kode registrasi dataset (misal: U1.06).
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <div className="space-y-2">
                    <Label htmlFor="keywords">Kata Kunci</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="Tambah kata kunci"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <Button type="button" onClick={addKeyword} variant="outline">
                        Tambah
                      </Button>
                    </div>

                    {/* Autocomplete Suggestions */}
                    {keywordInput.trim() && (
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto bg-popover text-popover-foreground space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold">Saran Tag:</p>
                        <div className="flex flex-wrap gap-1">
                          {availableTags
                            .filter(tag => tag.toLowerCase().includes(keywordInput.toLowerCase()) && !formData.keywords.includes(tag))
                            .slice(0, 10)
                            .map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, keywords: [...prev.keywords, tag] }));
                                  setKeywordInput("");
                                }}
                              >
                                + {tag}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm cursor-pointer"
                          onClick={() => removeKeyword(keyword)}
                        >
                          {keyword} ×
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                    {themes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada tema yang tersedia</p>
                    ) : (
                      themes.map((theme) => (
                        <div key={theme.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`theme-${theme.id}`}
                            checked={formData.selected_theme_ids.includes(theme.id)}
                            onChange={() => toggleTheme(theme.id)}
                            className="rounded border-gray-300"
                          />
                          <label
                            htmlFor={`theme-${theme.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {theme.name} <span className="text-muted-foreground">({theme.code})</span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.selected_theme_ids.map((themeId) => {
                      const theme = themes.find(t => t.id === themeId);
                      return theme ? (
                        <span
                          key={themeId}
                          className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm cursor-pointer"
                          onClick={() => toggleTheme(themeId)}
                        >
                          {theme.name} ×
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="access" className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email Kontak</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="contact@example.com"
                    />
                    {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Bahasa *</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahasa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Indonesia</SelectItem>
                        <SelectItem value="en">Inggris</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.language && <p className="text-sm text-destructive">{errors.language}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classification">Klasifikasi *</Label>
                    <Select
                      value={formData.classification_code}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, classification_code: value as "PUBLIC" | "TERBATAS" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih klasifikasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC">Publik</SelectItem>
                        <SelectItem value="TERBATAS">Terbatas</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.classification_code && <p className="text-sm text-destructive">{errors.classification_code}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="license">Lisensi *</Label>
                      <LicenseExplanationDialog />
                    </div>
                    <Select
                      value={formData.license_code}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, license_code: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih lisensi" />
                      </SelectTrigger>
                      <SelectContent>
                        {licenses.map((license) => (
                          <SelectItem key={license.code} value={license.code}>
                            {license.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.license_code && <p className="text-sm text-destructive">{errors.license_code}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frekuensi Update *</Label>
                    <Select
                      value={formData.update_frequency_code}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, update_frequency_code: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih frekuensi update" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencies.map((freq) => (
                          <SelectItem key={freq.code} value={freq.code}>
                            {freq.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.update_frequency_code && <p className="text-sm text-destructive">{errors.update_frequency_code}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="temporal_start">Tanggal Mulai Berlaku</Label>
                    <Input
                      id="temporal_start"
                      type="date"
                      value={formData.temporal_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, temporal_start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temporal_end">Tanggal Berakhir Berlaku</Label>
                    <Input
                      id="temporal_end"
                      type="date"
                      value={formData.temporal_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, temporal_end: e.target.value }))}
                      disabled={isOngoing}
                      className={isOngoing ? "bg-muted cursor-not-allowed font-medium text-primary" : ""}
                    />
                    <Button
                      type="button"
                      variant={isOngoing ? "secondary" : "outline"}
                      size="sm"
                      className="w-fit text-xs font-semibold shadow-sm transition-all duration-200 mt-2"
                      onClick={() => {
                        const nextOngoing = !isOngoing;
                        setIsOngoing(nextOngoing);
                        if (nextOngoing) {
                          const todayStr = new Date().toISOString().split('T')[0];
                          setFormData((prev) => ({ ...prev, temporal_end: todayStr }));
                        } else {
                          setFormData((prev) => ({ ...prev, temporal_end: "" }));
                        }
                      }}
                    >
                      {isOngoing ? (
                        <span>📅 Ubah ke Tanggal Spesifik</span>
                      ) : (
                        <span>🔗 Tandai sebagai "Masih Berjalan"</span>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/datasets")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
