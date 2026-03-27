/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/SlideshowOverview.js */

(function() {
    class SlideshowOverview {
        constructor() {
            this.containerId = 'file-view';
            this.slideshows = [];
            this.initListeners();
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('navigation:action', (action) => {
                    if (action === 'slideshows') this.render();
                });
                window.EventBus.on('navigation:navigate', (path) => {
                    if (path === 'slideshows') this.render();
                });
                
                window.EventBus.on('slideshow:refresh_overview', () => {
                    if (document.getElementById('slideshow-overview-container')) {
                        this.loadData();
                    }
                });
            }

            // Sluit custom dropdown menu's als er ergens anders op het scherm wordt geklikt
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.slideshow-context-menu') && !e.target.closest('.btn-slideshow-context')) {
                    document.querySelectorAll('.slideshow-context-menu.visible').forEach(menu => {
                        menu.classList.remove('visible');
                        menu.style.opacity = '0';
                        menu.style.visibility = 'hidden';
                        menu.style.transform = 'translateY(-10px)';
                    });
                }
            });
        }

        async render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel) {
                window.App.propertiesPanel.panel.classList.remove('visible');
            }
            const mainToolbar = document.getElementById('main-toolbar');
            if (mainToolbar) mainToolbar.style.display = 'none';

            container.innerHTML = `
                <div id="slideshow-overview-container" style="padding: 20px 30px; max-width: 1400px; margin: 0 auto; width: 100%; height: 100%; overflow-y: auto;" class="custom-scrollbar">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:15px; margin-bottom: 32px; border-bottom: 1px solid var(--border-dropdown); padding-bottom: 16px;">
                        <div>
                            <h1 style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0 0 8px 0; display:flex; align-items:center; gap:12px;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#F43F5E;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                Mijn Slideshows
                            </h1>
                            <p style="color: var(--text-muted); margin: 0; font-size: 0.95rem;">Beheer je presentaties, tv-schermen en statistieken.</p>
                        </div>
                        <button id="btn-create-slideshow" class="btn-primary" style="padding: 10px 20px; font-weight: 600; border-radius: 8px; display:flex; align-items:center; gap:8px; cursor:pointer; border:none; color:white; background:var(--primary);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Nieuwe Slideshow
                        </button>
                    </div>
                    <div id="slideshow-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; padding-bottom: 40px;">
                        <div style="display:flex; align-items:center; gap:12px; color:var(--text-muted);">
                            <div style="width:20px; height:20px; border:3px solid var(--border-dropdown); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite;"></div>
                            Gegevens ophalen...
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-create-slideshow').addEventListener('click', () => {
                if (window.App && window.App.slideshowWizard) {
                    window.App.slideshowWizard.show();
                } else {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Wizard module niet geladen.');
                }
            });

            await this.loadData();
        }

        async loadData() {
            try {
                const res = await fetch('/api/slideshow/overview');
                const json = await res.json();
                
                if (json.status === 'success') {
                    this.slideshows = json.data || [];
                    this.renderGrid();
                } else {
                    throw new Error(json.message);
                }
            } catch (e) {
                const grid = document.getElementById('slideshow-grid');
                if (grid) grid.innerHTML = `<div style="color:var(--error); grid-column: 1 / -1;">Fout bij laden: ${e.message}</div>`;
            }
        }

        formatTime(seconds) {
            if (!seconds || seconds == 0) return '0m 0s';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            if (h > 0) return `${h}h ${m}m ${s}s`;
            return `${m}m ${s}s`;
        }

        renderGrid() {
            const grid = document.getElementById('slideshow-grid');
            if (!grid) return;

            // FASE 1: Mooie illustratie bij geen slideshows
            if (this.slideshows.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px; background: var(--bg-surface); border: 1px dashed var(--border-dropdown); border-radius: 16px; display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 100px; height: 100px; background: rgba(244, 63, 94, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><polygon points="10 8 16 10 10 12 10 8"></polygon></svg>
                        </div>
                        <h3 style="color: var(--text-main); font-size: 1.4rem; font-weight: 800; margin-bottom: 12px;">Nog geen slideshows</h3>
                        <p style="color: var(--text-muted); font-size: 1rem; max-width: 450px; line-height: 1.6; margin: 0 auto 24px auto;">Je hebt nog geen presentaties gemaakt. Start met het bouwen van een slideshow om je media op schermen of via gedeelde links te tonen.</p>
                        <button class="btn-primary" onclick="document.getElementById('btn-create-slideshow').click()" style="padding: 10px 24px; border-radius: 8px; display: flex; align-items: center; gap: 8px; border:none; cursor:pointer;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Eerste Slideshow Aanmaken
                        </button>
                    </div>
                `;
                return;
            }

            let html = '';
            this.slideshows.forEach(show => {
                const isDraft = show.status === 'draft';
                const role = show.my_role || 'owner'; 
                const roleLabel = role === 'owner' ? 'Eigenaar' : (role === 'co-owner' ? 'Mede-eigenaar' : (role === 'editor' ? 'Bewerker' : 'Kijker'));
                
                // Variabelen check zoals in je originele script
                const isPublic = show.privacy === 'public';
                const hasPincode = show.pincode_hash && show.pincode_hash.length > 0;
                
                const t = new Date().getTime();
                const coverStyle = show.cover_file_id 
                    ? `background-image: url('/api/files/download?id=${show.cover_file_id}&t=${t}'); background-size: cover; background-position: center;` 
                    : `background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display:flex; align-items:center; justify-content:center;`;
                
                const noCoverIcon = !show.cover_file_id ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect></svg>` : '';

                // FASE 1 FIX: Nieuwe Badge (Geen driehoek meer, maar Groen/Oranje label)
                let securityBadge = '';
                if (hasPincode) {
                    securityBadge = `
                        <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #f59e0b; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display:flex; align-items:center; gap:6px; border: 1px solid rgba(245, 158, 11, 0.3);">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Beveiligd
                        </div>
                    `;
                } else {
                    securityBadge = `
                        <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #10b981; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display:flex; align-items:center; gap:6px; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            Openbaar
                        </div>
                    `;
                }

                const views = show.views || 0;
                const watchTime = this.formatTime(show.total_watch_time_seconds);

                html += `
                    <div class="slideshow-card" style="background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.02); position: relative;">
                        <div class="card-cover" style="height: 180px; width: 100%; position: relative; ${coverStyle}">
                            ${noCoverIcon}
                            ${securityBadge}
                            
                            <div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display:flex; align-items:center; gap:6px;">
                                <div style="width:6px; height:6px; border-radius:50%; background:${isDraft ? 'var(--warning)' : 'var(--success)'};"></div>
                                ${isDraft ? 'Concept' : 'Actief'}
                            </div>
                            
                            <button class="btn-slideshow-context" data-id="${show.id}" style="position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>

                            <div id="ss-context-menu-${show.id}" class="slideshow-context-menu" style="position: absolute; top: 48px; right: 12px; background: var(--bg-dropdown); border: 1px solid var(--border-dropdown); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 6px; width: 180px; z-index: 100; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s ease;">
                                <button class="btn-context-action" data-action="edit" data-id="${show.id}" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--text-main); font-size: 0.9rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Bewerken
                                </button>
                                <button class="btn-context-action" data-action="share" data-uuid="${show.uuid}" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--text-main); font-size: 0.9rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                    Deel Link
                                </button>
                                <div style="height: 1px; background: var(--border-dropdown); margin: 4px 0;"></div>
                                <button class="btn-context-action" data-action="delete" data-id="${show.id}" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: #ef4444; font-size: 0.9rem; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    Verwijderen
                                </button>
                            </div>
                        </div>
                        
                        <div style="padding: 20px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 1.15rem; color: var(--text-main); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${show.title}
                            </h3>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                                <div style="display:flex; align-items:center; gap:6px; color:var(--text-muted); font-size:0.85rem;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    ${views} weergaven
                                </div>
                                <div style="display:flex; align-items:center; gap:6px; color:var(--text-muted); font-size:0.85rem;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    ${watchTime}
                                </div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn-play-slideshow" data-uuid="${show.uuid}" style="flex:1; padding:10px; display:flex; justify-content:center; align-items:center; gap:8px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.2s ease;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    Afspelen
                                </button>
                                <button class="btn-edit-slideshow" data-id="${show.id}" title="Bewerken" style="width:40px; display:flex; justify-content:center; align-items:center; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); border-radius:8px; cursor:pointer; transition:all 0.2s ease;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-share-slideshow" data-uuid="${show.uuid}" title="Kopieer TV Link" style="width:40px; display:flex; justify-content:center; align-items:center; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); border-radius:8px; cursor:pointer; transition:all 0.2s ease;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button class="btn-delete-slideshow" data-id="${show.id}" title="Verwijderen" style="width:40px; display:flex; justify-content:center; align-items:center; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:#ef4444; border-radius:8px; cursor:pointer; transition:all 0.2s ease;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            grid.innerHTML = html;

            // Hover en klik-effecten voor de contextmenu (3 puntjes) acties
            grid.querySelectorAll('.btn-slideshow-context').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const menu = document.getElementById(`ss-context-menu-${id}`);
                    
                    document.querySelectorAll('.slideshow-context-menu.visible').forEach(m => {
                        if (m !== menu) {
                            m.classList.remove('visible'); m.style.opacity = '0'; m.style.visibility = 'hidden'; m.style.transform = 'translateY(-10px)';
                        }
                    });

                    if (menu) {
                        menu.classList.toggle('visible');
                        if (menu.classList.contains('visible')) {
                            menu.style.opacity = '1'; menu.style.visibility = 'visible'; menu.style.transform = 'translateY(0)';
                        } else {
                            menu.style.opacity = '0'; menu.style.visibility = 'hidden'; menu.style.transform = 'translateY(-10px)';
                        }
                    }
                });
            });

            grid.querySelectorAll('.btn-context-action').forEach(btn => {
                btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(128,128,128,0.1)');
                btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
                
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;
                    const uuid = btn.dataset.uuid;
                    
                    document.querySelectorAll('.slideshow-context-menu.visible').forEach(m => {
                        m.classList.remove('visible'); m.style.opacity = '0'; m.style.visibility = 'hidden'; m.style.transform = 'translateY(-10px)';
                    });

                    if (action === 'edit') {
                        if (window.EventBus) window.EventBus.emit('slideshow:open_editor', id);
                    } else if (action === 'share') {
                        const link = `${window.location.origin}/play/${uuid}`;
                        navigator.clipboard.writeText(link).then(() => {
                            if (window.EventBus) window.EventBus.emit('notify:success', 'TV Link gekopieerd naar klembord!');
                        });
                    } else if (action === 'delete') {
                        this.deleteSlideshow(id);
                    }
                });
            });

            // Oude vertrouwde knoppen re-binden
            grid.querySelectorAll('.btn-play-slideshow').forEach(btn => {
                btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
                btn.addEventListener('mouseleave', () => btn.style.transform = 'none');
                btn.addEventListener('click', () => {
                    const uuid = btn.dataset.uuid;
                    window.open(`/play/${uuid}`, '_blank');
                });
            });

            grid.querySelectorAll('.btn-edit-slideshow').forEach(btn => {
                btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'var(--primary)'; btn.style.color = 'var(--primary)'; });
                btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--border-dropdown)'; btn.style.color = 'var(--text-main)'; });
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    if (window.EventBus) window.EventBus.emit('slideshow:open_editor', id);
                });
            });

            grid.querySelectorAll('.btn-share-slideshow').forEach(btn => {
                btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'var(--primary)'; btn.style.color = 'var(--primary)'; });
                btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--border-dropdown)'; btn.style.color = 'var(--text-main)'; });
                btn.addEventListener('click', () => {
                    const uuid = btn.dataset.uuid;
                    const link = `${window.location.origin}/play/${uuid}`;
                    navigator.clipboard.writeText(link).then(() => {
                        if (window.EventBus) window.EventBus.emit('notify:success', 'TV Link gekopieerd naar klembord!');
                    });
                });
            });

            grid.querySelectorAll('.btn-delete-slideshow').forEach(btn => {
                btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#ef4444'; btn.style.background = 'rgba(239, 68, 68, 0.1)'; });
                btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--border-dropdown)'; btn.style.background = 'var(--bg-surface)'; });
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    this.deleteSlideshow(id);
                });
            });
        }

        async deleteSlideshow(id) {
            const ms = window.ModalService || (window.App && window.App.modalService);
            if (ms) {
                const confirmed = await ms.confirm('Slideshow verwijderen', 'Weet je zeker dat je deze slideshow permanent wilt verwijderen? TV schermen stoppen direct met afspelen.', { danger: true, yesText: 'Verwijderen' });
                if (confirmed) {
                    this.executeDelete(id);
                }
            } else {
                if (confirm("Weet je zeker dat je deze slideshow wilt verwijderen?")) {
                    this.executeDelete(id);
                }
            }
        }

        async executeDelete(id) {
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                const res = await fetch('/api/slideshow/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, csrf_token: csrfData.csrf_token })
                });
                const json = await res.json();
                if (res.ok && json.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Slideshow verwijderd.');
                    this.loadData();
                } else {
                    throw new Error(json.message);
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', e.message);
            }
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.slideshowOverview = new SlideshowOverview();
    });
})();