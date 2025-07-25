// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initNavigation();
    initSmoothScrolling();
    initAnimations();
    initPricingToggle();
    initContactForm();
    initScrollEffects();
    
    // Wait for global language switcher to be ready
    if (window.i18next && window.i18next.ready) {
        window.i18next.ready.then(() => {
            console.log('i18next ready, initializing language switcher...');
            initLanguageSwitcher();
        });
    } else {
        // Fallback if i18next is not available
        setTimeout(() => {
            console.log('i18next not available, initializing language switcher with fallback...');
            initLanguageSwitcher();
        }, 1000);
    }
});

// Navigation functionality
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Intersection Observer for animations
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .pricing-card, .contact-item');
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

// Pricing toggle functionality
function initPricingToggle() {
    const toggle = document.getElementById('billingToggle');
    let subscriptionPlans = null;
    let isLoading = false;
    let lastLoadTime = 0;
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    // Show loading state initially
    function showLoadingState() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        pricingCards.forEach((card, index) => {
            const priceElement = card.querySelector('.amount');
            const periodElement = card.querySelector('.period');
            const currencyElement = card.querySelector('.currency');
            
            if (priceElement && periodElement && currencyElement) {
                priceElement.textContent = '...';
                periodElement.textContent = '';
                currencyElement.textContent = '';
            }
        });
    }
    
    // Load subscription plans from API with caching
    async function loadSubscriptionPlans(forceRefresh = false) {
        // Prevent duplicate requests
        if (isLoading) {
            console.log('⏳ Request already in progress, skipping...');
            return;
        }
        
        // Check cache duration
        const now = Date.now();
        if (!forceRefresh && subscriptionPlans && (now - lastLoadTime) < CACHE_DURATION) {
            console.log('⚡ Using cached subscription plans');
            updatePricingDisplay(false);
            return;
        }
        
        isLoading = true;
        
        try {
            console.log('🔄 Loading subscription plans from API...');
            const url = forceRefresh ? '/api/subscriptions/plans?refresh=true' : '/api/subscriptions/plans';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.plans && data.plans.length > 0) {
                subscriptionPlans = data.plans;
                // Make plans globally accessible
                window.subscriptionPlans = subscriptionPlans;
                lastLoadTime = now;
                console.log('✅ Subscription plans loaded from API:', subscriptionPlans);
            } else {
                throw new Error('API returned no plans');
            }
            updatePricingDisplay(false); // Start with monthly
        } catch (error) {
            console.log('⚠️ API not available:', error.message);
            // Don't use fallback data, keep loading state
            showLoadingState();
        } finally {
            isLoading = false;
        }
    }
    
    // Force refresh subscription plans
    async function forceRefreshPlans() {
        console.log('🔄 Force refreshing subscription plans...');
        await loadSubscriptionPlans(true);
    }
    
    // Update pricing display based on billing period
    function updatePricingDisplay(isAnnual) {
        if (!window.subscriptionPlans || !Array.isArray(window.subscriptionPlans)) {
            console.log('⚠️ No subscription plans available for display');
            return;
        }
        
        console.log('🔄 Updating pricing display with plans:', window.subscriptionPlans);
        
        window.subscriptionPlans.forEach(plan => {
            const card = document.querySelector(`.pricing-card[data-plan="${plan.id}"]`);
            if (!card) {
                console.log(`⚠️ No card found for plan: ${plan.id}`);
                return;
            }
            
            const price = isAnnual ? plan.annual : plan.monthly;
            console.log(`📊 Updating ${plan.id} plan with price:`, price);
            
            // Update price display
            const priceElem = card.querySelector('.price');
            if (priceElem) {
                if (plan.id === 'free') {
                    // For Free plan, show "Free" text
                    priceElem.innerHTML = `<span class="amount">Free</span>`;
                } else {
                    // For paid plans, show the amount and interval
                    const currency = price.currency === 'eur' ? '€' : '$';
                    const interval = price.interval === 'month' ? 'month' : 'year';
                    priceElem.innerHTML = `<span class="currency">${currency}</span><span class="amount">${price.amount}</span><span class="period">/${interval}</span>`;
                }
            }
            
            // Update displayPrice if present
            const displayPriceElem = card.querySelector('.display-price');
            if (displayPriceElem && price.displayPrice) {
                displayPriceElem.textContent = price.displayPrice;
            }
        });
    }
    
    // Initialize pricing toggle
    if (toggle) {
        // Show loading state immediately
        showLoadingState();
        
        toggle.addEventListener('change', function() {
            updatePricingDisplay(this.checked);
        });
        
        // Load plans immediately
        loadSubscriptionPlans();
    }
    
    // Expose refresh function globally for testing
    window.refreshPricing = forceRefreshPlans;
    
    // Initialize subscription buttons
    initSubscriptionButtons();
}

