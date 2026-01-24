import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CURRENT_SCHEMA_VERSION = 1;

const TABLES_TO_BACKUP = [
  // Core
  'companies',
  'memberships',
  'employees',
  'groups',
  'group_members',
  'locations',
  'location_members',
  // Modules
  'company_modules',
  'company_capability_settings',
  'company_terminology',
  'company_frameworks',
  // Work
  'tasks',
  'task_lists',
  'task_assignees',
  'projects',
  'project_phases',
  'project_members',
  'notes',
  'documents',
  'events',
  'event_attendees',
  // CRM & Sales
  'crm_clients',
  'external_contacts',
  'sales_pipelines',
  'sales_pipeline_stages',
  'sales_opportunities',
  'sales_campaigns',
  // Finance
  'invoices',
  'payments',
  'receipts',
  // Donors
  'donor_profiles',
  'donor_campaigns',
  'donor_pledges',
  'donations',
  // LMS
  'lms_courses',
  'lms_lessons',
  'lms_course_lessons',
  'lms_learning_paths',
  'lms_path_courses',
  'lms_assignments',
  'lms_progress',
  // Forms & Workflows
  'forms',
  'form_fields',
  'wf_workflows',
  'wf_workflow_steps',
  'wf_forms',
  'wf_form_fields',
  // Frameworks
  'frameworks',
  'framework_concepts',
  'framework_cadences',
  'framework_health_metrics',
  'framework_health_scores',
  'framework_playbooks',
  'framework_dashboards',
  'framework_dashboard_sections',
  // Templates
  'templates',
  'project_templates',
  'project_template_phases',
  'project_template_tasks',
  // Coaching
  'coach_profiles',
  'coach_organizations',
  'coaching_engagements',
  'coaching_sessions',
  'coach_recommendations',
  // Support
  'kb_categories',
  'kb_articles',
  'support_tickets',
  // Folders & Links
  'folders',
  'folder_acl',
  'entity_links',
  // Reports
  'reports',
  'saved_views',
];

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

    // Update backup status to in_progress
    await supabase
      .from("company_backups")
      .update({ status: "in_progress" })
      .eq("id", backup_id);

    const backupData: Record<string, unknown[]> = {};
    const metadata: Record<string, number> = {};
    let totalRecords = 0;

    // Export each table
    for (const tableName of TABLES_TO_BACKUP) {
      try {
        let query = supabase.from(tableName).select("*");
        
        // Filter by company_id if table has that column
        // Some tables might not have company_id directly
        if (['companies'].includes(tableName)) {
          query = query.eq('id', company_id);
        } else if (['memberships', 'employees', 'groups', 'locations', 'tasks', 'projects', 
                    'notes', 'documents', 'events', 'crm_clients', 'external_contacts',
                    'sales_pipelines', 'invoices', 'payments', 'receipts', 'donor_profiles',
                    'donor_campaigns', 'donations', 'donor_pledges', 'lms_courses', 'lms_lessons',
                    'lms_learning_paths', 'lms_assignments', 'forms', 'wf_workflows', 'wf_forms',
                    'frameworks', 'templates', 'project_templates', 'coach_profiles',
                    'coach_organizations', 'coaching_engagements', 'coaching_sessions',
                    'kb_categories', 'kb_articles', 'support_tickets', 'folders', 'entity_links',
                    'reports', 'saved_views', 'company_modules', 'company_capability_settings',
                    'company_terminology', 'company_frameworks', 'task_lists', 'sales_campaigns',
                    'framework_health_scores'].includes(tableName)) {
          query = query.eq('company_id', company_id);
        }

        // Exclude sample data
        const { data, error } = await query.eq('is_sample', false).limit(10000);
        
        if (error) {
          // Try without is_sample filter (table might not have that column)
          const { data: dataNoFilter, error: errorNoFilter } = await supabase
            .from(tableName)
            .select("*")
            .eq('company_id', company_id)
            .limit(10000);
          
          if (!errorNoFilter && dataNoFilter) {
            backupData[tableName] = dataNoFilter;
            metadata[tableName] = dataNoFilter.length;
            totalRecords += dataNoFilter.length;
          }
        } else if (data) {
          backupData[tableName] = data;
          metadata[tableName] = data.length;
          totalRecords += data.length;
        }
      } catch (tableError) {
        console.log(`Skipping table ${tableName}:`, tableError);
      }
    }

    // Create backup JSON
    const backup = {
      version: CURRENT_SCHEMA_VERSION,
      company_id,
      created_at: new Date().toISOString(),
      tables: backupData,
    };

    const backupJson = JSON.stringify(backup);
    const fileSizeBytes = new Blob([backupJson]).size;

    // Upload to storage
    const storagePath = `${company_id}/${backup_id}.json`;
    const { error: uploadError } = await supabase.storage
      .from("company-backups")
      .upload(storagePath, backupJson, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update backup record
    await supabase
      .from("company_backups")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        storage_path: storagePath,
        file_size_bytes: fileSizeBytes,
        metadata_json: {
          tables: metadata,
          total_records: totalRecords,
          schema_version: CURRENT_SCHEMA_VERSION,
        },
      })
      .eq("id", backup_id);

    return new Response(
      JSON.stringify({ success: true, backup_id, total_records: totalRecords }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Backup error:", error);

    // Try to update backup status to failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { backup_id } = await req.json();
      
      if (backup_id) {
        await supabase
          .from("company_backups")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", backup_id);
      }
    } catch {
      // Ignore update error
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});