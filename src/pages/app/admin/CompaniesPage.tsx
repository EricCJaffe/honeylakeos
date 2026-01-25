import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Construction } from "lucide-react";

export default function CompaniesPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Companies"
        description="Manage all companies across sites"
      />

      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Coming Soon</CardTitle>
          <CardDescription>
            Company management functionality is under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>You'll be able to create, edit, and manage companies across all sites here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
