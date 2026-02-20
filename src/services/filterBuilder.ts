import { supabase } from '@/integrations/supabase/client';

/**
 * Builder genérico de filtros para queries Supabase.
 * Centraliza a lógica de filtros que antes era duplicada entre fetchPeople,
 * fetchAllFilteredRecipients e handleSaveToCampaignAll.
 */

interface DateRange {
  from: Date | null;
  to: Date | null;
}

/**
 * Aplica filtro de busca textual (OR com ilike)
 */
export function applySearchFilter<T>(query: T & { or: Function }, search: string, fields: string[]): T {
  if (!search) return query;
  const conditions = fields.map(f => `${f}.ilike.%${search}%`).join(',');
  return query.or(conditions) as T;
}

/**
 * Aplica filtro IN se o array não estiver vazio
 */
export function applyInFilter<T>(query: T & { in: Function }, column: string, values: string[]): T {
  if (values.length === 0) return query;
  return query.in(column, values) as T;
}

/**
 * Aplica filtro de igualdade se o valor não for null
 */
export function applyEqFilter<T>(query: T & { eq: Function }, column: string, value: string | null): T {
  if (!value) return query;
  return query.eq(column, value) as T;
}

/**
 * Aplica filtro de range de datas (created_at)
 */
export function applyDateRangeFilter<T>(
  query: T & { gte: Function; lte: Function },
  column: string,
  dateRange: DateRange
): T {
  let q = query;
  if (dateRange.from) {
    q = q.gte(column, dateRange.from.toISOString()) as T;
  }
  if (dateRange.to) {
    const endOfDay = new Date(dateRange.to);
    endOfDay.setHours(23, 59, 59, 999);
    q = q.lte(column, endOfDay.toISOString()) as T;
  }
  return q;
}

/**
 * Aplica filtro boolean (has/not has) para campos nullable
 */
export function applyNullableFilter<T>(
  query: T & { not: Function; is: Function },
  column: string,
  value: boolean | null
): T {
  if (value === null) return query;
  if (value === true) {
    return query.not(column, 'is', null) as T;
  }
  return query.is(column, null) as T;
}

/**
 * Aplica filtro de tags usando IDs pré-resolvidos.
 * Retorna null se as tags foram selecionadas mas nenhum registro tem a tag (resultado vazio).
 */
export function applyTagFilter<T>(
  query: T & { in: Function },
  selectedTagIds: string[],
  taggedEntityIds: string[]
): T | null {
  if (selectedTagIds.length === 0) return query;
  if (taggedEntityIds.length === 0) return null; // Nenhum match
  return query.in('id', taggedEntityIds) as T;
}

/**
 * Busca IDs de organizações filtradas por cidade.
 * Usado pelo filtro de People quando filtra por cidade da organização.
 */
export async function fetchOrgIdsByCities(cities: string[]): Promise<string[] | null> {
  if (cities.length === 0) return null;

  const { data } = await supabase
    .from('organizations')
    .select('id')
    .in('address_city', cities);

  if (!data || data.length === 0) return [];
  return data.map(o => o.id);
}

/**
 * Aplica filtros comuns de People em uma query Supabase.
 * Usado por fetchPeople, fetchAllFilteredRecipients e handleSaveToCampaignAll.
 */
export interface PeopleFilterParams {
  search: string;
  labels: string[];
  leadSources: string[];
  jobTitles: string[];
  organizationId: string | null;
  cities: string[];
  ownerId: string | null;
  dateRange: DateRange;
  hasEmail: boolean | null;
  hasPhone: boolean | null;
  selectedTagIds: string[];
  taggedPersonIds: string[];
}

export async function applyPeopleFilters<T>(
  query: T & { or: Function; in: Function; eq: Function; gte: Function; lte: Function; not: Function; is: Function },
  params: PeopleFilterParams
): Promise<{ query: T; empty: boolean }> {
  let q = applySearchFilter(query, params.search, ['name', 'email', 'phone']);
  q = applyInFilter(q, 'label', params.labels);
  q = applyInFilter(q, 'lead_source', params.leadSources);
  q = applyInFilter(q, 'job_title', params.jobTitles);
  q = applyEqFilter(q, 'organization_id', params.organizationId);
  q = applyEqFilter(q, 'owner_id', params.ownerId);
  q = applyDateRangeFilter(q, 'created_at', params.dateRange);
  q = applyNullableFilter(q, 'email', params.hasEmail);
  q = applyNullableFilter(q, 'phone', params.hasPhone);

  // Filtro por cidade (via organização)
  if (params.cities.length > 0) {
    const orgIds = await fetchOrgIdsByCities(params.cities);
    if (!orgIds || orgIds.length === 0) return { query: q, empty: true };
    q = (q as any).in('organization_id', orgIds) as T;
  }

  // Filtro por tags
  const tagged = applyTagFilter(q, params.selectedTagIds, params.taggedPersonIds);
  if (tagged === null) return { query: q, empty: true };

  return { query: tagged, empty: false };
}
