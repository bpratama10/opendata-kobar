import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tags, Eye, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
}

export function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }

      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('catalog_tags')
        .insert([{ name: newTagName.trim() }])
        .select()
        .single();

      if (error) {
        console.error('Error creating tag:', error);
        toast.error("Failed to create tag");
        return;
      }

      setTags([...tags, data]);
      setNewTagName("");
      toast.success("Tag created successfully");
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error("Failed to create tag");
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading tags...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tag Management</h1>
          <p className="text-muted-foreground">Manage dataset tags and keywords</p>
        </div>
        <div className="flex space-x-2">
          <Input
            placeholder="New tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="w-48"
          />
          <Button onClick={createTag}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tags.length}</div>
            <div className="text-sm text-muted-foreground">Total Tags</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredTags.length}
            </div>
            <div className="text-sm text-muted-foreground">Filtered Results</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {filteredTags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTags.map((tag) => (
                <Card key={tag.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Tags className="w-4 h-4 mr-2 text-muted-foreground" />
                        <Badge variant="secondary">{tag.name}</Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tags found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}