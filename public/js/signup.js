// Global redirect: Force any /app redirects to /dashboard
(function() {
    // Check current URL
    if (window.location.pathname === '/app') {
        console.log('🚫 BLOCKED: Attempted to access /app - redirecting to /');
        window.location.replace('/');
        return;
    }
    
    // Intercept any future redirects to /app
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: pushState to /app - redirecting to /');
            return originalPushState.call(this, args[0], args[1], '/');
        }
        return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: replaceState to /app - redirecting to /');
            return originalReplaceState.call(this, args[0], args[1], '/');
        }
        return originalReplaceState.apply(this, args);
    };
    
    // Intercept window.location changes
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    
    window.location.assign = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.assign to /app - redirecting to /');
            return originalAssign.call(this, '/');
        }
        return originalAssign.apply(this, arguments);
    };
    
    window.location.replace = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.replace to /app - redirecting to /');
            return originalReplace.call(this, '/');
        }
        return originalReplace.apply(this, arguments);
    };
    
    Object.defineProperty(window.location, 'href', {
        set: function(url) {
            if (url && url.includes('/app')) {
                console.log('🚫 BLOCKED: location.href to /app - redirecting to /');
                return originalHref.set.call(this, '/');
            }
            return originalHref.set.call(this, url);
        },
        get: originalHref.get
    });
})();

// Signup form functionality
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const inviteCode = document.getElementById('inviteCode').value;
            const signupBtn = document.querySelector('.signup-btn');
            
            // Clear previous errors
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
            
            // Validate passwords match
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Show loading state
            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            signupBtn.disabled = true;
            
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        firstName, 
                        lastName, 
                        email, 
                        password, 
                        inviteCode 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userEmail', data.userEmail);
                    
                    // Redirect to main app (root)
                    window.location.href = '/';
                    setTimeout(() => { window.location.replace('/'); }, 1000); // Fallback in case of cache issues
                } else {
                    throw new Error(data.message || 'Signup failed');
                }
            } catch (error) {
                errorMessage.textContent = error.message || 'An error occurred during signup';
                errorMessage.style.display = 'block';
            } finally {
                // Reset button state
                signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                signupBtn.disabled = false;
            }
        });
    }
}); 