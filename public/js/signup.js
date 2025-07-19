

// Signup Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initPasswordToggles();
    initPasswordStrength();
    initFormHandling();
    initAnimations();
    initSocialSignup();
});

// Password toggle functionality
function initPasswordToggles() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    
    // Password toggle
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Update icon
            const toggleIcon = passwordToggle.querySelector('i');
            toggleIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
    
    // Confirm password toggle
    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            // Update icon
            const toggleIcon = confirmPasswordToggle.querySelector('i');
            toggleIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
}

// Password strength indicator
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', function() {
            const strength = getPasswordStrength(this.value);
            updatePasswordStrengthIndicator(strength, strengthFill, strengthText);
        });
    }
}

function getPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) {
        strength++;
        feedback.push('At least 8 characters');
    }
    if (/[a-z]/.test(password)) {
        strength++;
        feedback.push('Lowercase letter');
    }
    if (/[A-Z]/.test(password)) {
        strength++;
        feedback.push('Uppercase letter');
    }
    if (/[0-9]/.test(password)) {
        strength++;
        feedback.push('Number');
    }
    if (/[^A-Za-z0-9]/.test(password)) {
        strength++;
        feedback.push('Special character');
    }
    
    return { score: strength, feedback: feedback };
}

function updatePasswordStrengthIndicator(strength, strengthFill, strengthText) {
    const score = strength.score;
    
    // Remove all classes
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    if (score === 0) {
        strengthFill.style.width = '0%';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#6b7280';
    } else if (score <= 2) {
        strengthFill.className = 'strength-fill weak';
        strengthText.className = 'strength-text weak';
        strengthText.textContent = 'Weak password';
    } else if (score <= 3) {
        strengthFill.className = 'strength-fill fair';
        strengthText.className = 'strength-text fair';
        strengthText.textContent = 'Fair password';
    } else if (score <= 4) {
        strengthFill.className = 'strength-fill good';
        strengthText.className = 'strength-text good';
        strengthText.textContent = 'Good password';
    } else {
        strengthFill.className = 'strength-fill strong';
        strengthText.className = 'strength-text strong';
        strengthText.textContent = 'Strong password';
    }
}

// Form handling
function initFormHandling() {
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            const marketingEmails = document.getElementById('marketingEmails').checked;
            
            // Validate form
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            if (password.length < 8) {
                showNotification('Password must be at least 8 characters long.', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match.', 'error');
                return;
            }
            
            const passwordStrength = getPasswordStrength(password);
            if (passwordStrength.score < 3) {
                showNotification('Please choose a stronger password.', 'error');
                return;
            }
            
            if (!agreeTerms) {
                showNotification('You must agree to the Terms of Service and Privacy Policy.', 'error');
                return;
            }
            
            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            try {
                // Make API call
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
                        marketingEmails
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showNotification('Account created successfully! Redirecting to dashboard...', 'success');
                    
                    // Store any provided token
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }
                    
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                    
                } else {
                    // Handle specific error messages
                    let errorMessage = 'Signup failed. Please try again.';
                    
                    if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    }
                    
                    showNotification(errorMessage, 'error');
                }
                
            } catch (error) {
                console.error('Signup error:', error);
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
    const formElements = document.querySelectorAll('.form-group, .form-options, .btn, .divider, .social-signup, .login-link, .back-to-home');
    
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
    const brandingElements = document.querySelectorAll('.logo, .branding-title, .branding-subtitle, .benefit-item, .stats');
    
    brandingElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateX(-30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        }, 200 + (index * 150));
    });
    
    // Add hover effects to benefit items
    const benefitItems = document.querySelectorAll('.benefit-item');
    benefitItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });
    
    // Animate stats numbers
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent.replace(/[^\d]/g, ''));
        animateNumber(stat, target);
    });
}

function animateNumber(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + (element.textContent.includes('+') ? '+' : '') + (element.textContent.includes('%') ? '%' : '');
    }, 30);
}

// Social signup functionality
function initSocialSignup() {
    const googleBtn = document.querySelector('.btn-google');
    const microsoftBtn = document.querySelector('.btn-microsoft');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Google signup coming soon!', 'info');
        });
    }
    
    if (microsoftBtn) {
        microsoftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Microsoft signup coming soon!', 'info');
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
    
    .notification.info {
        border-left-color: #3b82f6;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification.success .notification-content i {
        color: #10b981;
    }
    
    .notification.error .notification-content i {
        color: #ef4444;
    }
    
    .notification.warning .notification-content i {
        color: #f59e0b;
    }
    
    .notification.info .notification-content i {
        color: #3b82f6;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 1rem;
        transition: color 0.3s ease;
        padding: 4px;
    }
    
    .notification-close:hover {
        color: #6b7280;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Real-time validation
function initRealTimeValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    const name = input.name;
    
    // Clear previous errors
    clearFieldError(input);
    
    // Validate based on field type
    if (type === 'email' && value && !isValidEmail(value)) {
        showFieldError(input, 'Please enter a valid email address');
        return false;
    }
    
    if (name === 'password' && value && value.length < 8) {
        showFieldError(input, 'Password must be at least 8 characters long');
        return false;
    }
    
    if (name === 'confirmPassword' && value) {
        const password = document.getElementById('password').value;
        if (value !== password) {
            showFieldError(input, 'Passwords do not match');
            return false;
        }
    }
    
    return true;
}

function showFieldError(input, message) {
    // Remove existing error
    clearFieldError(input);
    
    // Create error element
    const error = document.createElement('div');
    error.className = 'field-error';
    error.textContent = message;
    error.style.cssText = `
        color: #ef4444;
        font-size: 0.75rem;
        margin-top: 4px;
        animation: slideIn 0.3s ease;
    `;
    
    input.parentNode.appendChild(error);
    input.style.borderColor = '#ef4444';
}

function clearFieldError(input) {
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    if (input.style.borderColor === 'rgb(239, 68, 68)') {
        input.style.borderColor = '#e5e7eb';
    }
}

// Add slide-in animation
const slideInStyles = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

// Inject slide-in styles
const slideInStyleSheet = document.createElement('style');
slideInStyleSheet.textContent = slideInStyles;
document.head.appendChild(slideInStyleSheet);

// Initialize real-time validation
initRealTimeValidation();

// Auto-focus first name input
document.addEventListener('DOMContentLoaded', function() {
    const firstNameInput = document.getElementById('firstName');
    if (firstNameInput) {
        firstNameInput.focus();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.reset();
            document.getElementById('firstName').focus();
        }
    }
}); 