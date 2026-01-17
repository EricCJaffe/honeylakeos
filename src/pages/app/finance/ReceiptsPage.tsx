import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, FileCheck } from "lucide-react";

export default function ReceiptsPage() {
  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Receipts"
        description="Generate and manage receipts for donations and payments"
      >
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Generate Receipt
        </Button>
      </PageHeader>

      <EmptyState
        icon={FileCheck}
        title="Receipt Management Coming Soon"
        description="Receipt generation and management will be available in a future update. Create tax-deductible receipts for donors and payment confirmations."
      />
    </div>
  );
}
