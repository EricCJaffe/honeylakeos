import { useActiveCompany } from "@/hooks/useActiveCompany";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Shield } from "lucide-react";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

export default function AuditLogPage() {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();

  if (membershipLoading) {
    return <div className="p-6" />;
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="No company selected"
          description="Please select a company to view audit logs."
        />
      </div>
    );
  }

  if (!isCompanyAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need to be a company admin to view audit logs."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track who changed what and when across your organization."
      />
      <AuditLogViewer />
    </div>
  );
}
