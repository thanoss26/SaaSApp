const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireOrganization } = require('../middleware/auth');

// Process card payment
router.post('/card', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('💳 Processing card payment...');
        
        const { 
            payroll_id, 
            amount, 
            card_number, 
            card_holder, 
            card_expiry, 
            card_cvv 
        } = req.body;

        // Validate required fields
        if (!payroll_id || !amount || !card_number || !card_holder || !card_expiry || !card_cvv) {
            return res.status(400).json({ error: 'Missing required payment fields' });
        }

        // Validate card number (basic Luhn algorithm check)
        if (!isValidCardNumber(card_number.replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Invalid card number' });
        }

        // Validate expiry date
        if (!isValidExpiryDate(card_expiry)) {
            return res.status(400).json({ error: 'Invalid expiry date' });
        }

        // Validate CVV
        if (!isValidCVV(card_cvv)) {
            return res.status(400).json({ error: 'Invalid CVV' });
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

        // Only admins can process payments
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ Non-admin user attempted to process payment');
            return res.status(403).json({ error: 'Admin access required to process payments' });
        }

        // Verify payroll belongs to the organization and is pending
        const { data: payroll, error: payrollError } = await supabase
            .from('payrolls')
            .select('*')
            .eq('id', payroll_id)
            .eq('organization_id', profile.organization_id)
            .eq('status', 'pending')
            .single();

        if (payrollError || !payroll) {
            console.error('❌ Payroll not found or not pending:', payrollError);
            return res.status(400).json({ error: 'Payroll not found or not eligible for payment' });
        }

        // Verify amount matches payroll total
        if (parseFloat(amount) !== parseFloat(payroll.total_amount)) {
            console.error('❌ Amount mismatch:', amount, 'vs', payroll.total_amount);
            return res.status(400).json({ error: 'Payment amount does not match payroll total' });
        }

        // In a real application, you would integrate with a payment processor here
        // For demonstration, we'll simulate a successful payment
        console.log('💳 Simulating card payment processing...');
        
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate payment reference
        const paymentReference = `PAY${Date.now().toString().slice(-8)}`;

        // Create payment record
        const { data: payment, error: paymentCreateError } = await supabase
            .from('payments')
            .insert({
                payroll_id: payroll_id,
                payment_reference: paymentReference,
                amount: parseFloat(amount),
                payment_method: 'card',
                payment_status: 'completed',
                card_last4: card_number.slice(-4),
                processed_by: req.user.id,
                processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentCreateError) {
            console.error('❌ Error creating payment record:', paymentCreateError);
            return res.status(500).json({ error: 'Failed to create payment record' });
        }

        // Update payroll status to completed
        const { error: payrollUpdateError } = await supabase
            .from('payrolls')
            .update({ 
                status: 'completed',
                paid_at: new Date().toISOString()
            })
            .eq('id', payroll_id);

        if (payrollUpdateError) {
            console.error('❌ Error updating payroll status:', payrollUpdateError);
            return res.status(500).json({ error: 'Failed to update payroll status' });
        }

        console.log('✅ Card payment processed successfully:', paymentReference);
        res.json({ 
            message: 'Payment processed successfully',
            payment_reference: paymentReference,
            payment: payment
        });

    } catch (error) {
        console.error('❌ Error in card payment route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process bank transfer
router.post('/bank', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('🏦 Processing bank transfer...');
        
        const { 
            payroll_id, 
            amount, 
            bank_reference 
        } = req.body;

        // Validate required fields
        if (!payroll_id || !amount) {
            return res.status(400).json({ error: 'Missing required payment fields' });
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

        // Only admins can process payments
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ Non-admin user attempted to process payment');
            return res.status(403).json({ error: 'Admin access required to process payments' });
        }

        // Verify payroll belongs to the organization and is pending
        const { data: payroll, error: payrollError } = await supabase
            .from('payrolls')
            .select('*')
            .eq('id', payroll_id)
            .eq('organization_id', profile.organization_id)
            .eq('status', 'pending')
            .single();

        if (payrollError || !payroll) {
            console.error('❌ Payroll not found or not pending:', payrollError);
            return res.status(400).json({ error: 'Payroll not found or not eligible for payment' });
        }

        // Verify amount matches payroll total
        if (parseFloat(amount) !== parseFloat(payroll.total_amount)) {
            console.error('❌ Amount mismatch:', amount, 'vs', payroll.total_amount);
            return res.status(400).json({ error: 'Payment amount does not match payroll total' });
        }

        // Generate payment reference if not provided
        const paymentReference = bank_reference || `BANK${Date.now().toString().slice(-8)}`;

        // Create payment record
        const { data: payment, error: paymentCreateError } = await supabase
            .from('payments')
            .insert({
                payroll_id: payroll_id,
                payment_reference: paymentReference,
                amount: parseFloat(amount),
                payment_method: 'bank_transfer',
                payment_status: 'pending', // Bank transfers are typically pending until confirmed
                processed_by: req.user.id,
                processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentCreateError) {
            console.error('❌ Error creating payment record:', paymentCreateError);
            return res.status(500).json({ error: 'Failed to create payment record' });
        }

        // Update payroll status to pending (waiting for bank confirmation)
        const { error: payrollUpdateError } = await supabase
            .from('payrolls')
            .update({ 
                status: 'pending_payment',
                payment_reference: paymentReference
            })
            .eq('id', payroll_id);

        if (payrollUpdateError) {
            console.error('❌ Error updating payroll status:', payrollUpdateError);
            return res.status(500).json({ error: 'Failed to update payroll status' });
        }

        console.log('✅ Bank transfer initiated successfully:', paymentReference);
        res.json({ 
            message: 'Bank transfer initiated successfully',
            payment_reference: paymentReference,
            payment: payment,
            note: 'Payment will be completed once bank transfer is confirmed'
        });

    } catch (error) {
        console.error('❌ Error in bank transfer route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get payment history for organization
router.get('/history', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('📋 Fetching payment history...');
        
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
            .from('payments')
            .select(`
                *,
                payroll:payrolls!payments_payroll_id_fkey(
                    id,
                    payroll_id,
                    employee:profiles!payrolls_employee_id_fkey(
                        id,
                        first_name,
                        last_name,
                        email
                    )
                )
            `)
            .eq('payroll.organization_id', profile.organization_id);

        // If user is not admin, only show payments for their payrolls
        if (!['admin', 'super_admin'].includes(profile.role)) {
            query = query.eq('payroll.employee_id', req.user.id);
        }

        const { data: payments, error } = await query.order('processed_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payment history' });
        }

        console.log('✅ Payment history fetched successfully:', payments?.length || 0);
        res.json({ payments: payments || [] });

    } catch (error) {
        console.error('❌ Error in payment history route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions for validation
function isValidCardNumber(cardNumber) {
    // Basic Luhn algorithm check
    if (!/^\d{13,19}$/.test(cardNumber)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

function isValidExpiryDate(expiry) {
    // Format: MM/YY
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    
    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);
    
    if (expMonth < 1 || expMonth > 12) return false;
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) return false;
    
    return true;
}

function isValidCVV(cvv) {
    // CVV should be 3-4 digits
    return /^\d{3,4}$/.test(cvv);
}

module.exports = router; 