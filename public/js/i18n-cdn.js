// i18next configuration for CDN
(function() {
    'use strict';

    // Wait for all required libraries to be loaded
    function initI18next() {
        if (typeof i18next === 'undefined' || 
            typeof i18nextHttpBackend === 'undefined' || 
            typeof i18nextBrowserLanguageDetector === 'undefined') {
            console.log('Waiting for i18next libraries to load...');
            setTimeout(initI18next, 100);
            return;
        }

        console.log('i18next libraries loaded, initializing...');

                // Initialize i18next
        i18next
            .use(i18nextHttpBackend)
            .use(i18nextBrowserLanguageDetector)
            .init({
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
        document.addEventListener('DOMContentLoaded', function() {
            // Set initial language from localStorage or default to English
            const savedLang = localStorage.getItem('i18nextLng') || 'en';
            i18next.changeLanguage(savedLang).then(() => {
                updatePageContent();
            });
        });
    }

    // Start initialization
    initI18next();

})(); 