/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: public/js/core/ThemeManager.js */

(function() {
    class ThemeManager {
        constructor() {
            this.themeKey = 'fm_theme_preference';
            
            this.currentTheme = localStorage.getItem(this.themeKey);
            if (!this.currentTheme) {
                this.currentTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            this.init();
        }

        init() {
            this.applyTheme(this.currentTheme);
            this.initListeners();
        }

        initListeners() {
            // FIX: Event Delegation. Knoppen werken altijd, ongeacht load volgorde!
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('#btn-theme-toggle');
                if (btn) {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });

            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (!localStorage.getItem(this.themeKey)) {
                        this.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        }

        toggleTheme() {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem(this.themeKey, this.currentTheme);
            this.applyTheme(this.currentTheme);
            
            if (window.EventBus) {
                window.EventBus.emit('theme:changed', this.currentTheme);
            }
        }

        applyTheme(themeName) {
            // FIX: Class wordt nu correct op de body gezet in plaats van html!
            const body = document.body;
            const btnToggle = document.getElementById('btn-theme-toggle');
            
            if (themeName === 'dark') {
                body.classList.add('theme-dark');
                if (btnToggle) {
                    btnToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
                    btnToggle.setAttribute('title', 'Schakel naar Light Mode');
                }
            } else {
                body.classList.remove('theme-dark');
                if (btnToggle) {
                    btnToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
                    btnToggle.setAttribute('title', 'Schakel naar Dark Mode');
                }
            }
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.themeManager = new ThemeManager();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();