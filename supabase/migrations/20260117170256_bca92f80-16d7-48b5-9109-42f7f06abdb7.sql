-- ============================================================
-- Unified Folder System Enhancements
-- - Add cross-scope nesting prevention
-- - Change delete behavior to move children up
-- - Add audit trigger
-- ============================================================

-- 1. Update validate_folder_hierarchy to check cross-scope nesting
CREATE OR REPLACE FUNCTION public.validate_folder_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depth integer;
  v_ancestor_id uuid;
  v_parent_scope text;
BEGIN
  -- Skip if no parent
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check for cycle (folder cannot be its own ancestor)
  v_ancestor_id := NEW.parent_folder_id;
  WHILE v_ancestor_id IS NOT NULL LOOP
    IF v_ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Folder hierarchy cycle detected';
    END IF;
    SELECT parent_folder_id INTO v_ancestor_id FROM folders WHERE id = v_ancestor_id;
  END LOOP;
  
  -- Check max depth (5 levels)
  v_depth := get_folder_depth(NEW.parent_folder_id) + 1;
  IF v_depth > 5 THEN
    RAISE EXCEPTION 'Maximum folder nesting depth (5) exceeded';
  END IF;
  
  -- Ensure parent is in same company (for company folders)
  IF NEW.scope = 'company' THEN
    IF (SELECT company_id FROM folders WHERE id = NEW.parent_folder_id) != NEW.company_id THEN
      RAISE EXCEPTION 'Parent folder must be in the same company';
    END IF;
  END IF;
  
  -- CROSS-SCOPE NESTING PREVENTION: Parent must have same scope
  SELECT scope INTO v_parent_scope FROM folders WHERE id = NEW.parent_folder_id;
  IF v_parent_scope IS DISTINCT FROM NEW.scope THEN
    RAISE EXCEPTION 'Cannot nest personal folder in company folder or vice versa';
  END IF;
  
  -- For personal folders, parent must have same owner
  IF NEW.scope = 'personal' THEN
    IF (SELECT owner_user_id FROM folders WHERE id = NEW.parent_folder_id) != NEW.owner_user_id THEN
      RAISE EXCEPTION 'Personal folder parent must belong to same owner';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create function to handle folder deletion (move children up, unset docs/notes)
CREATE OR REPLACE FUNCTION public.handle_folder_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Move children to the parent of the deleted folder (or root if no parent)
  UPDATE folders
  SET parent_folder_id = OLD.parent_folder_id
  WHERE parent_folder_id = OLD.id;
  
  -- Unset folder_id on documents in this folder
  UPDATE documents
  SET folder_id = NULL
  WHERE folder_id = OLD.id;
  
  -- Unset folder_id on notes in this folder
  UPDATE notes
  SET folder_id = NULL
  WHERE folder_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- 3. Drop the CASCADE constraint and replace with RESTRICT + trigger
-- First remove the old foreign key
ALTER TABLE public.folders
DROP CONSTRAINT IF EXISTS folders_parent_folder_id_fkey;

-- Add new constraint with SET NULL (simpler than RESTRICT + trigger)
ALTER TABLE public.folders
ADD CONSTRAINT folders_parent_folder_id_fkey
FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE SET NULL;

-- 4. Create trigger for folder deletion (runs BEFORE delete to handle children and docs/notes)
DROP TRIGGER IF EXISTS handle_folder_delete_trigger ON public.folders;
CREATE TRIGGER handle_folder_delete_trigger
BEFORE DELETE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION handle_folder_delete();

-- 5. Add audit trigger for folders
CREATE OR REPLACE FUNCTION public.audit_folder_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'folder.created';
    v_company_id := NEW.company_id;
    INSERT INTO audit_logs (company_id, action, entity_type, entity_id, actor_user_id, metadata)
    VALUES (v_company_id, v_action, 'folder', NEW.id, auth.uid(), 
      jsonb_build_object('name', NEW.name, 'scope', NEW.scope, 'parent_folder_id', NEW.parent_folder_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'folder.updated';
    v_company_id := NEW.company_id;
    INSERT INTO audit_logs (company_id, action, entity_type, entity_id, actor_user_id, metadata)
    VALUES (v_company_id, v_action, 'folder', NEW.id, auth.uid(), 
      jsonb_build_object('name', NEW.name, 'old_name', OLD.name, 'parent_folder_id', NEW.parent_folder_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'folder.deleted';
    v_company_id := OLD.company_id;
    INSERT INTO audit_logs (company_id, action, entity_type, entity_id, actor_user_id, metadata)
    VALUES (v_company_id, v_action, 'folder', OLD.id, auth.uid(), 
      jsonb_build_object('name', OLD.name, 'scope', OLD.scope));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_folder_trigger ON public.folders;
CREATE TRIGGER audit_folder_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION audit_folder_changes();

-- 6. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_folders_owner_user_id ON public.folders(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON public.folders(parent_folder_id) WHERE parent_folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON public.notes(folder_id) WHERE folder_id IS NOT NULL;