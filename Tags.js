/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: public/js/modules/organization/Tags.js */

class TagManager {
    constructor() {
        this.availableTags = [];
        this.fetchTags();

        this.injectStyles();

        if (window.EventBus) {
            window.EventBus.on('view:refresh', () => this.fetchTags());
            window.EventBus.on('tag:add_files', (tagName) => this.showAddFilesModal(tagName));
            window.EventBus.on('tag:edit', (tagName) => this.showEditModal(tagName));
            window.EventBus.on('tags:render_overview', (container) => this.renderOverview(container));
        }
    }

    injectStyles() {
        if (document.getElementById('tags-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'tags-dynamic-styles';
        style.innerHTML = `
            /* Neon Glow voor Tags (Sidebar & Overzicht) */
            .tag-neon-glow {
                transition: box-shadow 0.3s ease;
            }
            .tag-neon-glow:hover {
                box-shadow: 0 0 15px currentColor;
                filter: brightness(1.2);
            }
            
            /* Drag & Drop staten voor Nesting */
            .tag-drag-over {
                outline: 2px dashed var(--primary) !important;
                outline-offset: 4px;
                transform: scale(1.02);
                background: rgba(37, 99, 235, 0.05) !important;
            }
            
            .tag-card {
                background: var(--bg-surface);
                border: 1px solid var(--border-dropdown);
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                cursor: grab;
                transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            .tag-card:active { cursor: grabbing; }
            .tag-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }

            /* FASE 11: Premium Tile Styles voor Koppel Modal */
            .tag-file-tile {
                background: var(--bg-surface);
                border: 2px solid var(--border-dropdown);
                border-radius: 12px;
                padding: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
                user-select: none; /* Voorkomt tekstselectie bij Shift-klikken */
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .tag-file-tile:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 15px rgba(0,0,0,0.08);
            }
            .tag-file-tile.is-linked {
                border-color: var(--primary);
                background: rgba(37,99,235,0.03);
            }
            .tag-file-tile.selected {
                border-color: var(--primary) !important;
                background: rgba(37,99,235,0.15) !important;
                box-shadow: 0 0 0 3px rgba(37,99,235,0.3) !important;
                transform: scale(0.98);
            }
            .linked-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: var(--primary);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                z-index: 10;
                border: 2px solid var(--bg-main);
            }
        `;
        document.head.appendChild(style);
    }

    async fetchTags() {
        try {
            const res = await fetch('/api/tags');
            const json = await res.json();
            if (json.status === 'success') {
                this.availableTags = json.data;
            }
        } catch (e) {
            console.error("Kon tags niet laden", e);
        }
    }

    async addTag(name, color, icon = 'none') {
        try {
            const tokenRes = await fetch('/api/csrf');
            const tokenData = await tokenRes.json();
            
            const res = await fetch('/api/tags/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color, icon, csrf_token: tokenData.csrf_token })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                await this.fetchTags();
                if (window.EventBus) window.EventBus.emit('view:refresh');
                return true;
            } else {
                if (window.ModalService) window.ModalService.alert('Fout', json.message);
                return false;
            }
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async updateTag(id, name, color, icon = 'none') {
        try {
            const tokenRes = await fetch('/api/csrf');
            const tokenData = await tokenRes.json();
            
            const res = await fetch('/api/tags/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, color, icon, csrf_token: tokenData.csrf_token })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                await this.fetchTags();
                if (window.EventBus) window.EventBus.emit('view:refresh');
                return true;
            } else {
                if (window.ModalService) window.ModalService.alert('Fout', json.message);
                return false;
            }
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async deleteTag(tagId) {
        try {
            const tokenRes = await fetch('/api/csrf');
            const tokenData = await tokenRes.json();
            
            const res = await fetch('/api/tags/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tagId, csrf_token: tokenData.csrf_token })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                await this.fetchTags();
                if (window.EventBus) window.EventBus.emit('view:refresh');
            } else {
                if (window.ModalService) window.ModalService.alert('Fout', json.message);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async nestTag(childId, parentId) {
        try {
            const tokenRes = await fetch('/api/csrf');
            const tokenData = await tokenRes.json();
            
            const res = await fetch('/api/tags/nest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ child_id: childId, parent_id: parentId, csrf_token: tokenData.csrf_token })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                await this.fetchTags();
                if (window.EventBus) {
                    window.EventBus.emit('notify:success', 'Label succesvol genest!');
                    window.EventBus.emit('view:refresh');
                }
            } else {
                if (window.ModalService) window.ModalService.alert('Fout bij nesten', json.message);
            }
        } catch (e) {
            console.error(e);
        }
    }

    show(fileIds = []) {
        const existing = document.getElementById('tag-manager-modal-unique');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tag-manager-modal-unique';
        overlay.className = 'modal-overlay visible';
        
        // FASE 11 FIX: Z-index 8000 zodat Pickers er ALTIJD overheen vallen
        overlay.style.setProperty('z-index', '8000', 'important');
        
        let tagsHtml = '';
        this.availableTags.forEach(t => {
            tagsHtml += `
                <div class="tag-assign-item" data-id="${t.id}" data-name="${t.name}" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid var(--border-dropdown); border-radius:10px; margin-bottom:8px; transition:all 0.2s; background:var(--bg-dropdown);">
                    <div style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1;" class="tag-click-zone">
                        <span class="tag-neon-glow" style="width:16px; height:16px; border-radius:50%; background-color:${t.color}; color:${t.color}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span>
                        <span style="font-weight:600; color:var(--text-main); font-size:0.95rem;">${t.name}</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-icon-tiny tag-delete-btn" style="color:var(--error); background:rgba(239, 68, 68, 0.1);" title="Verwijder Tag"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        ${fileIds.length > 0 ? `<button class="btn-sm btn-secondary assign-btn" style="pointer-events:none;">Toewijzen</button>` : ''}
                    </div>
                </div>
            `;
        });

        let currentColor = '#3b82f6';
        let currentIcon = 'none';

        overlay.innerHTML = `
            <div class="modal-box" style="width: 480px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; max-height: 85vh;">
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">Labels & Tags</h3>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:20px 24px; background:rgba(37, 99, 235, 0.03); border-bottom:1px solid var(--border-dropdown);">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:12px;">Nieuw label aanmaken</div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <input type="text" id="new-tag-name-unique" placeholder="Naam van label..." style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-dropdown); color:var(--text-main);">
                        <div style="display:flex; gap:12px;">
                            <button id="btn-pick-color" class="btn-secondary" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px;">
                                <span id="color-indicator" style="width:14px; height:14px; border-radius:50%; background:${currentColor};"></span> Kleur
                            </button>
                            <button id="btn-pick-icon" class="btn-secondary" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px;">
                                <span id="icon-indicator">✨</span> Icoon
                            </button>
                            <button id="btn-create-tag-unique" class="btn-primary" style="padding:0 24px;">Maken</button>
                        </div>
                    </div>
                </div>
                <div id="tag-list-container" style="flex:1; overflow-y:auto; padding:16px 24px;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:12px;">Beschikbare labels</div>
                    ${tagsHtml || '<div style="color:var(--text-muted); font-size:0.9rem;">Geen labels gevonden. Maak er hierboven een aan.</div>'}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelector('.close-btn').onclick = (e) => { e.preventDefault(); overlay.remove(); };

        overlay.querySelector('#btn-pick-color').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.colorPicker) {
                const c = await window.App.colorPicker.show(currentColor);
                if (c) { currentColor = c; document.getElementById('color-indicator').style.background = c; }
            }
        };

        overlay.querySelector('#btn-pick-icon').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.iconPicker) {
                const i = await window.App.iconPicker.show(currentIcon);
                if (i) { currentIcon = i; document.getElementById('icon-indicator').innerHTML = '✅'; }
            }
        };

        const btnCreate = overlay.querySelector('#btn-create-tag-unique');
        btnCreate.onclick = async (e) => {
            e.preventDefault();
            const name = overlay.querySelector('#new-tag-name-unique').value.trim();
            if (name) {
                btnCreate.textContent = '...';
                const success = await this.addTag(name, currentColor, currentIcon);
                if (success) {
                    overlay.remove();
                    this.show(fileIds);
                }
                btnCreate.textContent = 'Maken';
            }
        };

        const items = overlay.querySelectorAll('.tag-assign-item');
        items.forEach(item => {
            item.onmouseover = () => { item.style.background = 'rgba(37,99,235,0.05)'; item.style.borderColor = 'var(--primary)'; };
            item.onmouseout = () => { item.style.background = 'var(--bg-dropdown)'; item.style.borderColor = 'var(--border-dropdown)'; };
            
            const delBtn = item.querySelector('.tag-delete-btn');
            if (delBtn) {
                delBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.ModalService) {
                        overlay.style.display = 'none'; 
                        window.ModalService.confirm('Label Verwijderen', `Weet je zeker dat je het label '${item.dataset.name}' wilt wissen?`, { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => {
                            if (agreed) {
                                await this.deleteTag(item.dataset.id);
                                overlay.remove();
                                this.show(fileIds);
                            } else {
                                overlay.style.display = 'flex'; 
                            }
                        });
                    }
                };
            }

            const clickZone = item.querySelector('.tag-click-zone');
            if (clickZone && fileIds.length > 0) {
                clickZone.onclick = async (e) => {
                    e.preventDefault();
                    const tagName = item.dataset.name;
                    const tagId = item.dataset.id;
                    const tagObj = this.availableTags.find(t => String(t.id) === String(tagId));
                    
                    try {
                        const btn = item.querySelector('.assign-btn');
                        if(btn) btn.textContent = 'Bezig...';
                        
                        const tokenRes = await fetch('/api/csrf');
                        const tokenData = await tokenRes.json();
                        
                        let successCount = 0;
                        let lastError = null;

                        for (const fId of fileIds) {
                            const res = await fetch('/api/tags/assign', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    file_id: parseInt(fId, 10), 
                                    tag_id: parseInt(tagId, 10),
                                    tag_name: tagObj.name, 
                                    tag: tagObj,            
                                    csrf_token: tokenData.csrf_token 
                                })
                            });
                            const data = await res.json();
                            if (data.status === 'success') successCount++;
                            else lastError = data.message;
                        }
                        
                        if (successCount > 0) {
                            if (window.EventBus) {
                                window.EventBus.emit('notify:success', `Label '${tagName}' toegewezen aan ${successCount} item(s)!`);
                                window.EventBus.emit('view:refresh');
                            }
                            overlay.remove();
                        } else {
                            if (window.ModalService) window.ModalService.alert('Fout', lastError || 'Koppelen mislukt.');
                            if(btn) btn.textContent = 'Toewijzen';
                        }
                    } catch(err) { 
                        console.error(err); 
                        const btn = item.querySelector('.assign-btn');
                        if(btn) btn.textContent = 'Toewijzen'; 
                    }
                };
            }
        });
    }

    showEditModal(tagName = null) {
        const isNew = tagName === null;
        const tagObj = isNew ? null : this.availableTags.find(t => t.name === tagName);
        
        let currentName = tagObj ? tagObj.name : '';
        let currentColor = tagObj ? (tagObj.color || '#3b82f6') : '#3b82f6';
        let currentIcon = tagObj ? (tagObj.icon || 'none') : 'none';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        
        // FASE 11 FIX: Z-index 8000 zodat Pickers er ALTIJD overheen vallen
        overlay.style.setProperty('z-index', '8000', 'important');
        
        overlay.innerHTML = `
            <div class="modal-box" style="width: 420px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column;">
                <div style="padding:24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:rgba(59, 130, 246, 0.1); color:#3b82f6; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        </div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">${isNew ? 'Nieuw Label Maken' : 'Label Bewerken'}</h3>
                    </div>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:24px; display:flex; flex-direction:column; gap:20px;">
                    <div>
                        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Naam van label</label>
                        <input type="text" id="edit-tag-name" value="${currentName}" placeholder="Bijv. Werk, Facturen..." style="width:100%; padding:12px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-surface); color:var(--text-main); font-size:0.95rem; outline:none;">
                    </div>
                    <div style="display:flex; gap:16px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Kleur</label>
                            <button id="btn-edit-color" style="width:100%; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500;">
                                <span id="edit-color-indicator" style="width:16px; height:16px; border-radius:50%; background:${currentColor}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span> Kies Kleur
                            </button>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Icoon</label>
                            <button id="btn-edit-icon" style="width:100%; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500;">
                                <span id="edit-icon-indicator">${currentIcon !== 'none' ? '✅' : '✨'}</span> Kies Icoon
                            </button>
                        </div>
                    </div>
                </div>
                
                <div style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn-modal btn-secondary cancel-btn" style="padding:8px 20px; border-radius:8px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer;">Annuleren</button>
                    <button class="btn-modal btn-primary save-btn" style="padding:8px 24px; border-radius:8px; font-weight:600; background:var(--primary); color:white; border:none; cursor:pointer; box-shadow:0 4px 10px rgba(37,99,235,0.2);">Opslaan</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        const inputField = overlay.querySelector('#edit-tag-name');
        setTimeout(() => inputField.focus(), 100);

        overlay.querySelector('.close-btn').onclick = (e) => { e.preventDefault(); overlay.remove(); };
        overlay.querySelector('.cancel-btn').onclick = (e) => { e.preventDefault(); overlay.remove(); };

        overlay.querySelector('#btn-edit-color').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.colorPicker) {
                const c = await window.App.colorPicker.show(currentColor);
                if (c) { currentColor = c; document.getElementById('edit-color-indicator').style.background = c; }
            }
        };

        overlay.querySelector('#btn-edit-icon').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.iconPicker) {
                const i = await window.App.iconPicker.show(currentIcon);
                if (i) { currentIcon = i; document.getElementById('edit-icon-indicator').innerHTML = '✅'; }
            }
        };

        overlay.querySelector('.save-btn').onclick = async (e) => {
            e.preventDefault();
            const btn = overlay.querySelector('.save-btn');
            const newName = inputField.value.trim();
            if (!newName) return;

            btn.disabled = true;
            btn.textContent = 'Opslaan...';

            if (isNew) {
                await this.addTag(newName, currentColor, currentIcon);
            } else {
                await this.updateTag(tagObj.id, newName, currentColor, currentIcon);
            }
            overlay.remove();
        };
    }

    async showAddFilesModal(tagName) {
        const tagObj = this.availableTags.find(t => t.name === tagName);
        if (!tagObj) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        
        // FASE 11 FIX: Z-index 8000
        overlay.style.setProperty('z-index', '8000', 'important');
        
        overlay.innerHTML = `
            <div class="modal-box" style="width: 900px; max-width: 95vw; background: var(--bg-dropdown); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; height: 85vh; overflow:hidden;">
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:1.3rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:10px;">
                            <span style="width:16px; height:16px; border-radius:50%; background:${tagObj.color}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span> Bestanden beheren voor '${tagName}'
                        </h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Houd Shift of Ctrl ingedrukt om meerdere bestanden te selecteren, of gebruik Ctrl+A.</div>
                    </div>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div id="mini-breadcrumbs" style="padding:12px 24px; background:rgba(37, 99, 235, 0.03); border-bottom:1px solid var(--border-dropdown); font-size:0.85rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px; overflow-x:auto; scrollbar-width:none;"></div>
                
                <div id="mini-explorer-grid" style="flex:1; overflow-y:auto; padding:20px; display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:16px; align-content: start; background: var(--bg-main);">
                    <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">
                        <div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div>
                    </div>
                </div>

                <div id="selection-action-bar" style="display:none; padding:16px 24px; border-top:1px solid var(--border-dropdown); background:rgba(37,99,235,0.05); justify-content:space-between; align-items:center;">
                    <span id="selection-count" style="font-weight:600; color:var(--primary); font-size:0.95rem;">0 geselecteerd</span>
                    <div style="display:flex; gap:12px;">
                        <button id="btn-modal-remove-tag" class="btn-secondary" style="color:var(--error); border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer;">Ontkoppelen</button>
                        <button id="btn-modal-assign-tag" class="btn-primary" style="background:var(--primary); color:white; border:none; padding:8px 24px; border-radius:8px; font-weight:600; cursor:pointer; box-shadow:0 4px 10px rgba(37,99,235,0.2);">Koppelen</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        let currentFolder = null;
        let selectedItems = new Set();
        let lastSelectedId = null;
        let domFileElements = [];

        const keydownHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                domFileElements.forEach(el => {
                    selectedItems.add(el.dataset.id);
                    el.classList.add('selected');
                });
                updateSelectionUI();
            }
        };
        document.addEventListener('keydown', keydownHandler);

        const close = () => {
            document.removeEventListener('keydown', keydownHandler);
            overlay.remove();
        };
        overlay.querySelector('.close-btn').onclick = (e) => { e.preventDefault(); close(); };

        const updateSelectionUI = () => {
            const bar = overlay.querySelector('#selection-action-bar');
            const countSpan = overlay.querySelector('#selection-count');
            if (selectedItems.size > 0) {
                bar.style.display = 'flex';
                countSpan.textContent = `${selectedItems.size} bestand(en) geselecteerd`;
            } else {
                bar.style.display = 'none';
            }
        };

        const loadContent = async (folderId) => {
            const list = overlay.querySelector('#mini-explorer-grid');
            const breadContainer = overlay.querySelector('#mini-breadcrumbs');
            list.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px;"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>`;

            try {
                const res = await fetch(`/api/files${folderId ? '?folder='+folderId : ''}`);
                const data = await res.json();
                
                list.innerHTML = '';
                
                let crumbsHtml = '';
                if (!data.data.breadcrumbs || data.data.breadcrumbs.length === 0 || data.data.breadcrumbs[0].id !== 'root') {
                    crumbsHtml += `<span class="crumb-nav" data-id="root" style="cursor:pointer; display:flex; align-items:center; gap:4px; transition:color 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> Mijn Bestanden</span>`;
                }

                if (data.data.breadcrumbs && data.data.breadcrumbs.length > 0) {
                    data.data.breadcrumbs.forEach((crumb, idx) => {
                        if (crumbsHtml !== '') crumbsHtml += `<span style="opacity:0.5; margin:0 6px;">/</span>`;
                        
                        if (idx === data.data.breadcrumbs.length - 1) {
                            crumbsHtml += `<span style="color:var(--primary); cursor:default; font-weight:700;">${crumb.name}</span>`;
                        } else {
                            crumbsHtml += `<span class="crumb-nav" data-id="${crumb.id}" style="cursor:pointer; transition:color 0.2s;">${crumb.name}</span>`;
                        }
                    });
                }
                breadContainer.innerHTML = crumbsHtml;

                breadContainer.querySelectorAll('.crumb-nav').forEach(c => {
                    c.onmouseover = () => c.style.color = 'var(--primary)';
                    c.onmouseout = () => c.style.color = 'var(--text-main)';
                    c.onclick = (e) => { e.preventDefault(); currentFolder = c.dataset.id === 'root' ? null : c.dataset.id; loadContent(currentFolder); };
                });

                if (folderId) {
                    const parentId = data.data.breadcrumbs.length > 1 ? data.data.breadcrumbs[data.data.breadcrumbs.length - 2].id : null;
                    const backEl = document.createElement('div');
                    backEl.style.cssText = `background: rgba(128,128,128,0.03); border: 1px dashed var(--border-dropdown); border-radius: 12px; padding: 16px 12px; text-align: center; cursor: pointer; transition: all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;`;
                    backEl.onmouseover = () => { backEl.style.background = 'rgba(128,128,128,0.08)'; };
                    backEl.onmouseout = () => { backEl.style.background = 'rgba(128,128,128,0.03)'; };
                    backEl.innerHTML = `
                        <div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></div>
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Terug</span>
                    `;
                    backEl.onclick = (e) => { e.preventDefault(); currentFolder = parentId; loadContent(parentId); };
                    list.appendChild(backEl);
                }

                data.data.folders.forEach(f => {
                    const fEl = document.createElement('div');
                    fEl.style.cssText = `background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 12px; padding: 16px 12px; text-align: center; cursor: pointer; transition: all 0.2s; display:flex; flex-direction:column; align-items:center; gap:8px;`;
                    fEl.onmouseover = () => { fEl.style.borderColor = 'var(--primary)'; fEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; fEl.style.transform = 'translateY(-2px)'; };
                    fEl.onmouseout = () => { fEl.style.borderColor = 'var(--border-dropdown)'; fEl.style.boxShadow = 'none'; fEl.style.transform = 'none'; };
                    
                    const folderColor = f.color && f.color !== 'none' ? f.color : '#f59e0b';
                    fEl.innerHTML = `
                        <div style="width:48px; height:48px; background:${folderColor}20; color:${folderColor}; border-radius:10px; display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
                        <div style="font-weight: 600; color:var(--text-main); font-size:0.85rem; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.name}">${f.name}</div>
                    `;
                    fEl.onclick = (e) => { e.preventDefault(); currentFolder = f.id; loadContent(f.id); };
                    list.appendChild(fEl);
                });

                selectedItems.clear();
                lastSelectedId = null;
                domFileElements = [];
                updateSelectionUI();

                data.data.files.forEach(f => {
                    const isLinked = f.tags && f.tags.some(t => String(t.id) === String(tagObj.id));
                    const isImg = ['jpg','jpeg','png','gif','webp'].includes(f.extension?.toLowerCase());
                    const t = new Date(f.updated_at || f.created_at || Date.now()).getTime();

                    const fEl = document.createElement('div');
                    fEl.className = 'tag-file-tile' + (isLinked ? ' is-linked' : '');
                    fEl.dataset.id = f.id;
                    
                    let visual = `<div style="width:100%; height:90px; background:rgba(128,128,128,0.1); color:var(--text-muted); border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:8px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg></div>`;
                    if (isImg) visual = `<img src="/api/files?action=thumb&id=${f.id}&t=${t}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; margin-bottom:8px;">`;

                    let badgeHtml = isLinked ? `<div class="linked-badge">✓</div>` : '';

                    fEl.innerHTML = `
                        ${badgeHtml}
                        ${visual}
                        <div style="font-weight: 600; color:var(--text-main); font-size:0.8rem; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.name || f.original_name}">${f.name || f.original_name}</div>
                    `;

                    fEl.onclick = (e) => {
                        e.preventDefault();
                        const id = String(f.id);

                        if (e.shiftKey && lastSelectedId) {
                            const start = domFileElements.findIndex(el => el.dataset.id === lastSelectedId);
                            const end = domFileElements.findIndex(el => el.dataset.id === id);
                            const min = Math.min(start, end);
                            const max = Math.max(start, end);
                            for (let i = min; i <= max; i++) {
                                selectedItems.add(domFileElements[i].dataset.id);
                                domFileElements[i].classList.add('selected');
                            }
                        } else if (e.ctrlKey || e.metaKey) {
                            if (selectedItems.has(id)) {
                                selectedItems.delete(id);
                                fEl.classList.remove('selected');
                            } else {
                                selectedItems.add(id);
                                fEl.classList.add('selected');
                            }
                            lastSelectedId = id;
                        } else {
                            selectedItems.clear();
                            domFileElements.forEach(el => el.classList.remove('selected'));
                            selectedItems.add(id);
                            fEl.classList.add('selected');
                            lastSelectedId = id;
                        }
                        updateSelectionUI();
                    };

                    domFileElements.push(fEl);
                    list.appendChild(fEl);
                });
            } catch (err) {
                console.error(err);
                list.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--error);">Fout bij laden.</div>`;
            }
        };

        loadContent(null);

        const processAction = async (endpoint, successMsg) => {
            if (selectedItems.size === 0) return;
            const btnAssign = overlay.querySelector('#btn-modal-assign-tag');
            const btnRemove = overlay.querySelector('#btn-modal-remove-tag');
            btnAssign.disabled = true; btnRemove.disabled = true;

            try {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                
                let successCount = 0;
                let lastError = null;

                for (const fId of selectedItems) {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            file_id: parseInt(fId, 10), 
                            tag_id: parseInt(tagObj.id, 10),
                            tag_name: tagObj.name, 
                            tag: tagObj,            
                            csrf_token: tokenData.csrf_token 
                        })
                    });
                    const data = await res.json();
                    if (data.status === 'success') successCount++;
                    else lastError = data.message;
                }
                
                if (successCount > 0) {
                    if (window.EventBus) {
                        window.EventBus.emit('notify:success', `${successCount} item(s) ${successMsg}!`);
                        window.EventBus.emit('view:refresh');
                    }
                    loadContent(currentFolder); 
                } else if (lastError) {
                    if (window.ModalService) window.ModalService.alert('Fout', lastError);
                }
            } catch(err) {
                console.error(err);
            } finally {
                btnAssign.disabled = false; btnRemove.disabled = false;
            }
        };

