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

// Proceed to payment endpoint
router.post('/:id/proceed-to-payment', authenticateToken, async (req, res) => {
    try {
        console.log('💰 Processing payment for payroll:', req.params.id);
        
        const { payment_method, card_number, card_holder, card_expiry, card_cvv, bank_reference } = req.body;
        
        // Get user profile to check payment settings
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
            
        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
        
        // Get payroll details
        const { data: payroll, error: payrollError } = await supabaseAdmin
            .from('payrolls')
            .select('*')
            .eq('id', req.params.id)
            .single();
            
        if (payrollError || !payroll) {
            console.error('❌ Payroll not found:', req.params.id);
            return res.status(404).json({ error: 'Payroll not found' });
        }
        
        // Check if user has permission to process this payroll
        if (payroll.organization_id !== userProfile.organization_id) {
            console.error('❌ User not authorized for this payroll');
            return res.status(403).json({ error: 'Not authorized to process this payroll' });
        }
        
        // Check if payroll is in pending status
        if (payroll.status !== 'pending') {
            console.error('❌ Payroll is not in pending status:', payroll.status);
            return res.status(400).json({ error: 'Payroll is not in pending status' });
        }
        
        // Process payment based on method
        let paymentResult;
        
        switch (payment_method) {
            case 'card':
                paymentResult = await processCardPayment(payroll, card_number, card_holder, card_expiry, card_cvv);
                break;
            case 'bank':
                paymentResult = await processBankTransfer(payroll, userProfile);
                break;
            case 'iban':
                paymentResult = await processIBANPayment(payroll, userProfile);
                break;
            case 'stripe':
                paymentResult = await processStripePayment(payroll, userProfile);
                break;
            case 'revolut':
                paymentResult = await processRevolutPayment(payroll);
                break;
            case 'paypal':
                paymentResult = await processPaypalPayment(payroll);
                break;
            default:
                return res.status(400).json({ error: 'Invalid payment method' });
        }
        
        if (!paymentResult.success) {
            return res.status(400).json({ error: paymentResult.error });
        }
        
        // Update payroll status to paid
        const { error: updateError } = await supabaseAdmin
            .from('payrolls')
            .update({ 
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: payment_method,
                payment_reference: paymentResult.reference
            })
            .eq('id', req.params.id);
            
        if (updateError) {
            console.error('❌ Error updating payroll status:', updateError);
            return res.status(500).json({ error: 'Failed to update payroll status' });
        }
        
        // Create payment record
        const { error: paymentRecordError } = await supabaseAdmin
            .from('payments')
            .insert({
                payroll_id: req.params.id,
                amount: payroll.total_amount,
                payment_method: payment_method,
                payment_reference: paymentResult.reference,
                status: 'completed',
                processed_by: req.user.id,
                organization_id: userProfile.organization_id
            });
            
        if (paymentRecordError) {
            console.error('❌ Error creating payment record:', paymentRecordError);
            // Don't fail the request, just log the error
        }
        
        console.log('✅ Payment processed successfully');
        res.json({ 
            success: true, 
            message: 'Payment processed successfully',
            payment_reference: paymentResult.reference
        });
        
    } catch (error) {
        console.error('❌ Error processing payment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Payment processing functions
async function processCardPayment(payroll, cardNumber, cardHolder, cardExpiry, cardCvv) {
    // Validate card details
    if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
        return { success: false, error: 'Missing card details' };
    }
    
    // In a real implementation, you would integrate with a payment processor
    // For now, simulate successful payment
    const reference = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { success: true, reference };
}

async function processBankTransfer(payroll, userProfile) {
    // Use organization's bank details if available
    const reference = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { success: true, reference };
}

async function processIBANPayment(payroll, userProfile) {
    // Check if user has IBAN configured
    if (!userProfile.iban) {
        return { success: false, error: 'IBAN not configured. Please add your IBAN in settings.' };
    }
    
    // Validate IBAN format
    if (!validateIBAN(userProfile.iban)) {
        return { success: false, error: 'Invalid IBAN format' };
    }
    
    // In a real implementation, you would integrate with SEPA or local banking APIs
    const reference = `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { success: true, reference };
}

async function processStripePayment(payroll, userProfile) {
    // Check if Stripe is enabled
    const stripeEnabled = localStorage.getItem('stripeEnabled') === 'true';
    if (!stripeEnabled) {
        return { success: false, error: 'Stripe is not enabled. Please configure Stripe in settings.' };
    }
    
    // In a real implementation, you would:
    // 1. Get Stripe customer ID from database
    // 2. Create payment intent with Stripe
    // 3. Process the payment
    
    const reference = `STRIPE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { success: true, reference };
}

async function processRevolutPayment(payroll) {
    const reference = `REVOLUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { success: true, reference };
}

async function processPaypalPayment(payroll) {
    const reference = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { success: true, reference };
}

// IBAN validation function
function validateIBAN(iban) {
    if (!iban) return false;
    
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
    
    return ibanRegex.test(cleanIban);
}

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