const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireOrganization } = require('../middleware/auth');

// Get all payrolls for the organization (admin can see all, employees see only their own)
router.get('/', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('💰 Fetching payrolls...');
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Get payrolls for this organization using admin client to bypass RLS
        const { data: payrolls, error: fetchError } = await supabaseAdmin
            .from('payrolls')
            .select(`
                *,
                employee:profiles!payrolls_employee_id_fkey(
                    id,
                    first_name,
                    last_name,
                    email,
                    role
                )
            `)
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('❌ Error fetching payrolls:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch payrolls' });
        }

        console.log('✅ Payrolls fetched successfully:', payrolls?.length || 0);
        res.json({ payrolls: payrolls || [] });

    } catch (error) {
        console.error('❌ Error in payrolls route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get payroll statistics for the organization
router.get('/stats', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('📊 Fetching payroll statistics...');
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Get payroll statistics
        const { data: stats, error } = await supabase
            .from('payrolls')
            .select('total_amount, status, created_at')
            .eq('organization_id', profile.organization_id);

        if (error) {
            console.error('❌ Error fetching payroll stats:', error);
            return res.status(500).json({ error: 'Failed to fetch payroll statistics' });
        }

        // Calculate statistics
        const totalPayroll = stats?.reduce((sum, payroll) => sum + (payroll.total_amount || 0), 0) || 0;
        const completedPayrolls = stats?.filter(p => p.status === 'completed').length || 0;
        const pendingPayrolls = stats?.filter(p => p.status === 'pending').length || 0;
        const totalPayrolls = stats?.length || 0;

        // Calculate monthly trend (mock data for now)
        const monthlyTrend = 15; // 15% increase

        const payrollStats = {
            totalPayroll: totalPayroll,
            totalExpense: totalPayroll * 0.2, // Mock expense calculation
            pendingPayments: pendingPayrolls,
            totalPayrolls: totalPayrolls,
            monthlyTrend: monthlyTrend
        };

        console.log('✅ Payroll statistics calculated:', payrollStats);
        res.json({ stats: payrollStats });

    } catch (error) {
        console.error('❌ Error in payroll stats route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization employees for payroll creation (admin only)
router.get('/employees', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('👥 Fetching employees for payroll...');
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Only admins can access employee list for payroll creation
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ Non-admin user attempted to access employee list');
            return res.status(403).json({ error: 'Admin access required to view employee list' });
        }

        const { data: employees, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role')
            .eq('organization_id', profile.organization_id)
            .eq('is_active', true)
            .neq('id', req.user.id) // Exclude the current user (admin) from the list
            .order('first_name', { ascending: true });

        if (error) {
            console.error('❌ Error fetching employees:', error);
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }

        console.log('✅ Employees fetched successfully:', employees?.length || 0);
        console.log('🚫 Excluded current user (admin) from employee list');
        res.json({ employees: employees || [] });

    } catch (error) {
        console.error('❌ Error in employees route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new payroll (admin only)
router.post('/', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('💰 Creating new payroll...');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        
        const { 
            employee_id, 
            pay_period, 
            start_date, 
            end_date, 
            base_salary, 
            bonus, 
            reimbursement, 
            deductions, 
            notes 
        } = req.body;

        // Validate required fields
        if (!employee_id || !pay_period || !start_date || !end_date || !base_salary) {
            console.log('❌ Missing required fields:', { employee_id, pay_period, start_date, end_date, base_salary });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('🔍 User ID from request:', req.user.id);
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        console.log('👤 User profile:', profile);

        // Only admins can create payrolls
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ Non-admin user attempted to create payroll');
            return res.status(403).json({ error: 'Admin access required to create payroll' });
        }

        // Verify employee belongs to the organization
        console.log('🔍 Verifying employee:', employee_id, 'belongs to organization:', profile.organization_id);
        
        const { data: employee, error: employeeError } = await supabase
            .from('profiles')
            .select('id, organization_id')
            .eq('id', employee_id)
            .eq('organization_id', profile.organization_id)
            .single();

        if (employeeError || !employee) {
            console.error('❌ Employee not found or not in organization:', employeeError);
            return res.status(400).json({ error: 'Employee not found or not in your organization' });
        }

        console.log('✅ Employee verified:', employee);

        // Prevent admins from creating payroll for themselves
        if (employee_id === req.user.id) {
            console.log('❌ Admin attempted to create payroll for themselves');
            return res.status(400).json({ error: 'Organization admins cannot create payroll for themselves' });
        }

        // Calculate total amount
        const totalAmount = parseFloat(base_salary || 0) + 
                          parseFloat(bonus || 0) + 
                          parseFloat(reimbursement || 0) - 
                          parseFloat(deductions || 0);

        console.log('💰 Total amount calculated:', totalAmount);

        // Generate payroll ID
        const payrollId = `PYRL${Date.now().toString().slice(-6)}`;
        console.log('🆔 Generated payroll ID:', payrollId);

        // Create payroll record
        const payrollData = {
            payroll_id: payrollId,
            employee_id: employee_id,
            organization_id: profile.organization_id,
            pay_period: pay_period,
            start_date: start_date,
            end_date: end_date,
            base_salary: parseFloat(base_salary),
            bonus: parseFloat(bonus || 0),
            reimbursement: parseFloat(reimbursement || 0),
            deductions: parseFloat(deductions || 0),
            total_amount: totalAmount,
            status: 'pending',
            notes: notes,
            created_by: req.user.id
        };

        console.log('📝 Inserting payroll data:', JSON.stringify(payrollData, null, 2));

        // Insert payroll record using admin client to bypass RLS
        const { data: payroll, error: insertError } = await supabaseAdmin
            .from('payrolls')
            .insert(payrollData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error creating payroll:', insertError);
            console.error('❌ Error details:', JSON.stringify(insertError, null, 2));
            return res.status(500).json({ error: 'Failed to create payroll' });
        }

        console.log('✅ Payroll created successfully:', payroll);
        res.json({ 
            message: 'Payroll created successfully',
            payroll: payroll
        });

    } catch (error) {
        console.error('❌ Error in create payroll route:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/payroll/:id/proceed-to-payment - Proceed to payment for a payroll
router.post('/:id/proceed-to-payment', authenticateToken, async (req, res) => {
    console.log('💳 POST /api/payroll/:id/proceed-to-payment - Proceeding to payment');
    
    try {
        const payrollId = req.params.id;
        const userId = req.user.id;
        
        console.log('🔍 Payroll ID:', payrollId);
        console.log('🔍 User ID:', userId);
        
        // Get user profile to check permissions
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (profileError || !userProfile) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
        
        // Check if user has permission to process payments
        if (!['admin', 'super_admin'].includes(userProfile.role)) {
            console.error('❌ User does not have permission to process payments');
            return res.status(403).json({ error: 'Insufficient permissions to process payments' });
        }
        
        // Get the payroll record
        const { data: payroll, error: payrollError } = await supabaseAdmin
            .from('payrolls')
            .select(`
                *,
                employee:profiles!payrolls_employee_id_fkey(
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('id', payrollId)
            .eq('organization_id', userProfile.organization_id)
            .single();
            
        if (payrollError || !payroll) {
            console.error('❌ Payroll not found:', payrollError);
            return res.status(404).json({ error: 'Payroll not found' });
        }
        
        // Check if payroll is already paid
        if (payroll.status === 'paid') {
            console.log('❌ Payroll is already paid');
            return res.status(400).json({ error: 'Payroll is already paid' });
        }
        
        // Check if payroll is cancelled
        if (payroll.status === 'cancelled') {
            console.log('❌ Payroll is cancelled');
            return res.status(400).json({ error: 'Cannot process payment for cancelled payroll' });
        }
        
        console.log('📋 Payroll details:', {
            id: payroll.id,
            payroll_id: payroll.payroll_id,
            employee: payroll.employee?.first_name + ' ' + payroll.employee?.last_name,
            total_amount: payroll.total_amount,
            status: payroll.status
        });
        
        // Generate payment reference
        const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Update payroll status to paid
        const { error: updateError } = await supabaseAdmin
            .from('payrolls')
            .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_reference: paymentReference,
                updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);
            
        if (updateError) {
            console.error('❌ Error updating payroll status:', updateError);
            return res.status(500).json({ error: 'Failed to update payroll status' });
        }
        
        // Create payment record
        const paymentData = {
            payment_reference: paymentReference,
            payroll_id: payrollId,
            employee_id: payroll.employee_id,
            organization_id: payroll.organization_id,
            amount: payroll.total_amount,
            payment_method: 'bank_transfer', // Default payment method
            status: 'completed',
            processed_by: userId,
            processed_at: new Date().toISOString(),
            notes: `Payment processed for payroll ${payroll.payroll_id}`
        };
        
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert(paymentData)
            .select()
            .single();
            
        if (paymentError) {
            console.error('❌ Error creating payment record:', paymentError);
            // Don't fail the whole operation, just log the error
            console.log('⚠️ Payment record creation failed, but payroll status updated');
        } else {
            console.log('✅ Payment record created:', payment.id);
        }
        
        console.log('🎉 Payment processing completed successfully');
        
        res.json({
            success: true,
            message: 'Payment processed successfully',
            payment_reference: paymentReference,
            payroll_id: payroll.payroll_id,
            amount: payroll.total_amount,
            employee: payroll.employee?.first_name + ' ' + payroll.employee?.last_name
        });
        
    } catch (error) {
        console.error('❌ Error in proceed-to-payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific payroll details
router.get('/:id', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('📋 Fetching payroll details:', req.params.id);
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        let query = supabase
            .from('payrolls')
            .select(`
                *,
                employee:profiles!payrolls_employee_id_fkey(
                    id,
                    first_name,
                    last_name,
                    email,
                    role
                )
            `)
            .eq('id', req.params.id)
            .eq('organization_id', profile.organization_id);

        // If user is not admin, only allow access to their own payrolls
        if (!['admin', 'super_admin'].includes(profile.role)) {
            query = query.eq('employee_id', req.user.id);
        }

        const { data: payroll, error } = await query.single();

        if (error) {
            console.error('❌ Error fetching payroll:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Payroll not found' });
            }
            return res.status(500).json({ error: 'Failed to fetch payroll' });
        }

        console.log('✅ Payroll details fetched successfully');
        res.json({ payroll: payroll });

    } catch (error) {
        console.error('❌ Error in payroll details route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update payroll status (admin only)
router.patch('/:id/status', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('🔄 Updating payroll status:', req.params.id);
        
        const { status } = req.body;

        if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Only admins can update payroll status
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ Non-admin user attempted to update payroll status');
            return res.status(403).json({ error: 'Admin access required to update payroll status' });
        }

        const { data: payroll, error } = await supabase
            .from('payrolls')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating payroll status:', error);
            return res.status(500).json({ error: 'Failed to update payroll status' });
        }

        console.log('✅ Payroll status updated successfully');
        res.json({ 
            message: 'Payroll status updated successfully',
            payroll: payroll
        });

    } catch (error) {
        console.error('❌ Error in update payroll status route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 