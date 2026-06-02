import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GovAffairsManagement } from "@/components/admin/GovAffairsManagement";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function AdminGovAffairs() {
  const navigate = useNavigate();
  const { isAdmin, isWalidata, isKoordinator, loading } = useRoleAccess();
  
  const canAccess = isAdmin || isWalidata || isKoordinator;

  useEffect(() => {
    if (!loading && !canAccess) {
      navigate("/admin/datasets");
    }
  }, [loading, canAccess, navigate]);

  if (loading || !canAccess) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          Memeriksa hak akses...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <GovAffairsManagement />
    </AdminLayout>
  );
}
