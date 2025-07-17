// Global redirect: Force any /app redirects to /dashboard
(function() {
    // Check current URL
    if (window.location.pathname === '/app') {
        console.log('🚫 BLOCKED: Attempted to access /app - redirecting to /dashboard');
        window.location.replace('/dashboard');
        return;
    }
    
    // Intercept any future redirects to /app
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: pushState to /app - redirecting to /dashboard');
            return originalPushState.call(this, args[0], args[1], '/dashboard');
        }
        return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: replaceState to /app - redirecting to /dashboard');
            return originalReplaceState.call(this, args[0], args[1], '/dashboard');
        }
        return originalReplaceState.apply(this, args);
    };
    
    // Intercept window.location changes
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    
    window.location.assign = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.assign to /app - redirecting to /dashboard');
            return originalAssign.call(this, '/dashboard');
        }
        return originalAssign.apply(this, arguments);
    };
    
    window.location.replace = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.replace to /app - redirecting to /dashboard');
            return originalReplace.call(this, '/dashboard');
        }
        return originalReplace.apply(this, arguments);
    };
    
    Object.defineProperty(window.location, 'href', {
        set: function(url) {
            if (url && url.includes('/app')) {
                console.log('🚫 BLOCKED: location.href to /app - redirecting to /dashboard');
                return originalHref.set.call(this, '/dashboard');
            }
            return originalHref.set.call(this, url);
        },
        get: originalHref.get
    });
})();

// Login form functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.querySelector('.login-btn');
            
            // Clear previous errors
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
            
            // Show loading state
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            loginBtn.disabled = true;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userEmail', data.userEmail);
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                    setTimeout(() => { window.location.replace('/dashboard'); }, 1000); // Fallback in case of cache issues
                } else {
                    throw new Error(data.message || 'Login failed');
                }
            } catch (error) {
                errorMessage.textContent = error.message || 'An error occurred during login';
                errorMessage.style.display = 'block';
            } finally {
                // Reset button state
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                loginBtn.disabled = false;
            }
        });
    }
}); 