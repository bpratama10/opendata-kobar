import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

interface License {
  code: string;
  name: string;
  url: string | null;
  notes: string | null;
}

export function LicenseExplanationDialog() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from("lisensi")
        .select("code, name, url, notes")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching licenses for dialog:", error);
        return;
      }

      setLicenses(data || []);
    } catch (error) {
      console.error("Error fetching licenses for dialog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && fetchLicenses()}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer transition-colors"
        >
          (Penjelasan)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Penjelasan Lisensi Dataset
          </DialogTitle>
          <DialogDescription>
            Berikut adalah penjelasan mengenai jenis lisensi yang dapat Anda pilih untuk dataset ini.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Memuat penjelasan lisensi...</span>
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data lisensi yang ditemukan.
            </div>
          ) : (
            <div className="grid gap-4">
              {licenses.map((license) => (
                <div
                  key={license.code}
                  className="p-4 border rounded-xl bg-card hover:bg-accent/10 transition-all duration-200 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {license.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] sm:text-xs bg-muted text-muted-foreground border border-border"
                      >
                        {license.code}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {license.notes || "Tidak ada penjelasan tambahan untuk lisensi ini."}
                    </p>
                  </div>
                  {license.url && (
                    <div className="pt-1">
                      <a
                        href={license.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline hover:text-primary/95 transition-colors"
                      >
                        Baca selengkapnya mengenai {license.code}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
