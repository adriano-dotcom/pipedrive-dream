-- Create function to log deal field changes (value, person, organization)
CREATE OR REPLACE FUNCTION public.log_deal_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_person_name TEXT;
  new_person_name TEXT;
  old_org_name TEXT;
  new_org_name TEXT;
BEGIN
  -- Value change
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'value_change',
      'Valor alterado: R$ ' || COALESCE(OLD.value::text, '0') || ' → R$ ' || COALESCE(NEW.value::text, '0'),
      OLD.value::text,
      NEW.value::text,
      auth.uid()
    );
  END IF;

  -- Person change
  IF OLD.person_id IS DISTINCT FROM NEW.person_id THEN
    SELECT name INTO old_person_name FROM people WHERE id = OLD.person_id;
    SELECT name INTO new_person_name FROM people WHERE id = NEW.person_id;
    
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'person_change',
      CASE 
        WHEN NEW.person_id IS NULL THEN 'Pessoa de contato removida: ' || COALESCE(old_person_name, 'N/A')
        WHEN OLD.person_id IS NULL THEN 'Pessoa de contato adicionada: ' || COALESCE(new_person_name, 'N/A')
        ELSE 'Pessoa alterada: ' || COALESCE(old_person_name, 'N/A') || ' → ' || COALESCE(new_person_name, 'N/A')
      END,
      old_person_name,
      new_person_name,
      auth.uid()
    );
  END IF;

  -- Organization change
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    SELECT name INTO old_org_name FROM organizations WHERE id = OLD.organization_id;
    SELECT name INTO new_org_name FROM organizations WHERE id = NEW.organization_id;
    
    INSERT INTO deal_history (deal_id, event_type, description, old_value, new_value, created_by)
    VALUES (
      NEW.id,
      'organization_change',
      CASE 
        WHEN NEW.organization_id IS NULL THEN 'Organização removida: ' || COALESCE(old_org_name, 'N/A')
        WHEN OLD.organization_id IS NULL THEN 'Organização adicionada: ' || COALESCE(new_org_name, 'N/A')
        ELSE 'Organização alterada: ' || COALESCE(old_org_name, 'N/A') || ' → ' || COALESCE(new_org_name, 'N/A')
      END,
      old_org_name,
      new_org_name,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for field changes
CREATE TRIGGER deal_field_changes_trigger
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_field_changes();