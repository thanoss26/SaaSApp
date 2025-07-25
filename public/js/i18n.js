// i18next configuration with fallback
(function() {
    'use strict';

    // Check if i18next is already available (from CDN or other sources)
    if (typeof i18next === 'undefined') {
        console.log('i18next not available, using fallback...');
        
        // Create a simple fallback
        window.i18next = {
            language: 'en',
            languages: ['en'],
            
            t: function(key, options = {}) {
                const translations = {
                    'common.loading': 'Loading...',
                    'common.error': 'Error',
                    'common.success': 'Success',
                    'common.cancel': 'Cancel',
                    'common.save': 'Save',
                    'common.delete': 'Delete',
                    'common.edit': 'Edit',
                    'common.close': 'Close'
                };
                return translations[key] || key;
            },
            
            changeLanguage: function(lang) {
                this.language = lang;
                localStorage.setItem('i18nextLng', lang);
                return Promise.resolve();
            },
            
            init: function(options) {
                const savedLang = localStorage.getItem('i18nextLng') || 'en';
                this.language = savedLang;
                return Promise.resolve();
            }
        };
    }

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