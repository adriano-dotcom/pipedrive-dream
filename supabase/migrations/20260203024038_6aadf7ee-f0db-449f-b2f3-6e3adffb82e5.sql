-- Criar bucket para mídia do WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Usuários autenticados podem visualizar arquivos
CREATE POLICY "Auth users can read whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Policy: Service role pode fazer upload (webhook)
CREATE POLICY "Service role can upload whatsapp media"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'whatsapp-media');

-- Policy: Permitir leitura pública para exibição no chat
CREATE POLICY "Public can read whatsapp media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'whatsapp-media');