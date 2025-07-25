const express = require('express');
const router = express.Router();
const { authenticateToken, requireUserManagement } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { checkEmployeeLimit } = require('../middleware/planLimits');

// Get all employees for an organization
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Fetching employees for organization:', req.user.organization_id);
        
        let query = supabase
            .from('employees')
            .select(`
                *,
                profiles!employees_reporting_manager_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                teams (
                    id,
                    name
                )
            `)
            .eq('is_deleted', false);
        
        // Filter by organization if user is not super admin
        if (req.user.role !== 'super_admin') {
            query = query.eq('organization_id', req.user.organization_id);
        }
        
        const { data: employees, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error fetching employees:', error);
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }
        
        console.log('✅ Employees fetched successfully:', employees.length);
        res.json(employees);
        
    } catch (error) {
        console.error('❌ Error in GET /employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get employee statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Fetching employee statistics');
        
        let query = supabase
            .from('employee_stats')
            .select('*');
        
        // Filter by organization if user is not super admin
        if (req.user.role !== 'super_admin') {
            query = query.eq('organization_id', req.user.organization_id);
        }
        
        const { data: stats, error } = await query;
        
        if (error) {
            console.error('❌ Error fetching employee stats:', error);
            return res.status(500).json({ error: 'Failed to fetch employee statistics' });
        }
        
        console.log('✅ Employee statistics calculated');
        res.json(stats[0] || {
            total_employees: 0,
            active_employees: 0,
            on_leave_employees: 0,
            terminated_employees: 0,
            full_time_employees: 0,
            part_time_employees: 0,
            contractor_employees: 0,
            average_salary: 0
        });
        
    } catch (error) {
        console.error('❌ Error in GET /employees/stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get department statistics
router.get('/stats/departments', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Fetching department statistics');
        
        let query = supabase
            .from('department_stats')
            .select('*')
            .order('employee_count', { ascending: false });
        
        // Filter by organization if user is not super admin
        if (req.user.role !== 'super_admin') {
            query = query.eq('organization_id', req.user.organization_id);
        }
        
        const { data: deptStats, error } = await query;
        
        if (error) {
            console.error('❌ Error fetching department stats:', error);
            return res.status(500).json({ error: 'Failed to fetch department statistics' });
        }
        
        console.log('✅ Department statistics calculated');
        res.json(deptStats);
        
    } catch (error) {
        console.error('❌ Error in GET /employees/stats/departments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching employee:', id);
        
        const { data: employee, error } = await supabase
            .from('employees')
            .select(`
                *,
                profiles!employees_reporting_manager_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                teams (
                    id,
                    name
                )
            `)
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (error) {
            console.error('❌ Error fetching employee:', error);
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Check if user has access to this employee
        if (req.user.role !== 'super_admin' && employee.organization_id !== req.user.organization_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        console.log('✅ Employee fetched successfully');
        res.json(employee);
        
    } catch (error) {
        console.error('❌ Error in GET /employees/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new employee (admin/manager/super_admin only)
router.post('/', authenticateToken, requireUserManagement, checkEmployeeLimit, async (req, res) => {
    try {
        console.log('➕ Creating new employee');
        
        const employeeData = {
            ...req.body,
            organization_id: req.user.organization_id,
            created_by: req.user.id,
            updated_by: req.user.id
        };
        
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'employment_type', 'job_title', 'department', 'work_location', 'date_of_joining'];
        for (const field of requiredFields) {
            if (!employeeData[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }
        
        // Check if email already exists
        const { data: existingEmployee } = await supabase
            .from('employees')
            .select('id')
            .eq('email', employeeData.email)
            .eq('is_deleted', false)
            .single();
        
        if (existingEmployee) {
            return res.status(400).json({ error: 'Employee with this email already exists' });
        }
        
        const { data: employee, error } = await supabase
            .from('employees')
            .insert(employeeData)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error creating employee:', error);
            return res.status(500).json({ error: 'Failed to create employee' });
        }
        
        console.log('✅ Employee created successfully:', employee.employee_id);
        res.status(201).json(employee);
        
    } catch (error) {
        console.error('❌ Error in POST /employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update employee
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('✏️  Updating employee:', id);
        
        // First, get the employee to check permissions
        const { data: existingEmployee, error: fetchError } = await supabase
            .from('employees')
            .select('organization_id, profile_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (fetchError) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Check permissions
        if (req.user.role !== 'super_admin' && 
            existingEmployee.organization_id !== req.user.organization_id &&
            existingEmployee.profile_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const updateData = {
            ...req.body,
            updated_by: req.user.id,
            updated_at: new Date().toISOString()
        };
        
        const { data: employee, error } = await supabase
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
        res.json(employee);
        
    } catch (error) {
        console.error('❌ Error in PUT /employees/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete employee (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️  Deleting employee:', id);
        
        // First, get the employee to check permissions
        const { data: existingEmployee, error: fetchError } = await supabase
            .from('employees')
            .select('organization_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (fetchError) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Check permissions
        if (req.user.role !== 'super_admin' && existingEmployee.organization_id !== req.user.organization_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { error } = await supabase
            .from('employees')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: req.user.id
            })
            .eq('id', id);
        
        if (error) {
            console.error('❌ Error deleting employee:', error);
            return res.status(500).json({ error: 'Failed to delete employee' });
        }
        
        console.log('✅ Employee deleted successfully');
        res.json({ message: 'Employee deleted successfully' });
        
    } catch (error) {
        console.error('❌ Error in DELETE /employees/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search employees
router.get('/search/:query', authenticateToken, async (req, res) => {
    try {
        const { query } = req.params;
        console.log('🔍 Searching employees:', query);
        
        let searchQuery = supabase
            .from('employees')
            .select(`
                *,
                profiles!employees_reporting_manager_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                teams (
                    id,
                    name
                )
            `)
            .eq('is_deleted', false)
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,job_title.ilike.%${query}%,department.ilike.%${query}%`);
        
        // Filter by organization if user is not super admin
        if (req.user.role !== 'super_admin') {
            searchQuery = searchQuery.eq('organization_id', req.user.organization_id);
        }
        
        const { data: employees, error } = await searchQuery.order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error searching employees:', error);
            return res.status(500).json({ error: 'Failed to search employees' });
        }
        
        console.log('✅ Employee search completed:', employees.length, 'results');
        res.json(employees);
        
    } catch (error) {
        console.error('❌ Error in GET /employees/search/:query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get employees by department
router.get('/department/:department', authenticateToken, async (req, res) => {
    try {
        const { department } = req.params;
        console.log('🔍 Fetching employees by department:', department);
        
        let query = supabase
            .from('employees')
            .select(`
                *,
                profiles!employees_reporting_manager_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                teams (
                    id,
                    name
                )
            `)
            .eq('department', department)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        
        // Filter by organization if user is not super admin
        if (req.user.role !== 'super_admin') {
            query = query.eq('organization_id', req.user.organization_id);
        }
        
        const { data: employees, error } = await query;
        
        if (error) {
            console.error('❌ Error fetching employees by department:', error);
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }
        
        console.log('✅ Employees by department fetched:', employees.length);
        res.json(employees);
        
    } catch (error) {
        console.error('❌ Error in GET /employees/department/:department:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 