        overlay.querySelector('#btn-modal-assign-tag').onclick = (e) => { e.preventDefault(); processAction('/api/tags/assign', 'gekoppeld'); };
        overlay.querySelector('#btn-modal-remove-tag').onclick = (e) => { e.preventDefault(); processAction('/api/tags/remove', 'ontkoppeld'); };
    }

    renderOverview(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div style="padding: 40px 30px; max-width: 1400px; margin: 0 auto; width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                    <div>
                        <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,0.1); color: #6366F1; display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </div>
                            Mijn Tags
                        </h1>
                        <p style="margin:4px 0 0 0; color:var(--text-muted); font-size:1.05rem;">Beheer je labels en sleep ze op elkaar om ze te groeperen.</p>
                    </div>
                    <button id="btn-create-tag-overview" class="btn-primary" style="padding: 10px 20px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Nieuw Label
                    </button>
                </div>
                <div id="tags-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;"></div>
            </div>
        `;

        const grid = container.querySelector('#tags-grid-container');
        
        if (this.availableTags.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 80px 20px; text-align:center; color:var(--text-muted); background:var(--bg-surface); border-radius:16px; border:2px dashed var(--border-dropdown);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 20px; opacity: 0.4;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Geen tags gevonden</h3>
                <p style="color: var(--text-muted); font-size: 1.05rem;">Klik rechtsboven op '+ Nieuw Label' om je eerste label te maken.</p>
            </div>`;
        } else {
            this.availableTags.forEach(tag => {
                const card = document.createElement('div');
                card.className = 'tag-card';
                card.setAttribute('draggable', 'true');
                card.dataset.id = tag.id;
                card.dataset.name = tag.name;
                
                const filesCount = tag.files_count || 0; 
                
                const topBar = document.createElement('div');
                topBar.style.position = 'absolute';
                topBar.style.top = '0';
                topBar.style.left = '0';
                topBar.style.width = '100%';
                topBar.style.height = '4px';
                topBar.style.background = `linear-gradient(90deg, ${tag.color}, ${tag.color}40)`;
                card.appendChild(topBar);

                let iconHtml = `<span style="width:16px; height:16px; border-radius:50%; background:currentColor;"></span>`;
                if (tag.icon && tag.icon !== 'none' && window.App.iconPicker && window.App.iconPicker.icons) {
                    const iconDef = window.App.iconPicker.icons.find(i => i.id === tag.icon);
                    if (iconDef) iconHtml = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconDef.inner}</svg>`;
                }

                let parentBadge = '';
                if (tag.parent_id) {
                    const parentTag = this.availableTags.find(t => String(t.id) === String(tag.parent_id));
                    if (parentTag) {
                        parentBadge = `<div style="font-size:0.75rem; color:${parentTag.color}; background:${parentTag.color}15; padding:2px 8px; border-radius:10px; border:1px solid ${parentTag.color}30; margin-bottom:8px; display:inline-block;">↳ Onderdeel van ${parentTag.name}</div>`;
                    }
                }

                card.innerHTML += `
                    ${parentBadge}
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="tag-neon-glow" style="width: 54px; height: 54px; border-radius: 14px; background: ${tag.color}15; color: ${tag.color}; display:flex; align-items:center; justify-content:center; box-shadow: inset 0 0 0 1px ${tag.color}30;">
                            ${iconHtml}
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="btn-icon-tiny tag-edit-action" style="background:rgba(128,128,128,0.05); border:1px solid var(--border-dropdown); color:var(--text-main);" title="Bewerken"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="btn-icon-tiny tag-delete-action" style="background:rgba(128,128,128,0.05); border:1px solid var(--border-dropdown); color:var(--error);" title="Verwijderen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:1.3rem; color:var(--text-main); margin-bottom:4px;">${tag.name}</div>
                        <div style="font-size:0.9rem; color:var(--text-muted);">${filesCount} bestanden gekoppeld</div>
                    </div>
                `;

                card.querySelector('.tag-edit-action').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEditModal(tag.name);
                });

                card.querySelector('.tag-delete-action').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.ModalService) {
                        window.ModalService.confirm('Label Verwijderen', `Weet je zeker dat je het label '${tag.name}' wilt wissen? Dit verwijdert het label ook van alle bestanden.`, { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => {
                            if (agreed) await this.deleteTag(tag.id);
                        });
                    }
                });

                card.addEventListener('click', () => {
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', `tag_detail_${tag.name}`);
                });

                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', tag.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => { card.style.opacity = '0.5'; }, 0);
                });

                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                    grid.querySelectorAll('.tag-drag-over').forEach(el => el.classList.remove('tag-drag-over'));
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!card.classList.contains('tag-drag-over')) card.classList.add('tag-drag-over');
                });

                card.addEventListener('dragleave', (e) => {
                    card.classList.remove('tag-drag-over');
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('tag-drag-over');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    
                    if (draggedId && String(draggedId) !== String(tag.id)) {
                        this.nestTag(draggedId, tag.id);
                    }
                });

                grid.appendChild(card);
            });
        }

        const btnCreate = container.querySelector('#btn-create-tag-overview');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                this.showEditModal(null);
            });
        }
    }
}

window.App = window.App || {};
window.App.tagManager = new TagManager();