// Initialize subscription buttons
function initSubscriptionButtons() {
    const subscribeButtons = document.querySelectorAll('.subscribe-btn');
    
    subscribeButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const plan = this.getAttribute('data-plan');
            const isAnnual = document.getElementById('billingToggle')?.checked || false;
            
            console.log('🛒 Starting subscription for:', plan, isAnnual ? 'annual' : 'monthly');
            
            // Handle free tier differently
            if (plan === 'free') {
                console.log('🎉 Free tier selected, redirecting to signup');
                window.location.href = '/signup.html?plan=free';
                return;
            }
            
            // Check if user is authenticated
            const token = localStorage.getItem('supabase.auth.token');
            if (!token) {
                console.log('❌ User not authenticated, redirecting to login');
                window.location.href = '/login.html';
                return;
            }
            
            try {
                // Use cached plans if available, otherwise fetch
                let planData;
                if (window.subscriptionPlans) {
                    planData = window.subscriptionPlans.find(p => p.id === plan);
                }
                
                if (!planData) {
                    console.log('📋 Fetching plans for subscription...');
                    const response = await fetch('/api/subscriptions/plans');
                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error('Failed to fetch subscription plans');
                    }
                    
                    planData = data.plans.find(p => p.id === plan);
                    if (!planData) {
                        throw new Error('Plan not found');
                    }
                }
                
                const priceId = isAnnual ? planData.annual.priceId : planData.monthly.priceId;
                
                // Create checkout session
                const checkoutResponse = await fetch('/api/subscriptions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        priceId: priceId,
                        successUrl: `${window.location.origin}/dashboard.html?subscription=success`,
                        cancelUrl: `${window.location.origin}/landing.html`
                    })
                });
                
                const checkoutData = await checkoutResponse.json();
                
                if (checkoutData.success && checkoutData.url) {
                    // Redirect to Stripe checkout
                    window.location.href = checkoutData.url;
                } else {
                    throw new Error('Failed to create checkout session');
                }
                
            } catch (error) {
                console.error('❌ Error starting subscription:', error);
                showNotification('Failed to start subscription process. Please try again.', 'error');
            }
        });
    });
}

