import { AdminLayout } from "@/components/admin/AdminLayout";
import { PriorityDataTable } from "@/components/admin/PriorityDataTable";

export default function PriorityData() {
  return (
    <AdminLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Data Prioritas (Pusat)</h1>
        <PriorityDataTable />
      </div>
    </AdminLayout>
  );
}
