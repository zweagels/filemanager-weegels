/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/Trash.js */

(function() {
    class TrashManager {
        constructor() {
            this.injectStyles();
            this.initListeners();
        }

        injectStyles() {
            if (document.getElementById('trash-dynamic-styles')) return;
            const style = document.createElement('style');
            style.id = 'trash-dynamic-styles';
            style.innerHTML = `
                /* FASE 6/7: Crumple Animatie (Verfrommelen) */
                @keyframes crumple {
                    0% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0px); }
                    40% { transform: scale(0.8) rotate(-5deg); border-radius: 30px; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
                    100% { transform: scale(0) rotate(25deg) translateY(50px); opacity: 0; filter: blur(5px); }
                }
                .is-crumpling {
                    animation: crumple 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards !important;
                    pointer-events: none !important;
                    z-index: 100 !important;
                }

                /* FASE 6/7: Trash Flies (Vonkjes rond prullenbak/item) */
                @keyframes flyParticle {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
                }
                .trash-fly {
                    position: absolute;
                    width: 5px;
                    height: 5px;
                    background: var(--text-main);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 10000;
                    animation: flyParticle 0.6s ease-out forwards;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
            `;
            document.head.appendChild(style);
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('trash:empty_trash', () => this.emptyTrash());
                window.EventBus.on('trash:restore_all', () => this.restoreAll());
                window.EventBus.on('trash:crumple', (el) => this.crumple(el));
                window.EventBus.on('trash:fly_effect', (data) => this.spawnFlies(data.x, data.y));
                window.EventBus.on('trash:update_status', (isEmpty) => this.updateIconStatus(isEmpty));
            }
        }

        crumple(element) {
            if (!element) return;
            element.classList.add('is-crumpling');
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            const centerY = rect.top + (rect.height / 2);
            this.spawnFlies(centerX, centerY);
        }

        spawnFlies(x, y) {
            for (let i = 0; i < 6; i++) {
                const fly = document.createElement('div');
                fly.className = 'trash-fly';
                fly.style.left = `${x}px`;
                fly.style.top = `${y}px`;
                
                const tx = (Math.random() - 0.5) * 80;
                const ty = (Math.random() - 0.5) * 80 - 20; 
                fly.style.setProperty('--tx', `${tx}px`);
                fly.style.setProperty('--ty', `${ty}px`);
                
                document.body.appendChild(fly);
                
                setTimeout(() => fly.remove(), 600);
            }
        }

        async emptyTrash() {
            if (!window.ModalService) return;
            const agreed = await window.ModalService.confirm(
                'Prullenbak Legen', 
                'Weet je zeker dat je de prullenbak permanent wilt legen? Dit kan niet ongedaan worden gemaakt.', 
                { danger: true, yesText: 'Ja, permanent legen', noText: 'Annuleren' }
            );

            if (agreed) {
                try {
                    const tokenRes = await fetch('/api/csrf');
                    const tokenData = await tokenRes.json();
                    
                    const res = await fetch('/api/empty-trash', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csrf_token: tokenData.csrf_token })
                    });
                    
                    const data = await res.json();
                    if (data.status === 'success') {
                        if (window.EventBus) {
                            window.EventBus.emit('notify:success', 'Prullenbak is succesvol geleegd.');
                            window.EventBus.emit('view:refresh');
                            this.updateIconStatus(true);
                        }
                    } else {
                        throw new Error(data.message);
                    }
                } catch(e) {
                    if (window.EventBus) window.EventBus.emit('notify:error', e.message || 'Kon prullenbak niet legen.');
                }
            }
        }

        async restoreAll() {
            if (!window.ModalService) return;
            const agreed = await window.ModalService.confirm(
                'Alles Herstellen', 
                'Wil je alle bestanden en mappen terugplaatsen naar hun originele locatie?', 
                { yesText: 'Ja, alles herstellen', noText: 'Annuleren' }
            );

            if (agreed) {
                try {
                    const tokenRes = await fetch('/api/csrf');
                    const tokenData = await tokenRes.json();
                    
                    const res = await fetch('/api/restore-all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csrf_token: tokenData.csrf_token })
                    });
                    
                    const data = await res.json();
                    if (data.status === 'success') {
                        if (window.EventBus) {
                            window.EventBus.emit('notify:success', 'Alle items zijn hersteld.');
                            window.EventBus.emit('view:refresh');
                            this.updateIconStatus(true);
                        }
                    } else {
                        throw new Error(data.message);
                    }
                } catch(e) {
                    if (window.EventBus) window.EventBus.emit('notify:error', e.message || 'Kon items niet herstellen.');
                }
            }
        }

        async restoreItem(id, type) {
            try {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                
                const res = await fetch('/api/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, type, csrf_token: tokenData.csrf_token })
                });
                
                const data = await res.json();
                
                if (data.status === 'success') {
                    if (window.EventBus) {
                        window.EventBus.emit('notify:success', 'Item succesvol hersteld.');
                        window.EventBus.emit('view:refresh');
                    }
                } else if (data.status === 'parent_missing') {
                    if (window.ModalService) {
                        const action = await window.ModalService.confirm(
                            'Originele map ontbreekt', 
                            'De map waar dit bestand oorspronkelijk in stond is permanent verwijderd. Wil je de map opnieuw aanmaken of het bestand in Mijn Bestanden plaatsen?',
                            { yesText: 'Map opnieuw aanmaken', noText: 'Plaats in hoofdmap' }
                        );
                        
                        await fetch('/api/restore', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                id, 
                                type, 
                                recreate_parent: action === true,
                                restore_to_root: action === false,
                                csrf_token: tokenData.csrf_token 
                            })
                        });
                        
                        if (window.EventBus) {
                            window.EventBus.emit('notify:success', 'Item hersteld met aangepaste locatie.');
                            window.EventBus.emit('view:refresh');
                        }
                    }
                } else {
                    throw new Error(data.message);
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', e.message || 'Herstellen mislukt.');
            }
        }

        updateIconStatus(isEmpty) {
            const trashNav = document.querySelector('.nav-item[data-path="trash"] svg');
            if (trashNav) {
                if (isEmpty) {
                    trashNav.innerHTML = `<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>`;
                    trashNav.style.color = ''; 
                    trashNav.style.filter = 'none';
                } else {
                    trashNav.innerHTML = `<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>`;
                    trashNav.style.color = 'var(--error)'; 
                    trashNav.style.filter = 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.4))';
                }
            }
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.trashManager = new TrashManager();
    });
})();