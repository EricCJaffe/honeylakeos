import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MembersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Team Members</h1>
        <p className="text-muted-foreground">Manage users and their access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Team member management will be available here. You'll be able to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Invite new team members</li>
            <li>• Manage user roles and permissions</li>
            <li>• View and manage active memberships</li>
            <li>• Set up external user access</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
