-- =====================================================
-- FASE 1: CORRIGIR POLICIES RLS - SELECT COM AUTHENTICATED
-- =====================================================
-- Alterar policies de SELECT de role 'public' para 'authenticated'
-- Isso impede acesso nao autenticado a dados sensiveis

-- 1. activities
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON activities;
CREATE POLICY "Authenticated users can view all activities" 
  ON activities FOR SELECT 
  TO authenticated
  USING (true);

-- 2. deal_files
DROP POLICY IF EXISTS "Authenticated users can view deal files" ON deal_files;
CREATE POLICY "Authenticated users can view deal files" 
  ON deal_files FOR SELECT 
  TO authenticated
  USING (true);

-- 3. deal_history
DROP POLICY IF EXISTS "Authenticated users can view deal history" ON deal_history;
CREATE POLICY "Authenticated users can view deal history" 
  ON deal_history FOR SELECT 
  TO authenticated
  USING (true);

-- 4. deal_notes
DROP POLICY IF EXISTS "Authenticated users can view deal notes" ON deal_notes;
CREATE POLICY "Authenticated users can view deal notes" 
  ON deal_notes FOR SELECT 
  TO authenticated
  USING (true);

-- 5. deal_tag_assignments
DROP POLICY IF EXISTS "Users can view all deal tag assignments" ON deal_tag_assignments;
CREATE POLICY "Authenticated users can view deal tag assignments" 
  ON deal_tag_assignments FOR SELECT 
  TO authenticated
  USING (true);

-- 6. deal_tags
DROP POLICY IF EXISTS "Users can view all deal tags" ON deal_tags;
CREATE POLICY "Authenticated users can view deal tags" 
  ON deal_tags FOR SELECT 
  TO authenticated
  USING (true);

-- 7. deals
DROP POLICY IF EXISTS "Authenticated users can view all deals" ON deals;
CREATE POLICY "Authenticated users can view all deals" 
  ON deals FOR SELECT 
  TO authenticated
  USING (true);

-- 8. merge_backups
DROP POLICY IF EXISTS "Users can view merge backups" ON merge_backups;
CREATE POLICY "Authenticated users can view merge backups" 
  ON merge_backups FOR SELECT 
  TO authenticated
  USING (true);

-- 9. organization_files
DROP POLICY IF EXISTS "Authenticated users can view organization files" ON organization_files;
CREATE POLICY "Authenticated users can view organization files" 
  ON organization_files FOR SELECT 
  TO authenticated
  USING (true);

-- 10. organization_history
DROP POLICY IF EXISTS "Authenticated users can view organization history" ON organization_history;
CREATE POLICY "Authenticated users can view organization history" 
  ON organization_history FOR SELECT 
  TO authenticated
  USING (true);

-- 11. organization_notes
DROP POLICY IF EXISTS "Authenticated users can view organization notes" ON organization_notes;
CREATE POLICY "Authenticated users can view organization notes" 
  ON organization_notes FOR SELECT 
  TO authenticated
  USING (true);

-- 12. organization_partners
DROP POLICY IF EXISTS "Authenticated users can view organization partners" ON organization_partners;
CREATE POLICY "Authenticated users can view organization partners" 
  ON organization_partners FOR SELECT 
  TO authenticated
  USING (true);

-- 13. organization_tag_assignments
DROP POLICY IF EXISTS "Users can view all organization tag assignments" ON organization_tag_assignments;
CREATE POLICY "Authenticated users can view organization tag assignments" 
  ON organization_tag_assignments FOR SELECT 
  TO authenticated
  USING (true);

-- 14. organization_tags
DROP POLICY IF EXISTS "Users can view all organization tags" ON organization_tags;
CREATE POLICY "Authenticated users can view organization tags" 
  ON organization_tags FOR SELECT 
  TO authenticated
  USING (true);

-- 15. organizations
DROP POLICY IF EXISTS "Authenticated users can view all organizations" ON organizations;
CREATE POLICY "Authenticated users can view all organizations" 
  ON organizations FOR SELECT 
  TO authenticated
  USING (true);

-- 16. people
DROP POLICY IF EXISTS "Authenticated users can view all people" ON people;
CREATE POLICY "Authenticated users can view all people" 
  ON people FOR SELECT 
  TO authenticated
  USING (true);

-- 17. people_files
DROP POLICY IF EXISTS "Authenticated users can view people files" ON people_files;
CREATE POLICY "Authenticated users can view people files" 
  ON people_files FOR SELECT 
  TO authenticated
  USING (true);

-- 18. people_history
DROP POLICY IF EXISTS "Authenticated users can view people history" ON people_history;
CREATE POLICY "Authenticated users can view people history" 
  ON people_history FOR SELECT 
  TO authenticated
  USING (true);

-- 19. people_notes
DROP POLICY IF EXISTS "Authenticated users can view people notes" ON people_notes;
CREATE POLICY "Authenticated users can view people notes" 
  ON people_notes FOR SELECT 
  TO authenticated
  USING (true);

-- 20. person_tag_assignments
DROP POLICY IF EXISTS "Users can view all tag assignments" ON person_tag_assignments;
CREATE POLICY "Authenticated users can view tag assignments" 
  ON person_tag_assignments FOR SELECT 
  TO authenticated
  USING (true);

-- 21. person_tags
DROP POLICY IF EXISTS "Users can view all tags" ON person_tags;
CREATE POLICY "Authenticated users can view tags" 
  ON person_tags FOR SELECT 
  TO authenticated
  USING (true);

-- 22. pipelines
DROP POLICY IF EXISTS "Authenticated users can view all pipelines" ON pipelines;
CREATE POLICY "Authenticated users can view all pipelines" 
  ON pipelines FOR SELECT 
  TO authenticated
  USING (true);

-- 23. profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" 
  ON profiles FOR SELECT 
  TO authenticated
  USING (true);

-- 24. sent_emails
DROP POLICY IF EXISTS "Users can view all sent emails" ON sent_emails;
CREATE POLICY "Authenticated users can view sent emails" 
  ON sent_emails FOR SELECT 
  TO authenticated
  USING (true);

-- 25. stages
DROP POLICY IF EXISTS "Authenticated users can view all stages" ON stages;
CREATE POLICY "Authenticated users can view all stages" 
  ON stages FOR SELECT 
  TO authenticated
  USING (true);

-- 26. user_roles
DROP POLICY IF EXISTS "All authenticated users can view roles" ON user_roles;
CREATE POLICY "Authenticated users can view roles" 
  ON user_roles FOR SELECT 
  TO authenticated
  USING (true);

-- 27. whatsapp_channels
DROP POLICY IF EXISTS "Authenticated users can view channels" ON whatsapp_channels;
CREATE POLICY "Authenticated users can view channels" 
  ON whatsapp_channels FOR SELECT 
  TO authenticated
  USING (true);

-- 28. whatsapp_conversation_analysis
DROP POLICY IF EXISTS "Authenticated users can view analysis" ON whatsapp_conversation_analysis;
CREATE POLICY "Authenticated users can view analysis" 
  ON whatsapp_conversation_analysis FOR SELECT 
  TO authenticated
  USING (true);

-- 29. whatsapp_conversations
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON whatsapp_conversations;
CREATE POLICY "Authenticated users can view conversations" 
  ON whatsapp_conversations FOR SELECT 
  TO authenticated
  USING (true);

-- 30. whatsapp_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON whatsapp_messages;
CREATE POLICY "Authenticated users can view messages" 
  ON whatsapp_messages FOR SELECT 
  TO authenticated
  USING (true);