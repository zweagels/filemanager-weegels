/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/PropertiesPanel.js */

(function() {
    class PropertiesPanel {
        constructor() {
            this.panel = null;
            this.currentItem = null;
            this.currentType = null;
            
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.handleOutsideClick = this.handleOutsideClick.bind(this);
            this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);

            this.initDOM();
            this.initStyles();
            this.initListeners();
        }

        initDOM() {
            this.panel = document.getElementById('properties-panel');
            if (!this.panel) {
                this.panel = document.createElement('div');
                this.panel.id = 'properties-panel';
                document.body.appendChild(this.panel);
            }
            
            this.panel.innerHTML = `
                <div class="properties-header">
                    <h3>Eigenschappen</h3>
                    <button id="btn-close-props" class="btn-icon-small">&times;</button>
                </div>
                <div id="properties-content" class="properties-content">
                    <div style="padding:40px 20px; text-align:center; color:var(--text-muted);">Selecteer een bestand of map.</div>
                </div>
            `;
        }

        initStyles() {
            if (document.getElementById('properties-styles')) return;
            const style = document.createElement('style');
            style.id = 'properties-styles';
            style.innerHTML = `
                #properties-panel {
                    position: fixed;
                    top: 70px;
                    right: -350px;
                    width: 320px;
                    bottom: 0;
                    background: var(--bg-main);
                    border-left: 1px solid var(--border-light);
                    box-shadow: -5px 0 25px rgba(0,0,0,0.05);
                    transition: right 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                }
                #properties-panel.visible {
                    right: 0;
                }
                .properties-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(128,128,128,0.02);
                }
                .properties-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-main);
                }
                .properties-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
                .prop-preview-box {
                    width: 100%;
                    height: 160px;
                    background: var(--bg-surface);
                    border-radius: 12px;
                    border: 1px solid var(--border-dropdown);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    overflow: hidden;
                    position: relative;
                }
                .prop-section {
                    margin-bottom: 20px;
                }
                .prop-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }
                .prop-value {
                    font-size: 0.95rem;
                    color: var(--text-main);
                    font-weight: 500;
                    word-break: break-all;
                }
                .prop-input {
                    width: 100%;
                    padding: 8px 10px;
                    border-radius: 8px;
                    border: 1px solid transparent;
                    background: transparent;
                    color: var(--text-main);
                    font-size: 0.95rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .prop-input:hover, .prop-input:focus {
                    background: var(--bg-surface);
                    border-color: var(--primary);
                    outline: none;
                }
                .prop-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin: 0 6px 6px 0;
                }
                .prop-pill-remove {
                    cursor: pointer;
                    opacity: 0.5;
                    font-size: 1.1rem;
                    line-height: 0.5;
                    margin-left: 2px;
                    transition: opacity 0.2s;
                }
                .prop-pill-remove:hover {
                    opacity: 1;
                }
                .prop-color-icon-btns {
                    display: flex;
                    gap: 10px;
                    width: 100%;
                }
                /* FASE 1: Toegangslogboek Styling (Threat Graph) */
                .threat-log-item { 
                    display: flex; align-items: center; justify-content: space-between; 
                    padding: 8px 0; border-bottom: 1px solid var(--border-dropdown); font-size: 0.8rem; 
                }
                .threat-log-item:last-child { border-bottom: none; }
                .threat-status-success { color: var(--success); display:flex; align-items:center; gap:4px; }
                .threat-status-failed { color: var(--error); display:flex; align-items:center; gap:4px; }
            `;
            document.head.appendChild(style);
        }

        initListeners() {
            document.getElementById('btn-close-props').addEventListener('click', () => {
                this.close();
            });

            if (window.EventBus) {
                window.EventBus.on('selection:changed', () => this.handleSelectionChange());
                window.EventBus.on('view:refresh', () => this.handleSelectionChange());
                
                // FASE 1: Luisteren naar de TV Logs (Aangeroepen vanuit de Editor)
                window.EventBus.on('properties:load_slideshow_logs', (id) => this.loadSlideshowLogs(id));
                
                window.EventBus.on('favorite:toggled', (data) => {
                    if (this.currentItem && String(this.currentItem.id) === String(data.id) && (this.currentItem.itemType || this.currentType) === data.type) {
                        this.currentItem.is_favorite = data.is_favorite;
                        const btnFav = document.getElementById('prop-btn-fav');
                        if (btnFav) {
                            const starColor = data.is_favorite ? '#f59e0b' : 'rgba(255,255,255,0.8)';
                            const starFill = data.is_favorite ? '#f59e0b' : 'rgba(0,0,0,0.3)';
                            btnFav.style.color = starColor;
                            const svg = btnFav.querySelector('svg');
                            if (svg) svg.setAttribute('fill', starFill);
                            if (data.is_favorite) btnFav.classList.add('active');
                            else btnFav.classList.remove('active');
                        }
                    }
                });
            }

            document.addEventListener('keydown', this.handleGlobalKeyDown);
        }

        handleGlobalKeyDown(e) {
            // Blokkeer de I-sneltoets als de gebruiker ergens aan het typen is of een Modal open heeft staan
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (document.querySelector('.modal-overlay.visible')) return;
            if (window.ModalService && typeof window.ModalService.isOpen === 'function' && window.ModalService.isOpen()) return;
            
            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                if (this.panel.classList.contains('visible')) {
                    this.close();
                } else {
                    this.open();
                }
            }
        }

        handleOutsideClick(e) {
            // FASE A FIX: Click-Outside Logica
            // Bescherm elementen waar de klik op genegeerd moet worden
            if (e.target.closest('#modal-root') || e.target.closest('.modal-overlay')) return;
            if (e.target.closest('.context-menu-root, .dropdown-menu, .action-btn')) return;
            
            // Als we binnen het paneel zelf klikken
            if (this.panel.contains(e.target)) return;

            // Als we op een bestand klikken (dit wordt door de SelectionManager afgehandeld)
            if (e.target.closest('.grid-tile, .list-row, .masonry-tile')) return;

            // Klik was in lege ruimte -> Schuif soepel dicht
            this.close();
        }

        handleKeyDown(e) {
            if (e.key === 'Escape') this.close();
        }

        open(type = null, id = null) {
            this.panel.classList.add('visible');
            
            if (type && id) {
                this.loadProperties(type, id);
            } else {
                this.handleSelectionChange(); 
            }
            
            // FASE A FIX: mousedown is robuuster om 'click outside' bugs te voorkomen
            setTimeout(() => document.addEventListener('mousedown', this.handleOutsideClick), 10);
            document.addEventListener('keydown', this.handleKeyDown);
        }

        close() {
            this.panel.classList.remove('visible');
            document.removeEventListener('mousedown', this.handleOutsideClick);
            document.removeEventListener('keydown', this.handleKeyDown);
            
            // Maak de inhoud leeg nadat het paneel is weggeschoven (bespaart RAM)
            setTimeout(() => {
                if (!this.panel.classList.contains('visible')) {
                    const content = document.getElementById('properties-content');
                    if (content) content.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--text-muted);">Selecteer een bestand of map.</div>`;
                    this.currentItem = null;
                }
            }, 300);
        }

        handleSelectionChange() {
            if (!this.panel.classList.contains('visible')) return;
            if (!window.App || !window.App.selectionManager) return;
            
            const selectedIds = Array.from(window.App.selectionManager.selectedItems.keys());
            
            if (selectedIds.length === 0) {
                // FASE A FIX: In plaats van een lege tekst, sluit het hele paneel als de selectie leeg raakt
                this.close();
            } else if (selectedIds.length === 1) {
                const targetId = String(selectedIds[0]);
                let type = null;

                if (window.App.renderEngine && window.App.renderEngine.currentData) {
                    const data = window.App.renderEngine.currentData;
                    if (data.folders && data.folders.some(f => String(f.id) === targetId)) {
                        type = 'folder';
                    } else if (data.files && data.files.some(f => String(f.id) === targetId)) {
                        const fileItem = data.files.find(f => String(f.id) === targetId);
                        type = fileItem.itemType || 'file';
                    }
                }

                if (!type) {
                    const el = document.querySelector(`.grid-tile[data-id="${targetId}"], .list-row[data-id="${targetId}"]`);
                    if (el) type = el.dataset.type;
                }

                if (type) {
                    this.loadProperties(type, targetId);
                } else {
                    document.getElementById('properties-content').innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--text-muted);">Eigenschappen tijdelijk niet beschikbaar. Selecteer opnieuw.</div>`;
                    this.currentItem = null;
                }
            } else {
                document.getElementById('properties-content').innerHTML = `
                    <div style="padding:40px 20px; text-align:center;">
                        <div style="width: 60px; height: 60px; background: rgba(37,99,235,0.1); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                            <span style="font-size:1.5rem; font-weight:bold;">${selectedIds.length}</span>
                        </div>
                        <h4 style="margin:0; color:var(--text-main);">Items geselecteerd</h4>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:8px;">Bulk-eigenschappen bewerken is nog niet beschikbaar.</p>
                    </div>`;
                this.currentItem = null;
            }
        }

        async loadProperties(type, id) {
            this.panel.classList.add('visible');

            const content = document.getElementById('properties-content');
            content.innerHTML = `<div style="display:flex; justify-content:center; padding: 40px;"><div class="btn-loader" style="border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>`;
            
            try {
                const res = await fetch(`/api/properties?type=${type}&id=${id}`);
                const json = await res.json();
                
                if (json.status === 'success') {
                    this.currentItem = json.data;
                    this.currentType = type;
                    this.renderDetails();
                } else {
                    content.innerHTML = `<div style="padding:20px; color:var(--error); text-align:center;">Kon eigenschappen niet laden.</div>`;
                }
            } catch (e) {
                console.error(e);
                content.innerHTML = `<div style="padding:20px; color:var(--error); text-align:center;">Verbindingsfout.</div>`;
            }
        }

        // --- FASE 1: NIEUWE FUNCTIE VOOR HET TV TOEGANGSLOGBOEK ---
        async loadSlideshowLogs(slideshowId) {
            this.panel.classList.add('visible');
            const content = document.getElementById('properties-content');
            content.innerHTML = '<div style="text-align:center; padding: 40px; color:var(--text-muted);">Logs laden...</div>';
            
            try {
                const res = await fetch(`/api/slideshow/logs?id=${slideshowId}`);
                if (!res.ok) throw new Error('Kon toegangslogs niet laden.');
                const json = await res.json();
                
                if (json.status === 'success') {
                    const logs = json.data || [];
                    
                    let logHtml = '';
                    if (logs.length === 0) {
                        logHtml = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">Geen toegangspogingen geregistreerd.</div>';
                    } else {
                        logs.forEach(log => {
                            const date = new Date(log.timestamp).toLocaleString('nl-NL', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                            const statusIcon = log.status === 'success' 
                                ? `<span class="threat-status-success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Succes</span>` 
                                : `<span class="threat-status-failed"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Mislukt</span>`;
                            
                            logHtml += `
                                <div class="threat-log-item">
                                    <div style="color:var(--text-muted);">${date}</div>
                                    <div style="font-family:monospace;">${log.ip_address}</div>
                                    <div>${statusIcon}</div>
                                </div>
                            `;
                        });
                    }

                    content.innerHTML = `
                        <div style="text-align:center; padding-bottom: 20px; border-bottom: 1px solid var(--border-dropdown); margin-bottom: 20px;">
                            <h4 style="margin: 0 0 5px 0; font-size:1.1rem; color:var(--text-main);">Toegangslogboek (TV)</h4>
                            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Recente pogingen voor pincode invoer</p>
                        </div>
                        <div style="background: rgba(128,128,128,0.02); border: 1px solid var(--border-dropdown); border-radius: 8px; padding: 8px 16px;">
                            ${logHtml}
                        </div>
                    `;
                } else {
                    throw new Error(json.message);
                }
            } catch(e) {
                content.innerHTML = `<div style="color:var(--error); text-align:center; padding:20px;">Fout: ${e.message}</div>`;
            }
        }

        renderDetails() {
            const item = this.currentItem;
            const content = document.getElementById('properties-content');
            const isFav = parseInt(item.is_favorite || 0) === 1;

            let previewHtml = '';
            if (this.currentType === 'folder') {
                previewHtml = `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #f59e0b;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
            } else {
                const ext = item.extension ? item.extension.toLowerCase() : '';
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    const t = new Date(item.updated_at || item.created_at).getTime();
                    previewHtml = `<img src="/api/files?action=thumb&id=${item.id}&t=${t}" style="width:100%; height:100%; object-fit:contain;">`;
                } else {
                    previewHtml = `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted);"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
                }
            }

            let tagsHtml = '';
            if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
                item.tags.forEach(t => {
                    tagsHtml += `<div class="prop-pill" style="background:${t.color}15; color:${t.color}; border: 1px solid ${t.color}40;">
                                    <span style="width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
                                    ${t.name}
                                    <span class="prop-pill-remove prop-remove-tag" data-name="${t.name}" title="Ontkoppel">&times;</span>
                                 </div>`;
                });
            } else if (this.currentType === 'file') {
                tagsHtml = `<div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">Geen labels gekoppeld.</div>`;
            }

            let albumsHtml = '';
            if (item.albums && Array.isArray(item.albums) && item.albums.length > 0) {
                item.albums.forEach(a => {
                    albumsHtml += `<div class="prop-pill" style="background:rgba(37,99,235,0.1); color:var(--primary); border: 1px solid rgba(37,99,235,0.2);">
                                    <span style="cursor:pointer; display:flex; align-items:center; gap:4px;" class="prop-open-album" data-id="${a.id}">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        ${a.name}
                                    </span>
                                    <span class="prop-pill-remove prop-remove-album" data-id="${a.id}" title="Verwijder uit album">&times;</span>
                                 </div>`;
                });
            } else if (this.currentType === 'file') {
                albumsHtml = `<div style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">Zit in geen enkel album.</div>`;
            }

            let sizeHtml = `<div class="prop-value">${item.formatted_size || '--'}</div>`;
            if (this.currentType === 'folder' && (!item.formatted_size || item.formatted_size === '0 bytes')) {
                sizeHtml = `<button id="btn-calc-size" class="btn-sm btn-secondary" style="font-size:0.8rem;">Bereken grootte</button>`;
            }

            const currentColor = item.color && item.color !== 'none' ? item.color : 'transparent';
            const hasIcon = item.icon && item.icon !== 'none';
            const iconDisplay = hasIcon ? '✨' : '🎨';

            content.innerHTML = `
                <div class="prop-preview-box">
                    <button id="prop-btn-fav" class="${isFav ? 'active' : ''}" title="Favoriet" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.4); border:none; cursor:pointer; color:${isFav ? '#f59e0b' : 'rgba(255,255,255,0.8)'}; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:10; transition:all 0.2s; padding:0; backdrop-filter:blur(4px);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'rgba(0,0,0,0.3)'}" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 21.78 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2.22 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>
                    ${previewHtml}
                </div>

                <div class="prop-section">
                    <div class="prop-label">Naam (Klik om te wijzigen)</div>
                    <input type="text" id="prop-input-name" class="prop-input" value="${item.name || item.original_name}">
                </div>

                <div class="prop-section" id="prop-color-picker-container" style="display:${['folder','file'].includes(this.currentType) ? 'block' : 'none'};">
                    <div class="prop-label">Vormgeving</div>
                    <div class="prop-color-icon-btns">
                        <button id="btn-prop-color" class="btn-secondary" style="flex:1; padding:8px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                            <span id="prop-color-indicator" style="width:14px; height:14px; border-radius:50%; background:${currentColor}; border:1px solid ${currentColor === 'transparent' ? 'var(--text-muted)' : currentColor}; transition: all 0.2s;"></span> Kleur
                        </button>
                        <button id="btn-prop-icon" class="btn-secondary" style="flex:1; padding:8px; border-radius:8px; display:${this.currentType === 'folder' ? 'flex' : 'none'}; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                            <span id="prop-icon-indicator" style="opacity:0.7; font-size:1.1rem;">${iconDisplay}</span> Icoon
                        </button>
                    </div>
                </div>

                <div style="display:flex; gap: 20px;">
                    <div class="prop-section" style="flex:1;">
                        <div class="prop-label">Type</div>
                        <div class="prop-value" style="text-transform:uppercase;">${this.currentType === 'folder' ? 'Map' : (item.extension + ' Bestand')}</div>
                    </div>
                    <div class="prop-section" style="flex:1;">
                        <div class="prop-label">Grootte</div>
                        <div id="prop-size-container">${sizeHtml}</div>
                    </div>
                </div>

                <div class="prop-section">
                    <div class="prop-label">Aangemaakt op</div>
                    <div class="prop-value">${new Date(item.created_at).toLocaleString()}</div>
                </div>
                
                ${this.currentType === 'file' ? `
                <div class="prop-section" style="border-top: 1px solid var(--border-dropdown); padding-top: 20px; margin-top: 10px;">
                    <div class="prop-label" style="display:flex; justify-content:space-between;">
                        <span>Labels (Tags)</span>
                        <a href="#" id="prop-btn-add-tag" style="color:var(--primary); text-decoration:none; text-transform:none; font-weight:600;">+ Aanpassen</a>
                    </div>
                    <div>${tagsHtml}</div>
                </div>

                <div class="prop-section" style="border-top: 1px solid var(--border-dropdown); padding-top: 20px;">
                    <div class="prop-label" style="display:flex; justify-content:space-between;">
                        <span>Albums</span>
                        <a href="#" id="prop-btn-add-album" style="color:var(--primary); text-decoration:none; text-transform:none; font-weight:600;">+ Koppelen</a>
                    </div>
                    <div>${albumsHtml}</div>
                </div>
                ` : ''}
            `;

            this.bindActionEvents(item);
        }

        bindActionEvents(item) {
            const btnFav = document.getElementById('prop-btn-fav');
            if (btnFav) {
                btnFav.addEventListener('mouseenter', () => btnFav.style.transform = 'scale(1.1)');
                btnFav.addEventListener('mouseleave', () => btnFav.style.transform = 'scale(1)');
                btnFav.addEventListener('click', (e) => this.toggleFavorite(e, btnFav));
            }

            const nameInput = document.getElementById('prop-input-name');
            if (nameInput) {
                if (window.App && window.App.inputValidator) {
                    window.App.inputValidator.attach(nameInput);
                }

                nameInput.addEventListener('input', (e) => {
                    const invalidPattern = /[<>:"/\\|?*]/g;
                    if (invalidPattern.test(nameInput.value)) {
                        nameInput.value = nameInput.value.replace(invalidPattern, '');
                        if(window.EventBus) window.EventBus.emit('notify:warning', 'Tekens zoals / \\ : * ? " < > | zijn niet toegestaan.');
                    }
                });

                nameInput.addEventListener('blur', () => this.saveRename(nameInput, item));
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        nameInput.blur();
                    }
                });
            }

            const btnSize = document.getElementById('btn-calc-size');
            if (btnSize) {
                btnSize.addEventListener('click', () => this.calculateSize(btnSize, item.id));
            }

            const btnColor = document.getElementById('btn-prop-color');
            if (btnColor) {
                btnColor.addEventListener('click', async () => {
                    if (!window.App || !window.App.colorPicker) {
                        if (window.ModalService) window.ModalService.alert('Fout', 'ColorPicker.js niet geladen.');
                        return;
                    }
                    const currentColor = item.color || 'none';
                    const newColor = await window.App.colorPicker.show(currentColor);
                    if (newColor !== null && newColor !== currentColor) {
                        this.updateStyle('color', newColor);
                    }
                });
            }

            const btnIcon = document.getElementById('btn-prop-icon');
            if (btnIcon) {
                btnIcon.addEventListener('click', async () => {
                    if (!window.App || !window.App.iconPicker) {
                        if (window.ModalService) window.ModalService.alert('Fout', 'IconPicker.js niet geladen.');
                        return;
                    }
                    const currentIcon = item.icon || 'none';
                    const newIcon = await window.App.iconPicker.show(currentIcon);
                    if (newIcon !== null && newIcon !== currentIcon) {
                        this.updateStyle('icon', newIcon);
                    }
                });
            }

            document.querySelectorAll('.prop-remove-tag').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.removeTagFromItem(btn.dataset.name);
                });
            });

            document.querySelectorAll('.prop-remove-album').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.removeAlbumFromItem(btn.dataset.id);
                });
            });

            document.querySelectorAll('.prop-open-album').forEach(btn => {
                btn.addEventListener('click', () => {
                    if(window.EventBus) window.EventBus.emit('navigation:navigate', 'album_' + btn.dataset.id);
                });
            });

            const btnAddTag = document.getElementById('prop-btn-add-tag');
            if (btnAddTag) {
                btnAddTag.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.App && window.App.tagManager) window.App.tagManager.show([item.id]);
                });
            }

            const btnAddAlbum = document.getElementById('prop-btn-add-album');
            if (btnAddAlbum) {
                btnAddAlbum.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.App && window.App.albumManager) window.App.albumManager.showModal(item.id);
                });
            }
        }

        async toggleFavorite(e, btnFav) {
            e.stopPropagation();
            if (!this.currentItem) return;

            const currentStatus = parseInt(this.currentItem.is_favorite || 0) === 1;
            const newStatus = currentStatus ? 0 : 1;
            
            this.currentItem.is_favorite = newStatus;

            const starColor = newStatus ? '#f59e0b' : 'rgba(255,255,255,0.8)';
            const starFill = newStatus ? '#f59e0b' : 'rgba(0,0,0,0.3)';
            btnFav.style.color = starColor;
            const svg = btnFav.querySelector('svg');
            if (svg) svg.setAttribute('fill', starFill);

            if (newStatus) {
                btnFav.classList.add('active');
                btnFav.style.transform = 'scale(1.3)';
                setTimeout(() => btnFav.style.transform = 'scale(1)', 200);
            } else {
                btnFav.classList.remove('active');
            }

            if (window.EventBus) {
                window.EventBus.emit('favorite:toggled', {
                    id: this.currentItem.id,
                    type: this.currentItem.itemType || this.currentType,
                    is_favorite: newStatus
                });
            }

            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                await fetch('/api/favorite/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: this.currentItem.id,
                        type: this.currentItem.itemType || this.currentType,
                        is_favorite: newStatus,
                        csrf_token: csrfData.csrf_token
                    })
                });

                if (window.App && window.App.renderEngine) window.App.renderEngine.broadcastSync();
            } catch (err) { console.log(err); }
        }

        async saveRename(nameInput, item) {
            const newName = nameInput.value.trim();
            const oldName = item.name || item.original_name;
            
            if (!newName || newName === oldName) return;
            
            if (/[<>:"/\\|?*]/.test(newName)) {
                if(window.ModalService) window.ModalService.alert('Fout', 'Naam bevat ongeldige tekens.');
                nameInput.value = oldName;
                return;
            }

            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                const res = await fetch('/api/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: this.currentType, id: item.id, name: newName, csrf_token: csrfData.csrf_token })
                });
                const data = await res.json();
                if(data.status === 'success') {
                    if (this.currentType === 'folder') this.currentItem.name = newName;
                    else this.currentItem.original_name = newName;
                    
                    if(window.App.renderEngine) window.App.renderEngine.render();
                    if(window.EventBus) window.EventBus.emit('notify:success', 'Naam succesvol gewijzigd');
                } else {
                    if(window.ModalService) window.ModalService.alert('Fout', data.message);
                    nameInput.value = oldName;
                }
            } catch (e) {
                console.error(e);
                nameInput.value = oldName;
            }
        }

        async calculateSize(btnSize, id) {
            btnSize.innerHTML = '<div class="btn-loader" style="width:12px; height:12px; border-width:2px;"></div>';
            try {
                const res = await fetch(`/api/folder/size?id=${id}`);
                const data = await res.json();
                if(data.status === 'success') {
                    document.getElementById('prop-size-container').innerHTML = `<div class="prop-value">${data.formatted}</div>`;
                }
            } catch(e) { btnSize.textContent = 'Fout'; }
        }

        async updateStyle(field, value) {
            this.currentItem[field] = value;
            this.renderDetails(); 

            if (window.App.renderEngine) {
                const data = window.App.renderEngine.currentData;
                const targetList = this.currentType === 'folder' ? data.folders : data.files;
                const item = targetList.find(i => String(i.id) === String(this.currentItem.id));
                if (item) item[field] = value;
                window.App.renderEngine.render(); 
            }

            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                const payload = {
                    id: this.currentItem.id,
                    type: this.currentType,
                    csrf_token: csrfData.csrf_token
                };
                payload[field] = value;

                await fetch('/api/style', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) { console.error(e); }
        }

        async removeTagFromItem(tagName) {
            try {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                const res = await fetch('/api/tags/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_id: this.currentItem.id, tag_name: tagName, csrf_token: tokenData.csrf_token })
                });
                const data = await res.json();
                if(data.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('view:refresh');
                    this.loadProperties(this.currentType, this.currentItem.id);
                }
            } catch(e) { console.error(e); }
        }

        async removeAlbumFromItem(albumId) {
            try {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                const res = await fetch('/api/albums/remove-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_id: this.currentItem.id, album_id: parseInt(albumId, 10), csrf_token: tokenData.csrf_token })
                });
                const data = await res.json();
                if(data.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('view:refresh');
                    this.loadProperties(this.currentType, this.currentItem.id);
                }
            } catch(e) { console.error(e); }
        }
    }

    window.App = window.App || {};
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.App.propertiesPanel) window.App.propertiesPanel = new PropertiesPanel();
    });
})();