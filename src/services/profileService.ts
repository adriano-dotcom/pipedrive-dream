import { supabase } from '@/integrations/supabase/client';

export interface ProfileSummary {
  user_id: string;
  full_name: string;
}

/**
 * Busca profiles de criadores por IDs e retorna um Map para lookup rápido.
 * Reutilizado por org/people/deal details para resolver nomes em histórico e notas.
 */
export async function fetchProfileMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) return new Map();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);

  return new Map(profiles?.map(p => [p.user_id, p]) || []);
}

/**
 * Dado um array de registros com created_by, enriquece com profile.
 */
export async function enrichWithProfiles<T extends { created_by: string | null }>(
  records: T[]
): Promise<(T & { profile?: ProfileSummary | null })[]> {
  const creatorIds = [...new Set(records.map(r => r.created_by).filter(Boolean))] as string[];
  const profileMap = await fetchProfileMap(creatorIds);

  return records.map(r => ({
    ...r,
    profile: r.created_by ? profileMap.get(r.created_by) ?? null : null,
  }));
}
