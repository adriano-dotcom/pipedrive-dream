const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}. ` +
      'Verifique o arquivo .env na raiz do projeto.'
    );
  }
}

validateEnv();

export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined,
} as const;
