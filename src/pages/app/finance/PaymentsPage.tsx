import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Payments"
        description="Track incoming payments and transactions"
      >
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </PageHeader>

      <EmptyState
        icon={CreditCard}
        title="Payment Tracking Coming Soon"
        description="Payment recording and tracking will be available in a future update. Link payments to invoices and donations, and track all financial transactions."
      />
    </div>
  );
}