// Contact form handling
function initContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const data = {
                name: formData.get('name') || document.getElementById('name').value,
                email: formData.get('email') || document.getElementById('email').value,
                company: formData.get('company') || document.getElementById('company').value,
                message: formData.get('message') || document.getElementById('message').value
            };
            
            // Validate form
            if (!data.name || !data.email || !data.message) {
                showNotification('Please fill in all required fields.', 'error');
                return;
            }
            
            if (!isValidEmail(data.email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            // Simulate form submission
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                showNotification('Thank you! Your message has been sent successfully.', 'success');
                form.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
}

// Scroll effects
function initScrollEffects() {
    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-visual');
        
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.1}px)`;
        }
    });
    
    // Animate stats on scroll
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateNumbers(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
}


// Language switcher functionality
let languageSwitcherInitialized = false;

function initLanguageSwitcher() {
    if (languageSwitcherInitialized) {
        console.log('Language switcher already initialized, skipping...');
        return;
    }
    
    const languageBtn = document.getElementById('languageBtn');
    const languageDropdown = document.getElementById('languageDropdown');
    const currentLanguageSpan = document.getElementById('currentLanguage');
    
    console.log('Initializing language switcher...');
    console.log('languageBtn:', languageBtn);
    console.log('languageDropdown:', languageDropdown);
    console.log('currentLanguageSpan:', currentLanguageSpan);
    
    if (!languageBtn || !languageDropdown) {
        console.log('Language switcher elements not found');
        return;
    }
    
    // Check if button is disabled
    console.log('Button disabled:', languageBtn.disabled);
    console.log('Button type:', languageBtn.type);
    console.log('Button tabindex:', languageBtn.tabIndex);
    
    // Set initial language
    const savedLang = localStorage.getItem('i18nextLng') || 'en';
    updateLanguageButton(savedLang);
    
    // Toggle dropdown
    languageBtn.addEventListener('click', function(e) {
        console.log('Language button clicked!');
        e.stopPropagation();
        
        // Debug dropdown state
        console.log('Dropdown before toggle:', languageDropdown.classList.contains('show'));
        console.log('Dropdown position:', languageDropdown.getBoundingClientRect());
        console.log('Button position:', languageBtn.getBoundingClientRect());
        
        languageDropdown.classList.toggle('show');
        languageBtn.classList.toggle('active');
        
        // Debug dropdown state after toggle
        console.log('Dropdown after toggle:', languageDropdown.classList.contains('show'));
        console.log('Dropdown display:', window.getComputedStyle(languageDropdown).display);
        console.log('Dropdown visibility:', window.getComputedStyle(languageDropdown).visibility);
        console.log('Dropdown opacity:', window.getComputedStyle(languageDropdown).opacity);
        console.log('Dropdown position after toggle:', languageDropdown.getBoundingClientRect());
        console.log('Dropdown transform:', window.getComputedStyle(languageDropdown).transform);
        console.log('Dropdown z-index:', window.getComputedStyle(languageDropdown).zIndex);
    });
    
    // Add a simple test click to see if the button is working
    languageBtn.addEventListener('mousedown', function(e) {
        console.log('Language button mousedown!');
    });
    
    languageBtn.addEventListener('mouseup', function(e) {
        console.log('Language button mouseup!');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
            languageDropdown.classList.remove('show');
            languageBtn.classList.remove('active');
        }
    });
    
    // Handle language selection
    const languageOptions = document.querySelectorAll('.language-option');
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            switchLanguage(lang);
            
            // Update UI
            languageDropdown.classList.remove('show');
            languageBtn.classList.remove('active');
            
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Set active language option
    languageOptions.forEach(option => {
        if (option.getAttribute('data-lang') === savedLang) {
            option.classList.add('active');
        }
    });
    
    languageSwitcherInitialized = true;
    console.log('Language switcher initialization complete');
}

function updateLanguageButton(lang) {
    const currentLanguageSpan = document.getElementById('currentLanguage');
    if (currentLanguageSpan) {
        currentLanguageSpan.textContent = lang.toUpperCase();
    }
}

function switchLanguage(lang) {
    if (window.changeLanguage) {
        window.changeLanguage(lang);
        updateLanguageButton(lang);
        localStorage.setItem('i18nextLng', lang);
    }
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
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

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

function animateNumbers(element) {
    const text = element.textContent.trim();
    
    // Check if the text contains special characters that shouldn't be animated
    if (text.includes('/') || text.includes('%') || text.includes('+') || text.includes('K')) {
        // Don't animate these special values, just return
        return;
    }
    
    // Extract the numeric part and any suffix
    const numericMatch = text.match(/^(\d+)(.*)$/);
    if (!numericMatch) {
        return; // No numeric content found
    }
    
    const target = parseInt(numericMatch[1]);
    const suffix = numericMatch[2] || '';
    
    let current = 0;
    const increment = target / 50;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 30);
}

// Add CSS for mobile navigation
const mobileNavStyles = `
    @media (max-width: 768px) {
        .nav-menu {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-100%);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .nav-menu.active {
            transform: translateY(0);
            opacity: 1;
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
    
    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
`;

// Inject mobile navigation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileNavStyles;
document.head.appendChild(styleSheet);

// Initialize all functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initSmoothScrolling();
    initAnimations();
    initPricingToggle();
    initContactForm();
    initScrollEffects();
    
    // Wait for i18next to be ready before initializing language switcher
    if (window.i18next && window.i18next.ready) {
        window.i18next.ready.then(() => {
            initLanguageSwitcher();
        });
    } else {
        // Fallback if i18next is not available
        setTimeout(() => {
            initLanguageSwitcher();
        }, 1000);
    }
}); 