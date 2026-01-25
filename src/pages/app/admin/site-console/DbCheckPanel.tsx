import * as React from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembership } from "@/lib/membership";
import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QueryResult {
  data: any[] | null;
  error: string | null;
  columns: string[];
}

export default function DbCheckPanel() {
  const { activeCompanyId } = useMembership();
  const [folders, setFolders] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [notes, setNotes] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [documents, setDocuments] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [entityAcl, setEntityAcl] = useState<QueryResult>({ data: null, error: null, columns: [] });
  const [schemaInfo, setSchemaInfo] = useState<any[] | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

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

      // 2. Query notes
      const notesRes = await supabase.from("notes").select("*").limit(3);
      const notesColumns = notesRes.data?.[0] ? Object.keys(notesRes.data[0]) : [];
      setNotes({
        data: notesRes.data,
        error: notesRes.error?.message || null,
        columns: notesColumns,
      });

      // 3. Query documents
      const docsRes = await supabase.from("documents").select("*").limit(3);
      const docsColumns = docsRes.data?.[0] ? Object.keys(docsRes.data[0]) : [];
      setDocuments({
        data: docsRes.data,
        error: docsRes.error?.message || null,
        columns: docsColumns,
      });

      // 4. Query entity_acl
      const aclRes = await supabase.from("entity_acl").select("*").limit(3);
      const aclColumns = aclRes.data?.[0] ? Object.keys(aclRes.data[0]) : [];
      setEntityAcl({
        data: aclRes.data,
        error: aclRes.error?.message || null,
        columns: aclColumns,
      });

      // 5. Schema info via RPC
      const schemaRes = await supabase.rpc("get_table_columns");
      if (schemaRes.error) {
        setSchemaError(schemaRes.error.message);
        setSchemaInfo(null);
      } else {
        setSchemaInfo(schemaRes.data);
        setSchemaError(null);
      }
    }

    runChecks();
  }, [activeCompanyId]);

  const renderResult = (title: string, result: QueryResult) => (
    <div className="p-4 border rounded-lg">
      <h4 className="font-medium text-sm mb-2">{title}</h4>
      {result.error ? (
        <p className="text-destructive text-sm">Error: {result.error}</p>
      ) : (
        <>
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">Columns ({result.columns.length}):</span>
            <code className="ml-2 text-xs bg-muted p-1 rounded">
              {result.columns.join(", ") || "(no data)"}
            </code>
          </div>
          <div className="text-xs text-muted-foreground">
            Row count: {result.data?.length ?? 0}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Check
          <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
            DEV
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Runtime database table checks. See browser console for detailed logs.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          {renderResult("folders", folders)}
          {renderResult("notes", notes)}
          {renderResult("documents", documents)}
          {renderResult("entity_acl", entityAcl)}
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-sm mb-2">Schema Info (get_table_columns RPC)</h4>
          {schemaError ? (
            <p className="text-destructive text-sm">Error: {schemaError}</p>
          ) : schemaInfo ? (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(schemaInfo.slice(0, 10), null, 2)}
              {schemaInfo.length > 10 && `\n... and ${schemaInfo.length - 10} more`}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">Loading...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
