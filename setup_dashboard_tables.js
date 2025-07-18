const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDashboardTables() {
    try {
        console.log('🔧 Setting up dashboard tables...');
        
        // Create dashboard table
        const { error: dashboardTableError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                CREATE TABLE IF NOT EXISTS dashboards (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
                    is_default BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                `
            });
        
        if (dashboardTableError) {
            console.error('❌ Error creating dashboard table:', dashboardTableError);
            return;
        }
        
        // Create dashboard_widgets table
        const { error: widgetsTableError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                CREATE TABLE IF NOT EXISTS dashboard_widgets (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    config JSONB DEFAULT '{}',
                    order_index INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                `
            });
        
        if (widgetsTableError) {
            console.error('❌ Error creating dashboard_widgets table:', widgetsTableError);
            return;
        }
        
        // Create indexes
        const { error: indexesError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                CREATE INDEX IF NOT EXISTS idx_dashboards_organization_id ON dashboards(organization_id);
                CREATE INDEX IF NOT EXISTS idx_dashboards_slug ON dashboards(slug);
                CREATE INDEX IF NOT EXISTS idx_dashboards_is_default ON dashboards(is_default);
                CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
                CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_order_index ON dashboard_widgets(order_index);
                CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);
                `
            });
        
        if (indexesError) {
            console.error('❌ Error creating indexes:', indexesError);
            return;
        }
        
        console.log('✅ Dashboard tables created successfully');
        
        // Get the first organization to create a default dashboard
        const { data: organizations, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1);
            
        if (orgError) {
            console.error('❌ Error fetching organizations:', orgError);
            return;
        }
        
        if (organizations.length === 0) {
            console.log('⚠️  No organizations found. Please create an organization first.');
            return;
        }
        
        const organization = organizations[0];
        console.log(`📊 Creating default dashboard for organization: ${organization.name}`);
        
        // Create default dashboard
        const { data: dashboard, error: dashboardError } = await supabase
            .from('dashboards')
            .insert({
                name: 'Main Dashboard',
                slug: 'main-dashboard',
                description: 'Default dashboard for the organization',
                organization_id: organization.id,
                is_default: true
            })
            .select()
            .single();
            
        if (dashboardError) {
            console.error('❌ Error creating default dashboard:', dashboardError);
            return;
        }
        
        console.log('✅ Default dashboard created:', dashboard.name);
        
        // Create sample widgets for the dashboard
        const sampleWidgets = [
            {
                dashboard_id: dashboard.id,
                type: 'employee_growth',
                title: 'Employee Growth',
                config: {
                    chartType: 'line',
                    timeRange: '30d',
                    showTrend: true
                },
                order_index: 1
            },
            {
                dashboard_id: dashboard.id,
                type: 'department_distribution',
                title: 'Department Distribution',
                config: {
                    chartType: 'doughnut',
                    showPercentages: true,
                    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                },
                order_index: 2
            },
            {
                dashboard_id: dashboard.id,
                type: 'attendance_trend',
                title: 'Attendance Trend',
                config: {
                    chartType: 'bar',
                    timeRange: '7d',
                    showAverage: true
                },
                order_index: 3
            },
            {
                dashboard_id: dashboard.id,
                type: 'performance_metrics',
                title: 'Performance Metrics',
                config: {
                    chartType: 'radar',
                    metrics: ['productivity', 'attendance', 'quality', 'collaboration'],
                    showTargets: true
                },
                order_index: 4
            },
            {
                dashboard_id: dashboard.id,
                type: 'recent_activity',
                title: 'Recent Activity',
                config: {
                    maxItems: 10,
                    showTimestamps: true,
                    includeUserAvatars: true
                },
                order_index: 5
            }
        ];
        
        const { data: widgets, error: widgetsError } = await supabase
            .from('dashboard_widgets')
            .insert(sampleWidgets)
            .select();
            
        if (widgetsError) {
            console.error('❌ Error creating sample widgets:', widgetsError);
            return;
        }
        
        console.log(`✅ Created ${widgets.length} sample widgets`);
        
        // Display the created dashboard and widgets
        console.log('\n📊 Dashboard Setup Summary:');
        console.log(`Dashboard: ${dashboard.name} (${dashboard.slug})`);
        console.log(`Organization: ${organization.name}`);
        console.log(`Widgets: ${widgets.length} widgets created`);
        
        widgets.forEach((widget, index) => {
            console.log(`  ${index + 1}. ${widget.title} (${widget.type})`);
        });
        
        console.log('\n🎉 Dashboard tables and sample data setup complete!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the setup
setupDashboardTables(); 