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
                // Clear any previous user data to prevent conflicts
                localStorage.removeItem('user');
                localStorage.removeItem('userEmail');
                
                // Store new token and user data
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('userEmail', data.user.email);
                } else {
                    localStorage.setItem('userEmail', data.userEmail);
                }
                
                // ✅ Redirect to dashboard
                window.location.href = '/dashboard';
                setTimeout(() => { window.location.replace('/dashboard'); }, 1000); // Fallback
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
