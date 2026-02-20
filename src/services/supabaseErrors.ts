/**
 * Interpreta erros do Supabase e retorna mensagens amigáveis em português.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido';

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('jwt') || lower.includes('token')) {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (lower.includes('permission') || lower.includes('policy') || lower.includes('rls')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  if (lower.includes('not found') || lower.includes('no rows')) {
    return 'Registro não encontrado. Pode ter sido excluído.';
  }
  if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('already exists')) {
    return 'Registro duplicado. Já existe um item com esses dados.';
  }
  if (lower.includes('foreign key') || lower.includes('fkey')) {
    return 'Este registro está vinculado a outros dados e não pode ser alterado.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  if (lower.includes('timeout')) {
    return 'A operação demorou demais. Tente novamente.';
  }

  return message;
}
