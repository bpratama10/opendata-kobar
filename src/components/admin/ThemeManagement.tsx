import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Edit, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Theme {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
}

export function ThemeManagement() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTheme, setNewTheme] = useState({ code: "", name: "", icon_url: "" });
  const [newIconFile, setNewIconFile] = useState<File | null>(null);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_themes')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching themes:', error);
        return;
      }

      setThemes(data || []);
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadIcon = async (file: File, themeCode: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${themeCode}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('theme-icons')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('theme-icons')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const deleteOldIcon = async (iconUrl: string | null) => {
    if (!iconUrl) return;
    
    try {
      const urlParts = iconUrl.split('/theme-icons/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('theme-icons')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting old icon:', error);
    }
  };

  const createTheme = async () => {
    if (!newTheme.code.trim() || !newTheme.name.trim()) {
      toast.error("Both code and name are required");
      return;
    }

    setUploading(true);
    try {
      let iconUrl = null;
      
      if (newIconFile) {
        iconUrl = await uploadIcon(newIconFile, newTheme.code);
      }

      const { data, error } = await supabase
        .from('catalog_themes')
        .insert([{
          code: newTheme.code,
          name: newTheme.name,
          icon_url: iconUrl
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating theme:', error);
        toast.error("Failed to create theme");
        return;
      }

      setThemes([...themes, data]);
      setNewTheme({ code: "", name: "", icon_url: "" });
      setNewIconFile(null);
      toast.success("Theme created successfully");
    } catch (error) {
      console.error('Error creating theme:', error);
      toast.error("Failed to create theme");
    } finally {
      setUploading(false);
    }
  };

  const updateTheme = async () => {
    if (!editingTheme) return;

    setUploading(true);
    try {
      let iconUrl = editingTheme.icon_url;
      
      if (editIconFile) {
        // Delete old icon if it exists
        await deleteOldIcon(editingTheme.icon_url);
        // Upload new icon
        iconUrl = await uploadIcon(editIconFile, editingTheme.code);
      }

      const { error } = await supabase
        .from('catalog_themes')
        .update({
          code: editingTheme.code,
          name: editingTheme.name,
          icon_url: iconUrl
        })
        .eq('id', editingTheme.id);

      if (error) {
        console.error('Error updating theme:', error);
        toast.error("Failed to update theme");
        return;
      }

      const updatedTheme = { ...editingTheme, icon_url: iconUrl };
      setThemes(themes.map(t => t.id === editingTheme.id ? updatedTheme : t));
      setIsEditDialogOpen(false);
      setEditingTheme(null);
      setEditIconFile(null);
      toast.success("Theme updated successfully");
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error("Failed to update theme");
    } finally {
      setUploading(false);
    }
  };

  const deleteTheme = async (id: string, iconUrl: string | null) => {
    if (!confirm("Are you sure you want to delete this theme?")) return;

    try {
      // Delete icon from storage first
      await deleteOldIcon(iconUrl);

      const { error } = await supabase
        .from('catalog_themes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting theme:', error);
        toast.error("Failed to delete theme");
        return;
      }

      setThemes(themes.filter(t => t.id !== id));
      toast.success("Theme deleted successfully");
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error("Failed to delete theme");
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const filteredThemes = themes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    theme.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading themes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Theme Management</h1>
          <p className="text-muted-foreground">Manage dataset themes and categories</p>
        </div>
        <Button onClick={createTheme} disabled={uploading}>
          <Plus className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Add Theme"}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Theme code (e.g., ECON)"
              value={newTheme.code}
              onChange={(e) => setNewTheme({ ...newTheme, code: e.target.value })}
            />
            <Input
              placeholder="Theme name (e.g., Economy)"
              value={newTheme.name}
              onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
            />
            <div>
              <Input
                type="file"
                accept="image/svg+xml,image/png,image/jpeg"
                onChange={(e) => setNewIconFile(e.target.files?.[0] || null)}
              />
              {newIconFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {newIconFile.name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{themes.length}</div>
            <div className="text-sm text-muted-foreground">Total Themes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredThemes.length}
            </div>
            <div className="text-sm text-muted-foreground">Filtered Results</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <Input
            placeholder="Search themes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Icon</th>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredThemes.map((theme) => (
                  <tr key={theme.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {theme.icon_url ? (
                        <img src={theme.icon_url} alt={theme.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {theme.code}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        {theme.name}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingTheme(theme);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteTheme(theme.id, theme.icon_url)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredThemes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No themes found.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
          </DialogHeader>
          {editingTheme && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input
                  value={editingTheme.code}
                  onChange={(e) => setEditingTheme({ ...editingTheme, code: e.target.value })}
                  placeholder="Theme code"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingTheme.name}
                  onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                  placeholder="Theme name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Upload New Icon</label>
                <Input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg"
                  onChange={(e) => setEditIconFile(e.target.files?.[0] || null)}
                />
                {editIconFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    New file: {editIconFile.name}
                  </p>
                )}
              </div>
              {editingTheme.icon_url && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Current icon:</span>
                  <img src={editingTheme.icon_url} alt="Icon preview" className="w-12 h-12 object-contain" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditIconFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={updateTheme} disabled={uploading}>
              {uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}