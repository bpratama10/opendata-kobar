import { DatasetManagement } from "@/components/admin/DatasetManagement";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminDatasets() {
  return (
    <AdminLayout>
      <DatasetManagement />
    </AdminLayout>
  );
}