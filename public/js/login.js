// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initPasswordToggle();
    initFormHandling();
    initAnimations();
    initSocialLogin();
});

// Password toggle functionality
function initPasswordToggle() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const toggleIcon = passwordToggle.querySelector('i');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Update icon
            toggleIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
}

// Form handling
function initFormHandling() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const rememberMe = document.getElementById('rememberMe');
            
            // Get form data
            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value,
                rememberMe: rememberMe.checked
            };
            
            // Validate form
            if (!formData.email || !formData.password) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }
            
            if (!isValidEmail(formData.email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            try {
                // Make API call
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token if provided - check both possible token fields
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('token', data.token); // Store in both locations for compatibility
                    } else if (data.access_token) {
                        localStorage.setItem('authToken', data.access_token);
                        localStorage.setItem('token', data.access_token);
                    }
                    
                    // Store remember me preference
                    if (formData.rememberMe) {
                        localStorage.setItem('rememberMe', 'true');
                    } else {
                        localStorage.removeItem('rememberMe');
                    }
                    
                    showNotification('Login successful! Redirecting...', 'success');
                    
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                    
                } else {
                    // Handle specific error messages
                    let errorMessage = 'Login failed. Please try again.';
                    
                    if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    }
                    
                    showNotification(errorMessage, 'error');
                }
                
            } catch (error) {
                console.error('Login error:', error);
                showNotification('Network error. Please check your connection and try again.', 'error');
            } finally {
                // Reset loading state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
}

// Animations
function initAnimations() {
    // Animate form elements on load
    const formElements = document.querySelectorAll('.form-group, .form-options, .btn, .divider, .social-login, .signup-link, .back-to-home');
    
    formElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
    
    // Animate branding elements
    const brandingElements = document.querySelectorAll('.logo, .branding-title, .branding-subtitle, .feature-item, .testimonial');
    
    brandingElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateX(-30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        }, 200 + (index * 150));
    });
    
    // Add hover effects to feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });
}

// Social login functionality
function initSocialLogin() {
    const googleBtn = document.querySelector('.btn-google');
    const microsoftBtn = document.querySelector('.btn-microsoft');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Google login coming soon!', 'info');
        });
    }
    
    if (microsoftBtn) {
        microsoftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Microsoft login coming soon!', 'info');
        });
    }
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Add notification styles
const notificationStyles = `
    .notification {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #10b981;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.error {
        border-left-color: #ef4444;
    }
    
    .notification.success {
        border-left-color: #10b981;
    }
    
    .notification.warning {
        border-left-color: #f59e0b;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.3s ease;
    }
    
    .notification-close:hover {
        color: #374151;
    }
`;

// Inject notification styles
if (!document.getElementById('notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'notification-styles';
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}

// Enhanced form validation
function enhanceFormValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            if (this.value && !isValidEmail(this.value)) {
                showFieldError(this, 'Please enter a valid email address');
            } else {
                removeFieldError(this);
            }
        });
        
        emailInput.addEventListener('input', function() {
            if (this.value && isValidEmail(this.value)) {
                removeFieldError(this);
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            if (this.value && this.value.length < 6) {
                showFieldError(this, 'Password must be at least 6 characters');
            } else {
                removeFieldError(this);
            }
        });
        
        passwordInput.addEventListener('input', function() {
            if (this.value && this.value.length >= 6) {
                removeFieldError(this);
            }
        });
    }
}

function showFieldError(input, message) {
    removeFieldError(input);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '0.75rem';
    errorDiv.style.marginTop = '4px';
    
    input.parentNode.appendChild(errorDiv);
    input.style.borderColor = '#ef4444';
}

function removeFieldError(input) {
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    input.style.borderColor = '#e5e7eb';
}

// Password strength indicator
function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
}

function updatePasswordStrengthIndicator(strength) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthFill || !strengthText) return;
    
    const strengthClasses = ['weak', 'fair', 'good', 'strong'];
    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
    
    strengthFill.className = `strength-fill ${strengthClasses[Math.min(strength - 1, 3)]}`;
    strengthText.className = `strength-text ${strengthClasses[Math.min(strength - 1, 3)]}`;
    strengthText.textContent = strengthLabels[Math.min(strength - 1, 3)];
}

// Initialize enhanced validation
document.addEventListener('DOMContentLoaded', function() {
    enhanceFormValidation();
});

// Auto-focus email input
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.focus();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
            document.getElementById('email').focus();
        }
    }
});
