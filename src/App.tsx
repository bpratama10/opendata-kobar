import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DatasetList from "./pages/DatasetList";
import DatasetDetail from "./pages/DatasetDetail";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminDatasets from "./pages/admin/AdminDatasets";
import AdminDatasetAdd from "./pages/admin/AdminDatasetAdd";
import AdminDatasetEdit from "./pages/admin/AdminDatasetEdit";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminResources from "./pages/admin/AdminResources";
import AdminDistributions from "./pages/admin/AdminDistributions";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminTags from "./pages/admin/AdminTags";
import AdminThemes from "./pages/admin/AdminThemes";
import AdminClassifications from "./pages/admin/AdminClassifications";
import AdminLicenses from "./pages/admin/AdminLicenses";
import AdminFrequency from "./pages/admin/AdminFrequency";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminDataTables from "./pages/admin/AdminDataTables";
import PriorityData from "./pages/admin/PriorityData";
import AdminAPIKeys from "./pages/admin/AdminAPIKeys";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dataset-list" element={<DatasetList />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/datasets" element={<AdminDatasets />} />
          <Route path="/admin/datasets/add" element={<AdminDatasetAdd />} />
          <Route path="/admin/datasets/edit/:id" element={<AdminDatasetEdit />} />
          <Route path="/admin/datasets/:id/tables" element={<AdminDataTables />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/resources" element={<AdminResources />} />
          <Route path="/admin/distributions" element={<AdminDistributions />} />
          <Route path="/admin/organizations" element={<AdminOrganizations />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/tags" element={<AdminTags />} />
          <Route path="/admin/themes" element={<AdminThemes />} />
          <Route path="/admin/classifications" element={<AdminClassifications />} />
          <Route path="/admin/licenses" element={<AdminLicenses />} />
          <Route path="/admin/frequency" element={<AdminFrequency />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/api-keys" element={<AdminAPIKeys />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/priority-data" element={<PriorityData />} />
          <Route path="/dataset/:slug" element={<DatasetDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
