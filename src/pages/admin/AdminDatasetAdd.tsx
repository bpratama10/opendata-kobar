import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Send } from "lucide-react";
import { z } from "zod";

const datasetSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  slug: z.string().trim().min(1, "Slug is required").max(255, "Slug must be less than 255 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
  abstract: z.string().trim().max(2000, "Abstract must be less than 2000 characters").optional(),
  contact_email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional(),
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

export default function AdminDatasetAdd() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, orgRoles, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [frequencies, setFrequencies] = useState<UpdateFrequency[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
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
    selected_org_id: "", // Add organization selection
    maintainers: "", // Comma-separated maintainers
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keywordInput, setKeywordInput] = useState("");

  // Check if user has ADMIN or WALIDATA role
  const hasAdminOrWalidata = orgRoles.some((role) => ["ADMIN", "WALIDATA"].includes(role.code));

  useEffect(() => {
    fetchLicenses();
    fetchUpdateFrequencies();
    fetchOrganizations();
    fetchThemes();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchUserOrg();
    }
  }, [user?.id]);

  const fetchLicenses = async () => {
    const { data, error } = await supabase.from("lisensi").select("code, name");
    if (!error && data) {
      setLicenses(data);
    }
  };

  const fetchUpdateFrequencies = async () => {
    const { data, error } = await supabase.from("freq_upd").select("code, name");
    if (!error && data) {
      setFrequencies(data);
    }
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase.from("org_organizations").select("id, name, short_name");
    if (!error && data) {
      console.log("📋 Loaded organizations:", data.length);
      setOrganizations(data);
    } else {
      console.error("❌ Error loading organizations:", error);
    }
  };

  const fetchThemes = async () => {
    const { data, error } = await supabase.from("catalog_themes").select("id, code, name").order("name");
    if (!error && data) {
      setThemes(data);
    }
  };

  const fetchUserOrg = async () => {
    if (!user?.id) return;

    console.log("🔍 Fetching org for user:", user.id);

    const { data, error } = await supabase.from("org_users").select("org_id").eq("id", user.id).single();

    if (error) {
      console.error("❌ Error fetching user org:", error);
      return;
    }

    if (data?.org_id) {
      console.log("✅ Found org_id:", data.org_id);
      setUserOrgId(data.org_id);
      
      // Auto-assign org immediately for all non-admin/walidata users
      setFormData((prev) => ({ ...prev, selected_org_id: data.org_id }));
      console.log("🔒 Auto-assigned org_id to form");
    } else {
      console.warn("⚠️ No org_id found for user");
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: generateSlug(value),
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }));
  };

  const toggleTheme = (themeId: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_theme_ids: prev.selected_theme_ids.includes(themeId)
        ? prev.selected_theme_ids.filter((id) => id !== themeId)
        : [...prev.selected_theme_ids, themeId],
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

  const handleSaveDraft = async () => {
    await submitDataset("DRAFT");
  };

  const handleSubmitForReview = async () => {
    if (!validateForm()) {
      return;
    }
    await submitDataset("PENDING_REVIEW");
  };

  const submitDataset = async (status: "DRAFT" | "PENDING_REVIEW") => {
    setLoading(true);
    try {
      // Validate that an organization is selected
      if (!formData.selected_org_id) {
        toast({
          title: "Error",
          description: "Please select an organization for this dataset",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create the dataset metadata
      const { selected_org_id, selected_theme_ids, maintainers, ...datasetFields } = formData;

      // Parse maintainers from comma-separated string to array
      const maintainersArray = maintainers
        ? maintainers
            .split(",")
            .map((m) => m.trim())
            .filter((m) => m.length > 0)
        : [];

      const { data: datasetData, error: datasetError } = await supabase
        .from("catalog_metadata")
        .insert({
          ...datasetFields,
          publisher_org_id: selected_org_id,
          publication_status: status,
          keywords: formData.keywords,
          maintainers: maintainersArray,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (datasetError) {
        toast({
          title: "Error",
          description: `Failed to create dataset: ${datasetError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Create a default table resource for data entry
      const { error: resourceError } = await supabase.from("catalog_resources").insert({
        dataset_id: datasetData.id,
        name: `${formData.title} - Data Table`,
        description: "Primary data table for this dataset",
        resource_type: "TABLE",
        schema_json: {},
      });

      if (resourceError) {
        toast({
          title: "Warning",
          description: "Dataset created but failed to create data table resource",
          variant: "destructive",
        });
      }

      // Create theme associations
      if (formData.selected_theme_ids.length > 0) {
        const themeAssociations = formData.selected_theme_ids.map((themeId) => ({
          dataset_id: datasetData.id,
          theme_id: themeId,
        }));

        const { error: themesError } = await supabase.from("catalog_dataset_themes").insert(themeAssociations);

        if (themesError) {
          toast({
            title: "Warning",
            description: "Dataset created but failed to associate themes",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: `Dataset ${status === "DRAFT" ? "saved as draft" : "submitted for review"} successfully`,
      });

      navigate("/admin/datasets");
    } catch (error) {
      console.error("Error creating dataset:", error);
      toast({
        title: "Error",
        description: "Failed to create dataset",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has PRODUSEN role or higher (using org roles only)
  const canCreateDataset =
    orgRoles.some((role) => ["PRODUSEN", "WALIDATA", "ADMIN"].includes(role.code));

  if (!canCreateDataset) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                You need PRODUSEN role or admin privileges to create datasets.
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
              <h2 className="text-2xl font-bold">Add New Dataset</h2>
              <p className="text-muted-foreground">Create a new dataset entry</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Dataset</CardTitle>
            <CardDescription>Masukan informasi Dasar terkait Dataset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter dataset title"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="dataset-slug"
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the dataset"
                rows={3}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abstract">Abstraksi</Label>
              <Textarea
                id="abstract"
                value={formData.abstract}
                onChange={(e) => setFormData((prev) => ({ ...prev, abstract: e.target.value }))}
                placeholder="Detailed abstract of the dataset"
                rows={4}
              />
              {errors.abstract && <p className="text-sm text-destructive">{errors.abstract}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintainers">Penanggung Jawab Data</Label>
              <Input
                id="maintainers"
                value={formData.maintainers}
                onChange={(e) => setFormData((prev) => ({ ...prev, maintainers: e.target.value }))}
                placeholder="Masukkan nama bidang atau unit penanggung jawab, pisahkan dengan koma"
              />
              <p className="text-xs text-muted-foreground">Contoh: Bidang Statistik, Bidang TI, Bidang Kominfo</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Kontak Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Masukan email Dinas go.id"
                />
                {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Bahasa *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Indonesian</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                {errors.language && <p className="text-sm text-destructive">{errors.language}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Assign to Organization *</Label>
                <Select
                  value={formData.selected_org_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, selected_org_id: value }))}
                  disabled={false}
                >
                  <SelectTrigger>
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
                        : organizations.filter(org => org.id === userOrgId);
                      
                      console.log("🔍 Dropdown render:", {
                        hasAdminOrWalidata,
                        userOrgId,
                        totalOrgs: organizations.length,
                        filteredOrgs: filteredOrgs.length
                      });
                      
                      return filteredOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.short_name || org.name}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                {!orgRoles.some((role) => ["ADMIN", "WALIDATA"].includes(role.code)) && formData.selected_org_id && (
                  <p className="text-xs text-muted-foreground">Otomatis ditetapkan ke organisasi Anda</p>
                )}
                {!formData.selected_org_id && <p className="text-sm text-destructive">Organisasi wajib diisi</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classification">Klasifikasi *</Label>
                <Select
                  value={formData.classification_code}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, classification_code: value as "PUBLIC" | "TERBATAS" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="TERBATAS">Terbatas</SelectItem>
                  </SelectContent>
                </Select>
                {errors.classification_code && <p className="text-sm text-destructive">{errors.classification_code}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="license">Lisensi *</Label>
                <Select
                  value={formData.license_code}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, license_code: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select license" />
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
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, update_frequency_code: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq.code} value={freq.code}>
                        {freq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.update_frequency_code && (
                  <p className="text-sm text-destructive">{errors.update_frequency_code}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="temporal_start">Temporal Start</Label>
                <Input
                  id="temporal_start"
                  type="date"
                  value={formData.temporal_start}
                  onChange={(e) => setFormData((prev) => ({ ...prev, temporal_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temporal_end">Temporal End</Label>
                <Input
                  id="temporal_end"
                  type="date"
                  value={formData.temporal_end}
                  onChange={(e) => setFormData((prev) => ({ ...prev, temporal_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Tagging</Label>
              <div className="flex space-x-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" onClick={addKeyword} variant="outline">
                  Add
                </Button>
              </div>
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

            <div className="space-y-2">
              <Label>Themes (Taxonomy)</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                {themes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No themes available</p>
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
                      <label htmlFor={`theme-${theme.id}`} className="text-sm cursor-pointer flex-1">
                        {theme.name} <span className="text-muted-foreground">({theme.code})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.selected_theme_ids.map((themeId) => {
                  const theme = themes.find((t) => t.id === themeId);
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

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/datasets")} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={loading}>
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button type="button" onClick={handleSubmitForReview} disabled={loading}>
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Review
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
