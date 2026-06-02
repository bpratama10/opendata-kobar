import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Scale, Edit, Plus, Trash2, Search, AlertCircle } from "lucide-react";

interface GovAffair {
  code: string;
  name: string;
  created_at: string;
}

export function GovAffairsManagement() {
  const { toast } = useToast();
  const { isAdmin, isWalidata, isKoordinator } = useRoleAccess();
  
  const [govAffairs, setGovAffairs] = useState<GovAffair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAffair, setSelectedAffair] = useState<GovAffair | null>(null);
  
  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check management permission (Admin/Walidata can edit, Koordinator is read-only)
  const canManage = isAdmin || isWalidata;

  const fetchGovAffairs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gov_affairs')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        throw error;
      }

      setGovAffairs(data || []);
    } catch (error: any) {
      console.error('Error fetching gov affairs:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil data urusan pemerintahan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovAffairs();
  }, []);

  const handleOpenAddDialog = () => {
    setSelectedAffair(null);
    setCode("");
    setName("");
    setFormError("");
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (affair: GovAffair) => {
    setSelectedAffair(affair);
    setCode(affair.code);
    setName(affair.name);
    setFormError("");
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (affair: GovAffair) => {
    setSelectedAffair(affair);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!code.trim()) {
      setFormError("Kode DDP wajib diisi");
      return;
    }

    if (!/^\d\.\d{2}$/.test(code.trim())) {
      setFormError("Format kode tidak valid (harus X.XX, contoh: 1.01)");
      return;
    }

    if (!name.trim()) {
      setFormError("Nama urusan wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      if (selectedAffair) {
        // Edit mode (code is read-only)
        const { error } = await supabase
          .from('gov_affairs')
          .update({ name: name.trim() })
          .eq('code', selectedAffair.code);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Urusan pemerintahan berhasil diperbarui"
        });
      } else {
        // Add mode
        // Check if code already exists
        const exists = govAffairs.some(a => a.code === code.trim());
        if (exists) {
          setFormError("Kode DDP ini sudah terdaftar");
          setSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('gov_affairs')
          .insert({ code: code.trim(), name: name.trim() });

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Urusan pemerintahan baru berhasil ditambahkan"
        });
      }

      setDialogOpen(false);
      fetchGovAffairs();
    } catch (error: any) {
      console.error('Error saving gov affair:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAffair) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gov_affairs')
        .delete()
        .eq('code', selectedAffair.code);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Urusan pemerintahan berhasil dihapus"
      });

      setDeleteDialogOpen(false);
      fetchGovAffairs();
    } catch (error: any) {
      console.error('Error deleting gov affair:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAffairs = govAffairs.filter(affair =>
    affair.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affair.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat data urusan...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Urusan Pemerintahan</h1>
          <p className="text-muted-foreground">Kelola kode urusan pemerintahan (SDI) untuk standarisasi dataset daerah</p>
        </div>
        {canManage ? (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Urusan
          </Button>
        ) : (
          <Badge variant="secondary">View Only</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{govAffairs.length}</div>
            <div className="text-sm text-muted-foreground">Total Urusan Pemerintahan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredAffairs.length}</div>
            <div className="text-sm text-muted-foreground">Hasil Pencarian</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Daftar Kode Urusan</CardTitle>
          <div className="flex items-center space-x-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama urusan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold text-muted-foreground uppercase">
                  <th className="text-left p-3 w-[150px]">Kode Urusan</th>
                  <th className="text-left p-3">Nama Urusan Pemerintahan</th>
                  <th className="text-left p-3 w-[200px]">Tanggal Dibuat</th>
                  {canManage && <th className="text-right p-3 w-[150px]">Aksi</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredAffairs.map((affair) => (
                  <tr key={affair.code} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-mono font-bold">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {affair.code}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center font-medium">
                        <Scale className="w-4 h-4 mr-2 text-muted-foreground" />
                        {affair.name}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(affair.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </td>
                    {canManage && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenEditDialog(affair)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenDeleteDialog(affair)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAffairs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada data urusan pemerintahan ditemukan.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAffair ? "Ubah Urusan Pemerintahan" : "Tambah Urusan Pemerintahan"}
            </DialogTitle>
            <DialogDescription>
              {selectedAffair 
                ? "Ubah nama urusan pemerintahan yang ada. Kode DDP tidak dapat diubah." 
                : "Masukkan kode dan nama urusan pemerintahan baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Urusan (Format: X.XX) *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: 1.01"
                disabled={!!selectedAffair}
                className={selectedAffair ? "bg-muted cursor-not-allowed font-mono" : "font-mono"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Urusan Pemerintahan *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Urusan Pemerintahan Bidang Pendidikan"
              />
            </div>
            
            {formError && (
              <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {formError}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Hapus Urusan Pemerintahan
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
              <p className="text-sm font-semibold text-red-850">{selectedAffair?.name}</p>
              <p className="text-xs text-red-600">Kode: {selectedAffair?.code}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus data urusan ini? Jika ada dataset yang menggunakan urusan ini, referensi kodenya akan diset menjadi kosong (NULL).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
