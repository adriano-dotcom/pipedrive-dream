-- Adicionar owner_id à tabela whatsapp_channels para vincular canal a um vendedor
ALTER TABLE public.whatsapp_channels 
ADD COLUMN owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index para performance em consultas por owner
CREATE INDEX idx_whatsapp_channels_owner_id ON public.whatsapp_channels(owner_id);