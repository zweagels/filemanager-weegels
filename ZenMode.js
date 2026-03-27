/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/ZenMode.js */

(function() {
    class ZenMode {
        constructor() {
            this.initListeners();
        }

        initListeners() {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('#btn-zen-mode') || e.target.closest('#btn-zen-exit');
                if (btn) {
                    e.preventDefault();
                    this.toggleZenMode();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }
                
                // Toggle AAN/UIT met Alt+Z
                if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
                    e.preventDefault();
                    this.toggleZenMode();
                }
                
                // Toggle UIT met Escape (Alleen als Zen Mode actief is)
                if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) {
                    e.preventDefault();
                    this.toggleZenMode();
                }
            });
        }

        toggleZenMode() {
            document.body.classList.toggle('zen-mode');
            const isZen = document.body.classList.contains('zen-mode');
            
            let exitBtn = document.getElementById('btn-zen-exit');
            
            if (isZen) {
                if (!exitBtn) {
                    exitBtn = document.createElement('button');
                    exitBtn.id = 'btn-zen-exit';
                    exitBtn.className = 'floating-zen-exit';
                    
                    // Schone HTML (Styling wordt nu veilig door structure.css beheerd!)
                    exitBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
                    exitBtn.title = "Exit Zen Mode (Esc)";
                    document.body.appendChild(exitBtn);
                }
                exitBtn.style.display = 'flex';
                if (window.EventBus) window.EventBus.emit('notify:info', 'Zen Mode geactiveerd. Druk op Escape of Alt+Z om te verlaten.');
            } else {
                if (exitBtn) exitBtn.style.display = 'none';
            }
            
            // Forceer een resize event voor libraries zoals MasonryLayout die opnieuw moeten berekenen
            setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.zenMode = new ZenMode();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();