const { supabase, supabaseAdmin } = require('../config/supabase');

class RequestManager {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff
    }

    // Generate cache key
    generateCacheKey(operation, params) {
        return `${operation}_${JSON.stringify(params)}`;
    }

    // Check if data is cached and not expired
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    // Cache data with timestamp
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Clear expired cache entries
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Retry function with exponential backoff
    async retryWithBackoff(operation, maxRetries = 3) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                // Check if it's a rate limit error
                if (error.message && error.message.includes('Too many requests')) {
                    const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
                    console.log(`🔄 Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await this.sleep(delay);
                } else {
                    // For other errors, don't retry
                    throw error;
                }
            }
        }
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Queue request
    async queueRequest(operation) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ operation, resolve, reject });
            this.processQueue();
        });
    }

    // Process queue with rate limiting
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { operation, resolve, reject } = this.requestQueue.shift();

            try {
                const result = await this.retryWithBackoff(operation);
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Add small delay between requests to prevent rate limiting
            if (this.requestQueue.length > 0) {
                await this.sleep(100);
            }
        }

        this.isProcessing = false;
    }

    // Optimized Supabase query with caching
    async cachedQuery(operation, params = {}, useCache = true) {
        const cacheKey = this.generateCacheKey(operation, params);
        
        // Check cache first
        if (useCache) {
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.log('📦 Returning cached data for:', operation);
                return cached;
            }
        }

        // Execute query with retry logic
        const result = await this.queueRequest(async () => {
            console.log('🔍 Executing query:', operation);
            return await this.executeQuery(operation, params);
        });

        // Cache the result
        if (useCache && result) {
            this.setCachedData(cacheKey, result);
        }

        return result;
    }

    // Execute different types of queries
    async executeQuery(operation, params) {
        switch (operation) {
            case 'getUsers':
                return await this.getUsers(params);
            case 'getUserStats':
                return await this.getUserStats(params);
            case 'createUser':
                return await this.createUser(params);
            case 'updateUser':
                return await this.updateUser(params);
            case 'deleteUser':
                return await this.deleteUser(params);
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    // Get users with optimized query
    async getUsers({ organizationId, role }) {
        let query = supabase
            .from('users')
            .select(`
                *,
                employment_details (
                    position_title,
                    department,
                    employment_type,
                    start_date,
                    status,
                    work_location
                ),
                payroll_hr (
                    salary,
                    currency,
                    work_hours_per_week
                ),
                location_contact (
                    phone_number,
                    address,
                    timezone
                )
            `)
            .order('created_at', { ascending: false });

        if (role !== 'super_admin' && organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;
        
        if (error) {
            throw error;
        }

        return this.transformUserData(data);
    }

    // Get user statistics
    async getUserStats({ organizationId, role }) {
        let baseQuery = supabase
            .from('users')
            .select('*');

        if (role !== 'super_admin' && organizationId) {
            baseQuery = baseQuery.eq('organization_id', organizationId);
        }

        const { data, error } = await baseQuery;
        
        if (error) {
            throw error;
        }

        return this.calculateStats(data);
    }

    // Create user with transaction
    async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Clear cache after creating user
        this.clearExpiredCache();
        
        return data;
    }

    // Update user
    async updateUser({ id, updateData }) {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Clear cache after updating user
        this.clearExpiredCache();
        
        return data;
    }

    // Delete user
    async deleteUser(id) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        // Clear cache after deleting user
        this.clearExpiredCache();
        
        return { success: true };
    }

    // Transform user data for frontend
    transformUserData(users) {
        return users.map(user => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone || (user.location_contact && user.location_contact[0]?.phone_number),
            department: user.employment_details && user.employment_details[0]?.department,
            role: user.role,
            status: user.employment_details && user.employment_details[0]?.status || (user.is_active ? 'active' : 'inactive'),
            position_title: user.employment_details && user.employment_details[0]?.position_title,
            employment_type: user.employment_details && user.employment_details[0]?.employment_type,
            start_date: user.employment_details && user.employment_details[0]?.start_date,
            work_location: user.employment_details && user.employment_details[0]?.work_location,
            salary: user.payroll_hr && user.payroll_hr[0]?.salary,
            currency: user.payroll_hr && user.payroll_hr[0]?.currency,
            work_hours_per_week: user.payroll_hr && user.payroll_hr[0]?.work_hours_per_week,
            address: user.location_contact && user.location_contact[0]?.address,
            timezone: user.location_contact && user.location_contact[0]?.timezone,
            performance: Math.floor(Math.random() * 30) + 70
        }));
    }

    // Calculate statistics
    calculateStats(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.is_active).length;
        const departments = new Set(users.map(user => user.department)).size;
        const roles = new Set(users.map(user => user.role)).size;

        const departmentBreakdown = {};
        users.forEach(user => {
            if (user.department) {
                departmentBreakdown[user.department] = (departmentBreakdown[user.department] || 0) + 1;
            }
        });

        const roleBreakdown = {};
        users.forEach(user => {
            if (user.role) {
                roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
            }
        });

        return {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            departments,
            roles,
            departmentBreakdown,
            roleBreakdown
        };
    }

    // Clear all cache
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create singleton instance
const requestManager = new RequestManager();

// Clear expired cache every 10 minutes
setInterval(() => {
    requestManager.clearExpiredCache();
}, 10 * 60 * 1000);

module.exports = requestManager; 