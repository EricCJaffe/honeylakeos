import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembership } from "@/lib/membership";

interface QueryResult {
  data: any[] | null;
  error: string | null;
  columns: string[];
}

export default function DbCheckPage() {
  const { activeCompanyId } = useMembership();
  const [folders, setFolders] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [notes, setNotes] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [documents, setDocuments] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [entityAcl, setEntityAcl] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [schemaInfo, setSchemaInfo] = useState<string | null>(null);
  const [companyMembers, setCompanyMembers] = useState<QueryResult>({ data: null, error: null, columns: [] });

  useEffect(() => {
    async function runChecks() {
      // 1. Query folders
      const foldersRes = await supabase.from("folders").select("*").limit(3);
      const foldersColumns = foldersRes.data?.[0] ? Object.keys(foldersRes.data[0]) : [];
      setFolders({
        data: foldersRes.data,
        error: foldersRes.error?.message || null,
        columns: foldersColumns,
      });
      console.log("📂 folders result:", foldersRes.data);
      console.log("📂 folders columns:", foldersColumns);

      // 2. Query notes
      const notesRes = await supabase.from("notes").select("*").limit(3);
      const notesColumns = notesRes.data?.[0] ? Object.keys(notesRes.data[0]) : [];
      setNotes({
        data: notesRes.data,
        error: notesRes.error?.message || null,
        columns: notesColumns,
      });
      console.log("📝 notes result:", notesRes.data);
      console.log("📝 notes columns:", notesColumns);

      // 3. Query documents
      const docsRes = await supabase.from("documents").select("*").limit(3);
      const docsColumns = docsRes.data?.[0] ? Object.keys(docsRes.data[0]) : [];
      setDocuments({
        data: docsRes.data,
        error: docsRes.error?.message || null,
        columns: docsColumns,
      });
      console.log("📄 documents result:", docsRes.data);
      console.log("📄 documents columns:", docsColumns);

      // 4. Query entity_acl
      const aclRes = await supabase.from("entity_acl").select("*").limit(3);
      const aclColumns = aclRes.data?.[0] ? Object.keys(aclRes.data[0]) : [];
      setEntityAcl({
        data: aclRes.data,
        error: aclRes.error?.message || null,
        columns: aclColumns,
      });
      console.log("🔐 entity_acl result:", aclRes.data);
      console.log("🔐 entity_acl columns:", aclColumns);

      // 5. Schema info - we can't query information_schema directly via supabase-js
      // So we just note what we see from the actual queries
      setSchemaInfo("Schema info unavailable via client. Check console logs for actual column shapes.");

      // 6. ShareDialog companyMembers query simulation
      if (activeCompanyId) {
        const membersRes = await supabase
          .from("memberships")
          .select("user_id")
          .eq("company_id", activeCompanyId)
          .eq("status", "active");
        
        console.log("👥 ShareDialog memberships query result:", membersRes.data);
        
        if (membersRes.data && membersRes.data.length > 0) {
          const userIds = membersRes.data.map((m) => m.user_id);
          const profilesRes = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);
          
          console.log("👤 ShareDialog profiles query result:", profilesRes.data);
          const profilesColumns = profilesRes.data?.[0] ? Object.keys(profilesRes.data[0]) : [];
          setCompanyMembers({
            data: profilesRes.data,
            error: profilesRes.error?.message || null,
            columns: profilesColumns,
          });
        }
      }

      // 7. ACL entries enrichment simulation
      const aclEnrichTest = await supabase.from("entity_acl").select("*").limit(1);
      if (aclEnrichTest.data && aclEnrichTest.data.length > 0) {
        const entry = aclEnrichTest.data[0];
        console.log("🔍 ACL entry shape for enrichment:", entry);
        console.log("🔍 ACL entry keys:", Object.keys(entry));
        console.log("🔍 Expected keys: entity_type, entity_id, grantee_type, grantee_id, permission, granted_by, id, created_at");
      }
    }

    runChecks();
  }, [activeCompanyId]);

  const renderResult = (title: string, result: QueryResult) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {result.error ? (
          <p className="text-destructive">Error: {result.error}</p>
        ) : (
          <>
            <div className="mb-2">
              <strong>Columns ({result.columns.length}):</strong>
              <code className="ml-2 text-xs bg-muted p-1 rounded">
                {result.columns.join(", ") || "(no data)"}
              </code>
            </div>
            <div className="text-sm">
              <strong>Row count:</strong> {result.data?.length ?? 0}
            </div>
            {result.data && result.data.length > 0 && (
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Database Runtime Check</h1>
      <p className="text-muted-foreground mb-6">
        This page queries actual database tables and displays their runtime shapes.
        Check the browser console for detailed logs.
      </p>

      {renderResult("folders", folders)}
      {renderResult("notes", notes)}
      {renderResult("documents", documents)}
      {renderResult("entity_acl", entityAcl)}
      {renderResult("companyMembers (profiles)", companyMembers)}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Expected UI Column Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <strong>folders:</strong> id, name, company_id, parent_folder_id, access_level, created_by, created_at
          </div>
          <div>
            <strong>notes:</strong> id, title, content, company_id, folder_id, access_level, is_pinned, tags, color, created_by, created_at, updated_at
          </div>
          <div>
            <strong>documents:</strong> id, name, description, file_path, mime_type, file_size, company_id, folder_id, access_level, tags, created_by, created_at, updated_at
          </div>
          <div>
            <strong>entity_acl:</strong> id, entity_type, entity_id, grantee_type, grantee_id, permission, granted_by, created_at
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schema Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{schemaInfo}</p>
        </CardContent>
      </Card>
    </div>
  );
}
