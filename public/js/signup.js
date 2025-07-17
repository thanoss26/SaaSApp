

// Signup form functionality
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const firstNameEl = document.getElementById('firstName');
            const lastNameEl = document.getElementById('lastName');
            const emailEl = document.getElementById('email');
            const passwordEl = document.getElementById('password');
            const confirmPasswordEl = document.getElementById('confirmPassword');
            
            // Check if all elements exist
            if (!firstNameEl || !lastNameEl || !emailEl || !passwordEl || !confirmPasswordEl) {
                console.error('Form elements not found:', {
                    firstName: !!firstNameEl,
                    lastName: !!lastNameEl,
                    email: !!emailEl,
                    password: !!passwordEl,
                    confirmPassword: !!confirmPasswordEl
                });
                errorMessage.textContent = 'Form not properly loaded. Please refresh the page.';
                errorMessage.style.display = 'block';
                return;
            }
            
            const firstName = firstNameEl.value;
            const lastName = lastNameEl.value;
            const email = emailEl.value;
            const password = passwordEl.value;
            const confirmPassword = confirmPasswordEl.value;
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
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        first_name: firstName, 
                        last_name: lastName, 
                        email, 
                        password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userEmail', data.userEmail);
                    
                    // Redirect to dashboard
                                    window.location.href = '/dashboard';
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