// i18next configuration for CDN with fallback
(function() {
    'use strict';

    // Create a simple i18next fallback if libraries are not available
    if (typeof i18next === 'undefined') {
        console.log('Creating i18next fallback...');
        
        // Simple i18next fallback implementation
        window.i18next = {
            language: 'en',
            languages: ['en'],
            
            // Simple translation function
            t: function(key, options = {}) {
                const translations = {
                    // Common translations
                    'common.loading': 'Loading...',
                    'common.error': 'Error',
                    'common.success': 'Success',
                    'common.cancel': 'Cancel',
                    'common.save': 'Save',
                    'common.delete': 'Delete',
                    'common.edit': 'Edit',
                    'common.close': 'Close',
                    
                    // Subscription translations
                    'subscriptions.title': 'Subscription Management',
                    'subscriptions.description': 'Manage your subscription plans and billing preferences',
                    'subscriptions.current_subscription': 'Current Subscription',
                    'subscriptions.available_plans': 'Available Plans',
                    'subscriptions.subscription_actions': 'Subscription Management',
                    'subscriptions.billing_cycle': 'Billing Cycle:',
                    'subscriptions.monthly': 'Monthly',
                    'subscriptions.annual': 'Annual',
                    'subscriptions.save_up_to': 'Save up to 17%',
                    'subscriptions.manage_billing': 'Manage Billing',
                    'subscriptions.download_invoices': 'Download Invoices',
                    'subscriptions.get_support': 'Get Support',
                    'subscriptions.no_subscription': 'No Active Subscription',
                    'subscriptions.no_subscription_desc': 'You currently don\'t have an active subscription. Choose a plan below to get started.',
                    'subscriptions.subscribe_to_plan': 'Subscribe to',
                    'subscriptions.subscribe_now': 'Subscribe Now',
                    'subscriptions.processing': 'Processing...',
                    'subscriptions.loading_plans': 'Loading plans...',
                    'subscriptions.loading_subscription': 'Loading subscription status...',
                    'subscriptions.failed_to_load_plans': 'Failed to load subscription plans',
                    'subscriptions.no_plans_available': 'No plans available',
                    'subscriptions.billing_portal_error': 'Failed to open billing portal',
                    'subscriptions.subscription_error': 'Failed to load subscription data',
                    
                    // Dashboard translations
                    'dashboard.title': 'Dashboard',
                    'dashboard.analytics': 'Analytics',
                    'dashboard.users': 'User Management',
                    'dashboard.payroll': 'Payroll',
                    'dashboard.organizations': 'Organizations',
                    'dashboard.settings': 'Settings',
                    'dashboard.subscription': 'Subscription',
                    'dashboard.mailbox': 'Mailbox',
                    'dashboard.logout': 'Log out'
                };
                
                return translations[key] || key;
            },
            
            // Change language function
            changeLanguage: function(lang) {
                this.language = lang;
                localStorage.setItem('i18nextLng', lang);
                return Promise.resolve();
            },
            
            // Initialize function
            init: function(options) {
                const savedLang = localStorage.getItem('i18nextLng') || 'en';
                this.language = savedLang;
                return Promise.resolve();
            }
        };
        
        // Update page content function
        window.updatePageContent = function() {
            // Update all elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    element.textContent = translation;
                }
            });

            // Update all elements with data-i18n-placeholder attribute
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    element.placeholder = translation;
                }
            });

            // Update all elements with data-i18n-title attribute
            document.querySelectorAll('[data-i18n-title]').forEach(element => {
                const key = element.getAttribute('data-i18n-title');
                const translation = i18next.t(key);
                if (translation && translation !== key) {
                    element.title = translation;
                }
            });

            // Trigger custom event for components that need to update
            document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: i18next.language } }));
        };
        
        // Language switcher functionality
        window.changeLanguage = function(lang) {
            i18next.changeLanguage(lang).then(() => {
                updatePageContent();
            });
        };
        
        console.log('✅ i18next fallback created successfully');
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                i18next.init();
                updatePageContent();
            });
        } else {
            i18next.init();
            updatePageContent();
        }
        
        return;
    }

    // If i18next is already available, just initialize it
    console.log('i18next already available, initializing...');
    
    // Initialize i18next
    i18next.init({
        debug: false,
        fallbackLng: 'en',
        supportedLngs: ['en', 'el'],
        ns: ['common', 'landing'],
        defaultNS: 'common',
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
        // Add error handling for missing files
        missingKeyHandler: function(lng, ns, key, fallbackValue) {
            console.warn(`Missing translation key: ${key} in namespace: ${ns} for language: ${lng}`);
            return fallbackValue;
        },
        // Ignore errors for missing files
        saveMissing: false,
        missingKeyNoValueFallbackToKey: true,
    });

    // Language switcher functionality
    window.changeLanguage = function(lang) {
        i18next.changeLanguage(lang).then(() => {
            localStorage.setItem('i18nextLng', lang);
            updatePageContent();
        });
    };

    // Update all page content when language changes
    function updatePageContent() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });

        // Update all elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
            }
        });

        // Update all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.title = translation;
            }
        });

        // Update page title
        const pageTitle = document.querySelector('title');
        if (pageTitle && pageTitle.getAttribute('data-i18n')) {
            const key = pageTitle.getAttribute('data-i18n');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                pageTitle.textContent = translation;
            }
        }

        // Trigger custom event for components that need to update
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: i18next.language } }));
    }

    // Export for use in other modules
    window.i18next = i18next;
    window.updatePageContent = updatePageContent;

    // Initialize language on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Set initial language from localStorage or default to English
            const savedLang = localStorage.getItem('i18nextLng') || 'en';
            i18next.changeLanguage(savedLang).then(() => {
                updatePageContent();
            });
        });
    } else {
        // Set initial language from localStorage or default to English
        const savedLang = localStorage.getItem('i18nextLng') || 'en';
        i18next.changeLanguage(savedLang).then(() => {
            updatePageContent();
        });
    }

})(); 