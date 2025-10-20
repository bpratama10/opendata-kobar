import { OrganizationManagement } from "@/components/admin/OrganizationManagement";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminOrganizations() {
  return (
    <AdminLayout>
      <OrganizationManagement />
    </AdminLayout>
  );
}