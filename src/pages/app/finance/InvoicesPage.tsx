import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Invoices"
        description="Create and manage invoices for clients"
      >
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </PageHeader>

      <EmptyState
        icon={Receipt}
        title="Invoicing Coming Soon"
        description="Invoice creation and management will be available in a future update. Track payments, send professional invoices, and manage accounts receivable."
      />
    </div>
  );
}
