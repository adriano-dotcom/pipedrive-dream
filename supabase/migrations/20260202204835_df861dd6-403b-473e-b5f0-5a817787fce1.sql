-- ENUMs para WhatsApp
CREATE TYPE whatsapp_conversation_status AS ENUM ('pending', 'in_progress', 'resolved', 'archived');
CREATE TYPE whatsapp_message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE whatsapp_message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker');

-- Tabela de canais WhatsApp (contas conectadas)
CREATE TABLE whatsapp_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timelines_channel_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de conversas WhatsApp
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timelines_conversation_id TEXT UNIQUE,
  channel_id UUID REFERENCES whatsapp_channels(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  status whatsapp_conversation_status DEFAULT 'pending',
  assigned_to UUID,
  priority INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timelines_message_id TEXT UNIQUE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contact', 'agent', 'system')),
  sender_id UUID,
  content TEXT,
  message_type whatsapp_message_type DEFAULT 'text',
  status whatsapp_message_status DEFAULT 'sent',
  media_url TEXT,
  media_mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de análise de conversas (IA)
CREATE TABLE whatsapp_conversation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 10),
  response_quality INTEGER NOT NULL CHECK (response_quality >= 0 AND response_quality <= 10),
  tone_score INTEGER NOT NULL CHECK (tone_score >= 0 AND tone_score <= 10),
  resolution_effectiveness INTEGER NOT NULL CHECK (resolution_effectiveness >= 0 AND resolution_effectiveness <= 10),
  professionalism INTEGER NOT NULL CHECK (professionalism >= 0 AND professionalism <= 10),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  summary TEXT,
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  message_count INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_conversations_person_id ON whatsapp_conversations(person_id);
CREATE INDEX idx_whatsapp_conversations_channel_id ON whatsapp_conversations(channel_id);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- Habilitar RLS
ALTER TABLE whatsapp_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_channels
CREATE POLICY "Authenticated users can view channels" ON whatsapp_channels FOR SELECT USING (true);
CREATE POLICY "Only admins can insert channels" ON whatsapp_channels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update channels" ON whatsapp_channels FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete channels" ON whatsapp_channels FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para whatsapp_conversations
CREATE POLICY "Authenticated users can view conversations" ON whatsapp_conversations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert conversations" ON whatsapp_conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update conversations" ON whatsapp_conversations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can delete conversations" ON whatsapp_conversations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para whatsapp_messages
CREATE POLICY "Authenticated users can view messages" ON whatsapp_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert messages" ON whatsapp_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can delete messages" ON whatsapp_messages FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para whatsapp_conversation_analysis
CREATE POLICY "Authenticated users can view analysis" ON whatsapp_conversation_analysis FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert analysis" ON whatsapp_conversation_analysis FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update analysis" ON whatsapp_conversation_analysis FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_channels_updated_at
  BEFORE UPDATE ON whatsapp_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();