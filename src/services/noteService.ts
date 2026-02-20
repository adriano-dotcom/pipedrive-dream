import { supabase } from '@/integrations/supabase/client';
import { enrichWithProfiles } from './profileService';

/**
 * Configuração por tipo de entidade para centralizar CRUD de notas.
 */
const NOTE_TABLES = {
  organization: { table: 'organization_notes', fk: 'organization_id', historyTable: 'organization_history' },
  person: { table: 'people_notes', fk: 'person_id', historyTable: 'people_history' },
  deal: { table: 'deal_notes', fk: 'deal_id', historyTable: 'deal_history' },
} as const;

type EntityType = keyof typeof NOTE_TABLES;

export interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  profile?: { user_id: string; full_name: string } | null;
}

export async function fetchNotes(entityType: EntityType, entityId: string): Promise<Note[]> {
  const config = NOTE_TABLES[entityType];

  const { data, error } = await supabase
    .from(config.table as any)
    .select('*')
    .eq(config.fk, entityId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const enriched = await enrichWithProfiles(data || []);
  return enriched.map(n => ({
    ...n,
    is_pinned: n.is_pinned ?? false,
  })) as Note[];
}

export async function createNote(
  entityType: EntityType,
  entityId: string,
  content: string,
  userId: string
): Promise<void> {
  const config = NOTE_TABLES[entityType];

  const { error } = await supabase
    .from(config.table as any)
    .insert({
      [config.fk]: entityId,
      content,
      created_by: userId,
    });

  if (error) throw error;

  // Log no histórico
  await supabase
    .from(config.historyTable as any)
    .insert({
      [config.fk]: entityId,
      event_type: 'note_added',
      description: 'Nova nota adicionada',
      created_by: userId,
    });
}

export async function updateNote(
  entityType: EntityType,
  noteId: string,
  content: string
): Promise<void> {
  const config = NOTE_TABLES[entityType];

  const { error } = await supabase
    .from(config.table as any)
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', noteId);

  if (error) throw error;
}

export async function deleteNote(entityType: EntityType, noteId: string): Promise<void> {
  const config = NOTE_TABLES[entityType];

  const { error } = await supabase
    .from(config.table as any)
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

export async function toggleNotePin(
  entityType: EntityType,
  noteId: string,
  currentlyPinned: boolean
): Promise<void> {
  const config = NOTE_TABLES[entityType];

  const { error } = await supabase
    .from(config.table as any)
    .update({ is_pinned: !currentlyPinned })
    .eq('id', noteId);

  if (error) throw error;
}
