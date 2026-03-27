/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: public/js/modules/organization/ColorPicker.js */

(function() {
    class ColorPicker {
        constructor() {
            this.modal = null;
            this.resolvePromise = null;
            
            // 20 Enterprise 'Matte' Presets (Midnight Luxe stijl)
            this.presets = [
                '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                '#ec4899', '#f43f5e', '#64748b', '#78716c', '#000000'
            ];
            
            this.init();
        }

        init() {
            if (document.getElementById('modal-color-picker')) return;

            this.modal = document.createElement('div');
            this.modal.id = 'modal-color-picker';
            this.modal.className = 'modal-overlay';
            // FIX: Absolute controle over de voorgrond. 
            this.modal.style.zIndex = '2147483647'; 
            
            let gridHtml = '';
            this.presets.forEach(color => {
                gridHtml += `<div class="color-swatch-item" data-color="${color}" style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s, border-color 0.2s;"></div>`;
            });

            this.modal.innerHTML = `
                <div class="modal-box" style="width: 340px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Kleur Markering</h3>
                        <button class="btn-close-picker" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); transition: color 0.2s;">&times;</button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; justify-items: center; margin-bottom: 24px;">
                        ${gridHtml}
                    </div>
                    
                    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px;">
                        <div style="position:relative; width: 42px; height: 42px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-dropdown); box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                            <input type="color" id="custom-color-input" style="position:absolute; top:-10px; left:-10px; width: 62px; height: 62px; cursor: pointer; border:none; padding:0;">
                        </div>
                        <input type="text" id="custom-color-hex" placeholder="#HEXCODE" maxlength="7" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.05); color: var(--text-main); font-family: monospace; font-size: 1rem; text-transform: uppercase; outline: none; transition: border-color 0.2s;">
                    </div>

                    <button id="btn-reset-color" class="btn-modal btn-secondary" style="width: 100%; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; font-weight: 600;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        Geen Kleur (Reset)
                    </button>
                </div>
            `;

            document.body.appendChild(this.modal);
            this.attachEvents();
        }

        attachEvents() {
            // Sluiten
            const closeBtn = this.modal.querySelector('.btn-close-picker');
            closeBtn.addEventListener('click', () => this.close(null));
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'var(--error)');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'var(--text-muted)');
            
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close(null);
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.classList.contains('visible')) {
                    this.close(null);
                }
            });

            // Presets aanklikken
            this.modal.querySelectorAll('.color-swatch-item').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    this.close(swatch.dataset.color);
                });
                swatch.addEventListener('mouseenter', () => swatch.style.transform = 'scale(1.15)');
                swatch.addEventListener('mouseleave', () => swatch.style.transform = 'scale(1)');
            });

            // Custom Hex Logic
            const customInput = this.modal.querySelector('#custom-color-input');
            const customHex = this.modal.querySelector('#custom-color-hex');

            // Focus styling
            customHex.addEventListener('focus', () => customHex.style.borderColor = 'var(--primary)');
            customHex.addEventListener('blur', () => customHex.style.borderColor = 'var(--border-dropdown)');

            customInput.addEventListener('input', (e) => {
                customHex.value = e.target.value.toUpperCase();
            });

            customInput.addEventListener('change', (e) => {
                this.close(e.target.value);
            });

            customHex.addEventListener('keyup', (e) => {
                let val = customHex.value;
                if (val && !val.startsWith('#')) {
                    val = '#' + val;
                    customHex.value = val;
                }

                if (e.key === 'Enter') {
                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                        this.close(val);
                    } else {
                        if (window.ModalService) window.ModalService.alert('Fout', 'Ongeldige Hex code. Gebruik het formaat #FF0000.');
                    }
                }
            });

            // Reset (Geen kleur)
            this.modal.querySelector('#btn-reset-color').addEventListener('click', () => {
                this.close('none');
            });
        }

        async show(currentColor = 'none') {
            return new Promise((resolve) => {
                this.resolvePromise = resolve;
                
                // Reset de inputs naar de huidige kleur (of blauw als er geen was)
                const customInput = this.modal.querySelector('#custom-color-input');
                const customHex = this.modal.querySelector('#custom-color-hex');
                
                const validHex = (currentColor !== 'none' && currentColor) ? currentColor : '#2563EB';
                customInput.value = validHex;
                customHex.value = currentColor !== 'none' ? currentColor.toUpperCase() : '';

                // Oplichten van de actieve preset
                this.modal.querySelectorAll('.color-swatch-item').forEach(swatch => {
                    if (currentColor && swatch.dataset.color.toLowerCase() === currentColor.toLowerCase()) {
                        swatch.style.borderColor = 'var(--text-main)';
                        swatch.style.transform = 'scale(1.1)';
                    } else {
                        swatch.style.borderColor = 'transparent';
                        swatch.style.transform = 'scale(1)';
                    }
                });

                this.modal.classList.add('visible');
            });
        }

        close(color) {
            this.modal.classList.remove('visible');
            if (this.resolvePromise) {
                this.resolvePromise(color);
                this.resolvePromise = null;
            }
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.colorPicker = new ColorPicker();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();