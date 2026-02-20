import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../supabaseErrors';

describe('getErrorMessage', () => {
  it('retorna mensagem de sessão expirada para erros de JWT', () => {
    expect(getErrorMessage(new Error('JWT expired'))).toBe(
      'Sessão expirada. Faça login novamente.'
    );
    expect(getErrorMessage(new Error('Invalid token'))).toBe(
      'Sessão expirada. Faça login novamente.'
    );
  });

  it('retorna mensagem de permissão para erros de RLS/policy', () => {
    expect(getErrorMessage(new Error('permission denied for table'))).toBe(
      'Você não tem permissão para realizar esta ação.'
    );
    expect(getErrorMessage(new Error('new row violates row-level security policy'))).toBe(
      'Você não tem permissão para realizar esta ação.'
    );
  });

  it('retorna mensagem de não encontrado', () => {
    expect(getErrorMessage(new Error('not found'))).toBe(
      'Registro não encontrado. Pode ter sido excluído.'
    );
    expect(getErrorMessage(new Error('no rows returned'))).toBe(
      'Registro não encontrado. Pode ter sido excluído.'
    );
  });

  it('retorna mensagem de duplicata', () => {
    expect(getErrorMessage(new Error('duplicate key value violates unique constraint'))).toBe(
      'Registro duplicado. Já existe um item com esses dados.'
    );
  });

  it('retorna mensagem de foreign key', () => {
    expect(getErrorMessage(new Error('foreign key constraint'))).toBe(
      'Este registro está vinculado a outros dados e não pode ser alterado.'
    );
  });

  it('retorna mensagem de rede para erros de fetch', () => {
    expect(getErrorMessage(new Error('Failed to fetch'))).toBe(
      'Erro de conexão. Verifique sua internet e tente novamente.'
    );
    expect(getErrorMessage(new Error('Network error'))).toBe(
      'Erro de conexão. Verifique sua internet e tente novamente.'
    );
  });

  it('retorna mensagem de timeout', () => {
    expect(getErrorMessage(new Error('Request timeout'))).toBe(
      'A operação demorou demais. Tente novamente.'
    );
  });

  it('retorna a mensagem original para erros desconhecidos', () => {
    expect(getErrorMessage(new Error('algo inesperado'))).toBe('algo inesperado');
  });

  it('lida com null e undefined', () => {
    expect(getErrorMessage(null)).toBe('Erro desconhecido');
    expect(getErrorMessage(undefined)).toBe('Erro desconhecido');
  });

  it('lida com strings', () => {
    expect(getErrorMessage('Failed to fetch')).toBe(
      'Erro de conexão. Verifique sua internet e tente novamente.'
    );
  });
});
