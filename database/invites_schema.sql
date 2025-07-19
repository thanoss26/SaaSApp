-- Invites table for organization invitations
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'organization_member',
    message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invites_organization_id ON public.invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON public.invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON public.invites(created_by);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON public.invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_is_used ON public.invites(is_used);

-- Enable Row Level Security (RLS)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites table

-- Policy: Users can view invites for their organization
CREATE POLICY "Users can view invites for their organization" ON public.invites
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can create invites for their organization
CREATE POLICY "Users can create invites for their organization" ON public.invites
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ) AND
        created_by = auth.uid()
    );

-- Policy: Users can update invites they created
CREATE POLICY "Users can update invites they created" ON public.invites
    FOR UPDATE USING (
        created_by = auth.uid()
    );

-- Policy: Users can delete invites they created
CREATE POLICY "Users can delete invites they created" ON public.invites
    FOR DELETE USING (
        created_by = auth.uid()
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON public.invites
    FOR EACH ROW
    EXECUTE FUNCTION update_invites_updated_at();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_already BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.invites WHERE invite_code = code) INTO exists_already;
        
        -- If code doesn't exist, return it
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.invites TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 