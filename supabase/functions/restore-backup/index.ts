import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CURRENT_SCHEMA_VERSION = 1;

// Tables in order for deletion (reverse of insert order due to FK constraints)
const DELETE_ORDER = [
  'entity_links',
  'folder_acl',
  'donations',
  'donor_pledges',
  'donor_profiles',
  'donor_campaigns',
  'lms_progress',
  'lms_assignments',
  'lms_path_courses',
  'lms_course_lessons',
  'lms_learning_paths',
  'lms_lessons',
  'lms_courses',
  'coach_recommendations',
  'coaching_sessions',
  'coaching_engagements',
  'coach_organizations',
  'coach_profiles',
  'framework_health_scores',
  'framework_dashboard_sections',
  'framework_dashboards',
  'framework_playbooks',
  'framework_health_metrics',
  'framework_cadences',
  'framework_concepts',
  'company_frameworks',
  'wf_form_fields',
  'wf_forms',
  'wf_workflow_steps',
  'wf_workflows',
  'form_fields',
  'forms',
  'saved_views',
  'reports',
  'support_tickets',
  'kb_articles',
  'kb_categories',
  'sales_opportunities',
  'sales_pipeline_stages',
  'sales_campaigns',
  'sales_pipelines',
  'receipts',
  'payments',
  'invoices',
  'external_contacts',
  'crm_clients',
  'event_attendees',
  'events',
  'project_template_tasks',
  'project_template_phases',
  'project_templates',
  'templates',
  'project_members',
  'project_phases',
  'task_assignees',
  'tasks',
  'task_lists',
  'notes',
  'documents',
  'folders',
  'projects',
  'location_members',
  'locations',
  'group_members',
  'groups',
  'employees',
  'company_terminology',
  'company_capability_settings',
  'company_modules',
];

// Tables in order for insertion
const INSERT_ORDER = [...DELETE_ORDER].reverse();

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { backup_id, company_id } = await req.json();

    if (!backup_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "backup_id and company_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get backup record
    const { data: backupRecord, error: backupError } = await supabase
      .from("company_backups")
      .select("*")
      .eq("id", backup_id)
      .eq("company_id", company_id)
      .single();

    if (backupError || !backupRecord) {
      return new Response(
        JSON.stringify({ error: "Backup not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (backupRecord.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Backup is not in completed status" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("company-backups")
      .download(backupRecord.storage_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download backup file" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const backupContent = await fileData.text();
    const backup = JSON.parse(backupContent);

    // Check schema version compatibility
    if (backup.version > CURRENT_SCHEMA_VERSION) {
      return new Response(
        JSON.stringify({ 
          error: "Backup version is newer than current schema. Please update the application first.",
          backup_version: backup.version,
          current_version: CURRENT_SCHEMA_VERSION,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete existing data (in proper order to respect FK constraints)
    for (const tableName of DELETE_ORDER) {
      try {
        if (tableName === 'companies') {
          // Don't delete the company itself
          continue;
        }
        
        await supabase
          .from(tableName)
          .delete()
          .eq('company_id', company_id)
          .neq('is_sample', true); // Keep sample data if any (shouldn't be there)
      } catch (deleteError) {
        console.log(`Delete from ${tableName} skipped:`, deleteError);
      }
    }

    // Insert restored data
    const restoredCounts: Record<string, number> = {};
    
    for (const tableName of INSERT_ORDER) {
      const tableData = backup.tables[tableName];
      
      if (!tableData || tableData.length === 0) {
        continue;
      }

      try {
        // Filter out sample data if present in backup
        const filteredData = tableData.filter((row: Record<string, unknown>) => !row.is_sample);
        
        if (filteredData.length === 0) {
          continue;
        }

        // Remove auto-generated fields that might conflict
        const cleanedData = filteredData.map((row: Record<string, unknown>) => {
          const { ...rest } = row;
          return rest;
        });

        const { error: insertError } = await supabase
          .from(tableName)
          .upsert(cleanedData, { 
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (insertError) {
          console.log(`Insert into ${tableName} error:`, insertError);
        } else {
          restoredCounts[tableName] = cleanedData.length;
        }
      } catch (tableError) {
        console.log(`Restore ${tableName} skipped:`, tableError);
      }
    }

    // Update backup record with restore timestamp
    await supabase
      .from("company_backups")
      .update({
        restored_at: new Date().toISOString(),
      })
      .eq("id", backup_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup_id,
        restored_counts: restoredCounts,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Restore error:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});