import { supabase } from '@/integrations/supabase/client';
import { enrichWithProfiles } from './profileService';

const HISTORY_TABLES = {
  organization: { table: 'organization_history', fk: 'organization_id' },
  person: { table: 'people_history', fk: 'person_id' },
  deal: { table: 'deal_history', fk: 'deal_id' },
} as const;

type EntityType = keyof typeof HISTORY_TABLES;

export interface HistoryEntry {
  id: string;
  event_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  profile?: { user_id: string; full_name: string } | null;
}

export async function fetchHistory(
  entityType: EntityType,
  entityId: string,
  limit = 100
): Promise<HistoryEntry[]> {
  const config = HISTORY_TABLES[entityType];

  const { data, error } = await supabase
    .from(config.table as any)
    .select('*')
    .eq(config.fk, entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return enrichWithProfiles(data || []) as Promise<HistoryEntry[]>;
}

export async function addHistoryEntry(
  entityType: EntityType,
  entityId: string,
  entry: {
    event_type: string;
    description: string;
    old_value?: string | null;
    new_value?: string | null;
    metadata?: Record<string, unknown>;
    created_by?: string | null;
  }
): Promise<void> {
  const config = HISTORY_TABLES[entityType];

  const { error } = await supabase
    .from(config.table as any)
    .insert({
      [config.fk]: entityId,
      ...entry,
    });

  if (error) throw error;
}
