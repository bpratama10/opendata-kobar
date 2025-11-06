import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PriorityDataTable } from "@/components/admin/PriorityDataTable";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Badge } from "@/components/ui/badge";

export default function PriorityData() {
  const { permissions } = useRoleAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!permissions.canViewPriorityData) {
      navigate('/admin/datasets');
    }
  }, [permissions.canViewPriorityData, navigate]);

  if (!permissions.canViewPriorityData) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-2xl font-bold">Data Prioritas (Pusat)</h1>
          {permissions.isWalidataReadOnly && (
            <Badge variant="secondary">View Only</Badge>
          )}
        </div>
        <PriorityDataTable />
      </div>
    </AdminLayout>
  );
}
