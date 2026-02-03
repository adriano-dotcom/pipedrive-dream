-- Fase 2: Remover índices GIN não utilizados (0 scans) para liberar espaço
DROP INDEX IF EXISTS idx_organizations_name_gin;
DROP INDEX IF EXISTS idx_organizations_cnpj_gin;

-- Fase 3: Restringir visualização de merge_backups ao autor ou admins
DROP POLICY IF EXISTS "Authenticated users can view merge backups" ON merge_backups;
CREATE POLICY "Users can view own merge backups or admins" ON merge_backups
  FOR SELECT TO authenticated
  USING (merged_by = auth.uid() OR has_role(auth.uid(), 'admin'));