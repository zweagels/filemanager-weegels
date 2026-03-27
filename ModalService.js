/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: public/js/core/ModalService.js */

(function() {
    console.log('ModalService aan het laden...');

    class ModalServiceClass {
        constructor() {
            // FASE 1: De hardcoded CSS-injectie is hier verwijderd. 
            // Styling (Anti-Glas & Apple-look) wordt nu correct en centraal afgehandeld via variables.css en modals.css.

            if (!document.getElementById('modal-root')) {
                const root = document.createElement('div');
                root.id = 'modal-root';
                document.body.appendChild(root);
            }
            this.root = document.getElementById('modal-root');
            this.baseZIndex = 100050; 
        }

        isOpen() {
            return document.querySelectorAll('.modal-overlay.visible').length > 0;
        }

        _createTemplate(title, content, type = 'alert', options = {}) {
            this.baseZIndex += 10; 

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = this.baseZIndex; 
            
            let buttonsHtml = '';
            if (type === 'alert') {
                buttonsHtml = `<button class="btn-modal btn-primary" data-action="confirm">OK</button>`;
            } else if (type === 'confirm') {
                const yesText = options.yesText || 'Ja, doorgaan';
                const noText = options.noText || 'Annuleren';
                const btnClass = options.danger ? 'btn-danger' : 'btn-primary';
                
                buttonsHtml = `
                    <button class="btn-modal btn-secondary" data-action="cancel">${noText}</button>
                    <button class="btn-modal ${btnClass}" data-action="confirm">${yesText}</button>
                `;
            } else if (type === 'prompt') {
                const placeholder = options.placeholder || '';
                const val = options.value || '';
                buttonsHtml = `
                    <button class="btn-modal btn-secondary" data-action="cancel">Annuleren</button>
                    <button class="btn-modal btn-primary" data-action="confirm">Opslaan</button>
                `;
                content += `<div style="margin-top: 15px;"><input type="text" id="modal-prompt-input" class="modal-input" placeholder="${placeholder}" value="${val}" style="width: 100%; box-sizing: border-box;"></div>`;
            }

            overlay.innerHTML = `
                <div class="modal-box">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="btn-close" data-action="cancel">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${content}</p>
                    </div>
                    <div class="modal-footer">
                        ${buttonsHtml}
                    </div>
                </div>
            `;
            
            return overlay;
        }

        _show(title, content, type, options = {}) {
            return new Promise((resolve) => {
                const modal = this._createTemplate(title, content, type, options);
                this.root.appendChild(modal);
                
                // Forceer een reflow voor de CSS animatie (als die er is)
                void modal.offsetWidth;
                modal.classList.add('visible');
                
                const input = modal.querySelector('#modal-prompt-input');
                if (input) {
                    setTimeout(() => { input.focus(); input.select(); }, 50);
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') confirmBtn.click();
                    });
                }
                
                const close = (result) => {
                    modal.classList.remove('visible');
                    setTimeout(() => {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                        resolve(result);
                    }, 300);
                };
                
                const confirmBtn = modal.querySelector('[data-action="confirm"]');
                const cancelBtns = modal.querySelectorAll('[data-action="cancel"]');
                
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', () => {
                        if (type === 'prompt') close(input.value);
                        else close(true);
                    });
                }
                
                cancelBtns.forEach(btn => btn.addEventListener('click', () => close(type === 'prompt' ? null : false)));
                
                modal.addEventListener('mousedown', (e) => {
                    if (e.target === modal) close(type === 'prompt' ? null : false);
                });
                
                const escHandler = (e) => {
                    if(e.key === 'Escape') {
                        document.removeEventListener('keydown', escHandler);
                        close(type === 'prompt' ? null : false);
                    }
                };
                
                document.addEventListener('keydown', escHandler);
            });
        }

        alert(title, message) { return this._show(title, message, 'alert'); }
        confirm(title, message, options = {}) { return this._show(title, message, 'confirm', options); }
        prompt(title, message, defaultValue = '', placeholder = '') { return this._show(title, message, 'prompt', { value: defaultValue, placeholder }); }
    }

    window.ModalService = new ModalServiceClass();
    console.log('ModalService geladen (Schoon, styling gedelegeerd naar CSS)');
})();