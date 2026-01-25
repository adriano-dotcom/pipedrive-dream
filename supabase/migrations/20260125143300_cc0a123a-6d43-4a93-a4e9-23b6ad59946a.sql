-- =============================================
-- CRM JACOMETO - DATABASE SCHEMA
-- Fase 1: Fundação + Módulo de Contatos
-- =============================================

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'corretor');

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'corretor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 4. Create organizations table (empresas/clientes)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT,
    cnae TEXT,
    rntrc_antt TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_neighborhood TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zipcode TEXT,
    notes TEXT,
    label TEXT, -- Quente, Morno, Frio
    owner_id UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create people table (contatos individuais)
CREATE TABLE public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    job_title TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    notes TEXT,
    label TEXT, -- Quente, Morno, Frio
    lead_source TEXT, -- Origem do lead
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    owner_id UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- 7. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- 8. Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- 9. RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 10. RLS Policies for user_roles (only admins can manage, all can view)
CREATE POLICY "All authenticated users can view roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can insert roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for organizations
CREATE POLICY "Authenticated users can view all organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update organizations"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid() 
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Only admins can delete organizations"
    ON public.organizations FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for people
CREATE POLICY "Authenticated users can view all people"
    ON public.people FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert people"
    ON public.people FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update people"
    ON public.people FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid() 
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Only admins can delete people"
    ON public.people FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 13. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 14. Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_people_updated_at
    BEFORE UPDATE ON public.people
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Create function to handle new user signup (auto-create profile + role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    -- Assign default role (corretor)
    -- First user becomes admin
    IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'corretor');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 16. Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 17. Create indexes for better performance
CREATE INDEX idx_organizations_name ON public.organizations(name);
CREATE INDEX idx_organizations_cnpj ON public.organizations(cnpj);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_people_name ON public.people(name);
CREATE INDEX idx_people_email ON public.people(email);
CREATE INDEX idx_people_organization ON public.people(organization_id);
CREATE INDEX idx_people_owner ON public.people(owner_id);