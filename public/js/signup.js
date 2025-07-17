

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
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                    setTimeout(() => { window.location.replace('/dashboard'); }, 1000); // Fallback in case of cache issues
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