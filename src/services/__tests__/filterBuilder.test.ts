import { describe, it, expect, vi } from 'vitest';
import {
  applySearchFilter,
  applyInFilter,
  applyEqFilter,
  applyDateRangeFilter,
  applyNullableFilter,
  applyTagFilter,
} from '../filterBuilder';

// Mock query builder que rastreia chamadas
function createMockQuery() {
  const calls: { method: string; args: any[] }[] = [];

  const query: any = {
    or: vi.fn((...args: any[]) => { calls.push({ method: 'or', args }); return query; }),
    in: vi.fn((...args: any[]) => { calls.push({ method: 'in', args }); return query; }),
    eq: vi.fn((...args: any[]) => { calls.push({ method: 'eq', args }); return query; }),
    gte: vi.fn((...args: any[]) => { calls.push({ method: 'gte', args }); return query; }),
    lte: vi.fn((...args: any[]) => { calls.push({ method: 'lte', args }); return query; }),
    not: vi.fn((...args: any[]) => { calls.push({ method: 'not', args }); return query; }),
    is: vi.fn((...args: any[]) => { calls.push({ method: 'is', args }); return query; }),
    _calls: calls,
  };

  return query;
}

describe('applySearchFilter', () => {
  it('não aplica filtro quando search está vazio', () => {
    const query = createMockQuery();
    const result = applySearchFilter(query, '', ['name', 'email']);
    expect(result).toBe(query);
    expect(query.or).not.toHaveBeenCalled();
  });

  it('aplica filtro OR com ilike para múltiplos campos', () => {
    const query = createMockQuery();
    applySearchFilter(query, 'teste', ['name', 'email', 'phone']);
    expect(query.or).toHaveBeenCalledWith(
      'name.ilike.%teste%,email.ilike.%teste%,phone.ilike.%teste%'
    );
  });
});

describe('applyInFilter', () => {
  it('não aplica filtro quando array está vazio', () => {
    const query = createMockQuery();
    const result = applyInFilter(query, 'label', []);
    expect(result).toBe(query);
    expect(query.in).not.toHaveBeenCalled();
  });

  it('aplica filtro IN quando array tem valores', () => {
    const query = createMockQuery();
    applyInFilter(query, 'label', ['Quente', 'Frio']);
    expect(query.in).toHaveBeenCalledWith('label', ['Quente', 'Frio']);
  });
});

describe('applyEqFilter', () => {
  it('não aplica filtro quando valor é null', () => {
    const query = createMockQuery();
    const result = applyEqFilter(query, 'owner_id', null);
    expect(result).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
  });

  it('aplica filtro eq quando valor existe', () => {
    const query = createMockQuery();
    applyEqFilter(query, 'owner_id', 'user-123');
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'user-123');
  });
});

describe('applyDateRangeFilter', () => {
  it('não aplica filtro quando ambas datas são null', () => {
    const query = createMockQuery();
    const result = applyDateRangeFilter(query, 'created_at', { from: null, to: null });
    expect(result).toBe(query);
    expect(query.gte).not.toHaveBeenCalled();
    expect(query.lte).not.toHaveBeenCalled();
  });

  it('aplica gte quando from está definido', () => {
    const query = createMockQuery();
    const from = new Date('2025-01-01');
    applyDateRangeFilter(query, 'created_at', { from, to: null });
    expect(query.gte).toHaveBeenCalledWith('created_at', from.toISOString());
    expect(query.lte).not.toHaveBeenCalled();
  });

  it('aplica lte com fim do dia quando to está definido', () => {
    const query = createMockQuery();
    const to = new Date('2025-12-31');
    applyDateRangeFilter(query, 'created_at', { from: null, to });
    expect(query.lte).toHaveBeenCalled();
    expect(query.gte).not.toHaveBeenCalled();
  });

  it('aplica ambos filtros quando ambas datas existem', () => {
    const query = createMockQuery();
    const from = new Date('2025-01-01');
    const to = new Date('2025-12-31');
    applyDateRangeFilter(query, 'created_at', { from, to });
    expect(query.gte).toHaveBeenCalled();
    expect(query.lte).toHaveBeenCalled();
  });
});

describe('applyNullableFilter', () => {
  it('não aplica filtro quando valor é null', () => {
    const query = createMockQuery();
    const result = applyNullableFilter(query, 'email', null);
    expect(result).toBe(query);
    expect(query.not).not.toHaveBeenCalled();
    expect(query.is).not.toHaveBeenCalled();
  });

  it('aplica NOT IS NULL quando valor é true', () => {
    const query = createMockQuery();
    applyNullableFilter(query, 'email', true);
    expect(query.not).toHaveBeenCalledWith('email', 'is', null);
  });

  it('aplica IS NULL quando valor é false', () => {
    const query = createMockQuery();
    applyNullableFilter(query, 'email', false);
    expect(query.is).toHaveBeenCalledWith('email', null);
  });
});

describe('applyTagFilter', () => {
  it('retorna query sem alteração quando nenhuma tag selecionada', () => {
    const query = createMockQuery();
    const result = applyTagFilter(query, [], []);
    expect(result).toBe(query);
  });

  it('retorna null quando tags selecionadas mas nenhum match', () => {
    const query = createMockQuery();
    const result = applyTagFilter(query, ['tag-1'], []);
    expect(result).toBeNull();
  });

  it('aplica filtro IN quando tags e IDs existem', () => {
    const query = createMockQuery();
    applyTagFilter(query, ['tag-1'], ['entity-1', 'entity-2']);
    expect(query.in).toHaveBeenCalledWith('id', ['entity-1', 'entity-2']);
  });
});
