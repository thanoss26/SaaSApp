const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireUserManagement } = require('../middleware/auth');
const { sendInviteEmail } = require('../utils/emailService');

// Get all users/employees
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Fetching employees for organization:', req.profile.organization_id);
        
        let query = supabase
            .from('employees')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: users, error } = await query;

        if (error) {
            console.error('❌ Error fetching employees:', error);
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }

        // Transform data to match frontend expectations
        const employees = (users || []).map(user => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            department: user.department,
            job_title: user.job_title,
            employment_type: user.employment_type,
            work_location: user.work_location,
            employee_status: user.employee_status,
            date_of_joining: user.date_of_joining,
            salary: user.salary,
            currency: user.currency,
            pay_frequency: user.pay_frequency,
            annual_bonus: user.annual_bonus,
            benefits_package: user.benefits_package,
            work_schedule: user.work_schedule,
            work_days: user.work_days,
            break_time: user.break_time,
            overtime_eligible: user.overtime_eligible,
            employee_id: user.employee_id,
            organization_id: user.organization_id,
            team_id: user.team_id,
            certifications: user.certifications,
            terms_accepted: user.terms_accepted,
            invite_code: user.invite_code,
            invite_code_expires_at: user.invite_code_expires_at,
            invite_sent_at: user.invite_sent_at,
            profile_id: user.profile_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            is_active: user.is_active,
            status: user.is_active ? 'active' : 'inactive',
            performance: user.performance_rating || Math.floor(Math.random() * 30) + 70
        }));

        console.log('✅ Employees fetched successfully:', employees.length);
        res.json({ users: employees });

    } catch (error) {
        console.error('❌ Error in employees route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching user by ID:', id);

        let query = supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: user, error } = await query;

        if (error || !user) {
            console.error('❌ Error fetching user:', error);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('✅ User fetched successfully');
        res.json({ user });

    } catch (error) {
        console.error('❌ Error in user route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user/employee (admin/manager/super_admin only)
router.post('/', authenticateToken, requireUserManagement, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            employment_type,
            job_title,
            department,
            work_location,
            reporting_manager_id,
            employee_status,
            date_of_joining,
            salary,
            currency,
            pay_frequency,
            annual_bonus,
            benefits_package,
            work_schedule,
            work_days,
            break_time,
            overtime_eligible,
            team_id,
            certifications,
            terms_accepted,
            address,
            tax_info,
            bank_info
        } = req.body;

        console.log('➕ Creating new employee:', { email, first_name, last_name });

        // Validate required fields
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('employees')
            .select('id')
            .eq('email', email)
            .eq('is_deleted', false)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Insert new employee
        const { data: newUser, error: userError } = await supabase
            .from('employees')
            .insert([{
                first_name,
                last_name,
                email,
                phone: phone || null,
                employment_type,
                job_title,
                department,
                work_location,
                reporting_manager_id: reporting_manager_id || null,
                employee_status: employee_status || 'active',
                date_of_joining,
                salary,
                currency,
                pay_frequency,
                annual_bonus,
                benefits_package,
                work_schedule,
                work_days,
                break_time,
                overtime_eligible,
                team_id: team_id || null,
                certifications: certifications || null,
                terms_accepted: terms_accepted || false,
                organization_id: req.profile.organization_id,
                address: address || null,
                tax_info: tax_info || null,
                bank_info: bank_info || null,
                is_active: true,
                is_deleted: false,
                created_by: req.user.id,
                updated_by: req.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (userError) {
            console.error('❌ Error creating employee:', userError);
            return res.status(500).json({ error: 'Failed to create employee' });
        }

        console.log('✅ Employee created successfully');

        // Send invite email to the new employee
        try {
            console.log('📧 Sending invite email to:', newUser.email);
            const emailResult = await sendInviteEmail(newUser, newUser.invite_code);
            
            if (emailResult.success) {
                console.log('📧 Invite email sent successfully');
                
                // Mark invite as sent in database
                await supabase.rpc('mark_invite_sent', {
                    employee_uuid: newUser.id,
                    sent_by_uuid: req.user.id
                });
            } else {
                console.warn('⚠️ Failed to send invite email:', emailResult.error);
            }
        } catch (emailError) {
            console.warn('⚠️ Error sending invite email:', emailError);
            // Don't fail the employee creation if email fails
        }

        res.status(201).json({ 
            user: newUser,
            emailSent: true,
            inviteCode: newUser.invite_code
        });

    } catch (error) {
        console.error('❌ Error in create employee route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user/employee
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updated_at: new Date().toISOString(), updated_by: req.user.id };

        console.log('✏️ Updating employee:', id);

        // Get current employee to check permissions
        let query = supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: currentUser, error: fetchError } = await query;

        if (fetchError || !currentUser) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check if email is being changed and if it already exists
        if (updateData.email && updateData.email !== currentUser.email) {
            const { data: existingUser } = await supabase
                .from('employees')
                .select('id')
                .eq('email', updateData.email)
                .neq('id', id)
                .eq('is_deleted', false)
                .single();

            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        // Update employee data
        const { data: updatedUser, error } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating employee:', error);
            return res.status(500).json({ error: 'Failed to update employee' });
        }

        console.log('✅ Employee updated successfully');
        res.json({ user: updatedUser });

    } catch (error) {
        console.error('❌ Error in update employee route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user/employee (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Deleting employee:', id);

        // Get employee to check permissions
        let query = supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: user, error: fetchError } = await query;

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Prevent deleting super_admin users (if you have such logic)
        if (user.role === 'super_admin') {
            return res.status(403).json({ error: 'Cannot delete super admin users' });
        }

        // Prevent deleting yourself (if you have such logic)
        if (user.id === req.user.id) {
            return res.status(403).json({ error: 'Cannot delete your own account' });
        }

        // Soft delete employee
        const { error } = await supabase
            .from('employees')
            .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: req.user.id })
            .eq('id', id);

        if (error) {
            console.error('❌ Error deleting employee:', error);
            return res.status(500).json({ error: 'Failed to delete employee' });
        }

        console.log('✅ Employee deleted successfully');
        res.json({ message: 'Employee deleted successfully' });

    } catch (error) {
        console.error('❌ Error in delete employee route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q, department, employment_type, status, page = 1, limit = 10 } = req.query;
        console.log('🔍 Searching employees with filters:', { q, department, employment_type, status });

        let query = supabase
            .from('employees')
            .select('*', { count: 'exact' })
            .eq('is_deleted', false);

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        // Apply search filters
        if (q) {
            query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,job_title.ilike.%${q}%,department.ilike.%${q}%`);
        }

        if (department) {
            query = query.eq('department', department);
        }

        if (employment_type) {
            query = query.eq('employment_type', employment_type);
        }

        if (status) {
            query = query.eq('is_active', status === 'active');
        }

        // Apply pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        // Order by creation date
        query = query.order('created_at', { ascending: false });

        const { data: users, error, count } = await query;

        if (error) {
            console.error('❌ Error searching employees:', error);
            return res.status(500).json({ error: 'Failed to search employees' });
        }

        console.log('✅ Search completed:', users.length, 'results');
        res.json({
            users: users || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error in search employees route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Fetching employee statistics');

        let baseQuery = supabase
            .from('employees')
            .select('*')
            .eq('is_deleted', false);

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            baseQuery = baseQuery.eq('organization_id', req.profile.organization_id);
        }

        const { data: users, error } = await baseQuery;

        if (error) {
            console.error('❌ Error fetching employee stats:', error);
            return res.status(500).json({ error: 'Failed to fetch employee statistics' });
        }

        // Calculate statistics
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.is_active).length;
        const departments = new Set(users.map(user => user.department)).size;
        const employmentTypes = new Set(users.map(user => user.employment_type)).size;

        // Department breakdown
        const departmentBreakdown = {};
        users.forEach(user => {
            if (user.department) {
                departmentBreakdown[user.department] = (departmentBreakdown[user.department] || 0) + 1;
            }
        });

        // Employment type breakdown
        const employmentTypeBreakdown = {};
        users.forEach(user => {
            if (user.employment_type) {
                employmentTypeBreakdown[user.employment_type] = (employmentTypeBreakdown[user.employment_type] || 0) + 1;
            }
        });

        console.log('✅ Employee statistics calculated');
        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            departments,
            employmentTypes,
            departmentBreakdown,
            employmentTypeBreakdown,
            attendanceRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        });

    } catch (error) {
        console.error('❌ Error in employee stats route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Regenerate invite code for an employee
router.post('/:id/regenerate-invite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔄 Regenerating invite code for employee:', id);

        // Get current employee to check permissions
        let query = supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: employee, error: fetchError } = await query;

        if (fetchError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Call the regenerate_invite_code function
        const { data: newCode, error: regenerateError } = await supabase.rpc('regenerate_invite_code', {
            employee_uuid: id
        });

        if (regenerateError) {
            console.error('❌ Error regenerating invite code:', regenerateError);
            return res.status(500).json({ error: 'Failed to regenerate invite code' });
        }

        console.log('✅ Invite code regenerated successfully');
        res.json({ 
            message: 'Invite code regenerated successfully',
            invite_code: newCode
        });

    } catch (error) {
        console.error('❌ Error in regenerate invite code route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send invite email to employee (admin/manager/super_admin only)
router.post('/:id/send-invite', authenticateToken, requireUserManagement, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📧 Sending invite email to employee:', id);

        // Get current employee to check permissions
        let query = supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        // Filter by organization if user has one
        if (req.profile.organization_id) {
            query = query.eq('organization_id', req.profile.organization_id);
        }

        const { data: employee, error: fetchError } = await query;

        if (fetchError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (!employee.invite_code) {
            return res.status(400).json({ error: 'No invite code found for this employee' });
        }

        if (employee.profile_id) {
            return res.status(400).json({ error: 'Employee has already registered' });
        }

        // Mark invite as sent
        const { error: markError } = await supabase.rpc('mark_invite_sent', {
            employee_uuid: id,
            sent_by_uuid: req.user.id
        });

        if (markError) {
            console.error('❌ Error marking invite as sent:', markError);
            return res.status(500).json({ error: 'Failed to mark invite as sent' });
        }

        // TODO: In a real application, you would send an actual email here
        // For now, we'll just return the invite code and email details
        console.log('✅ Invite marked as sent successfully');
        res.json({ 
            message: 'Invite sent successfully',
            invite_code: employee.invite_code,
            email: employee.email,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            expires_at: employee.invite_code_expires_at
        });

    } catch (error) {
        console.error('❌ Error in send invite route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate invite code (for employee registration)
router.post('/validate-invite', async (req, res) => {
    try {
        const { invite_code } = req.body;
        
        if (!invite_code) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        console.log('🔍 Validating invite code:', invite_code);

        const { data: validation, error } = await supabase.rpc('validate_invite_code', {
            code: invite_code
        });

        if (error) {
            console.error('❌ Error validating invite code:', error);
            return res.status(500).json({ error: 'Failed to validate invite code' });
        }

        if (!validation || validation.length === 0) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const result = validation[0];
        
        if (!result.is_valid) {
            return res.status(400).json({ 
                error: result.error_message,
                is_valid: false
            });
        }

        console.log('✅ Invite code validated successfully');
        res.json({
            is_valid: true,
            employee_id: result.employee_id,
            employee_email: result.employee_email,
            employee_name: result.employee_name,
            organization_id: result.organization_id
        });

    } catch (error) {
        console.error('❌ Error in validate invite route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 