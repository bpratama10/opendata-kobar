import { UserManagement } from "@/components/admin/UserManagement";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminUsers() {
  return (
    <AdminLayout>
      <UserManagement />
    </AdminLayout>
  );
}