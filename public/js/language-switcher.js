// Language Switcher Component
class LanguageSwitcher {
    constructor() {
        this.currentLanguage = localStorage.getItem('i18nextLng') || 'en';
        this.init();
    }

    init() {
        this.createLanguageSwitcher();
        this.bindEvents();
    }

    createLanguageSwitcher() {
        // Create language switcher HTML
        const switcherHTML = `
            <div class="language-switcher">
                <button class="language-btn" id="language-btn">
                    <span class="language-icon">🌐</span>
                    <span class="current-lang">${this.currentLanguage === 'en' ? 'EN' : 'EL'}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
                <div class="language-dropdown" id="language-dropdown">
                    <div class="language-option" data-lang="en">
                        <span class="flag">🇺🇸</span>
                        <span class="lang-name">English</span>
                    </div>
                    <div class="language-option" data-lang="el">
                        <span class="flag">🇬🇷</span>
                        <span class="lang-name">Ελληνικά</span>
                    </div>
                </div>
            </div>
        `;

        // Insert into the top navigation
        const topNav = document.querySelector('.top-nav .nav-actions');
        if (topNav) {
            topNav.insertAdjacentHTML('beforeend', switcherHTML);
        }
    }

    bindEvents() {
        const languageBtn = document.getElementById('language-btn');
        const languageDropdown = document.getElementById('language-dropdown');
        const languageOptions = document.querySelectorAll('.language-option');

        if (languageBtn) {
            languageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                languageDropdown.classList.toggle('show');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (languageDropdown) {
                languageDropdown.classList.remove('show');
            }
        });

        // Handle language selection
        languageOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = option.getAttribute('data-lang');
                this.changeLanguage(lang);
                languageDropdown.classList.remove('show');
            });
        });
    }

    changeLanguage(lang) {
        if (window.changeLanguage) {
            window.changeLanguage(lang);
            this.currentLanguage = lang;
            this.updateLanguageButton();
        }
    }

    updateLanguageButton() {
        const currentLangSpan = document.querySelector('.current-lang');
        if (currentLangSpan) {
            currentLangSpan.textContent = this.currentLanguage === 'en' ? 'EN' : 'EL';
        }
    }
}

// Initialize language switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LanguageSwitcher();
}); 