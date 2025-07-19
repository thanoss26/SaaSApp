const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPayrollsTable() {
    console.log('🔧 Checking and creating payrolls table...');
    
    try {
        // Check what tables exist
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
        if (tablesError) {
            console.error('❌ Error checking tables:', tablesError);
            return;
        }
        
        console.log('📋 Existing tables:', tables.map(t => t.table_name));
        
        // Check if payrolls table exists
        const payrollsTable = tables.find(t => t.table_name === 'payrolls');
        
        if (!payrollsTable) {
            console.log('❌ Payrolls table not found - creating it...');
            
            // Create the payrolls table
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS payrolls (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    payroll_id VARCHAR(20) UNIQUE NOT NULL,
                    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    pay_period VARCHAR(20) NOT NULL CHECK (pay_period IN ('weekly', 'bi-weekly', 'monthly')),
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    base_salary DECIMAL(10,2) NOT NULL,
                    bonus DECIMAL(10,2) DEFAULT 0,
                    reimbursement DECIMAL(10,2) DEFAULT 0,
                    deductions DECIMAL(10,2) DEFAULT 0,
                    total_amount DECIMAL(10,2) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
                    notes TEXT,
                    created_by UUID NOT NULL REFERENCES profiles(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;
            
            // Since we can't execute raw SQL, let's try to create it through the API
            // We'll use a different approach - let's check if we can create it through migrations
            
            console.log('⚠️ Cannot create table through API - need to create it manually in Supabase dashboard');
            console.log('📝 SQL to create payrolls table:');
            console.log(createTableSQL);
            
        } else {
            console.log('✅ Payrolls table already exists');
            
            // Check the structure
            const { data: columns, error: columnsError } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable')
                .eq('table_name', 'payrolls')
                .eq('table_schema', 'public');
                
            if (columnsError) {
                console.error('❌ Error checking columns:', columnsError);
            } else {
                console.log('📋 Payrolls table columns:', columns);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createPayrollsTable(); 