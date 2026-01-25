import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CreditCard, FileCheck, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function FinancePage() {
  const modules = [
    {
      title: "Invoices",
      description: "Create and manage invoices for clients",
      icon: Receipt,
      href: "/app/finance/invoices",
      color: "text-blue-500",
    },
    {
      title: "Payments",
      description: "Track incoming payments and transactions",
      icon: CreditCard,
      href: "/app/finance/payments",
      color: "text-green-500",
    },
    {
      title: "Receipts",
      description: "Generate and manage receipts for donations",
      icon: FileCheck,
      href: "/app/finance/receipts",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title="Finance"
        description="Manage invoices, payments, and receipts"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.href} to={module.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <module.icon className={`h-8 w-8 ${module.color}`} />
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
            <CardTitle>Quick Stats</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Finance dashboard with summary statistics coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
