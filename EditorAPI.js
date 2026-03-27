// Pad: public/js/modules/slideshow/EditorAPI.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorAPI.js */

(function() {
    if (!window.EditorCore) {
        console.error("EditorAPI kon niet laden: EditorCore is niet gevonden.");
        return;
    }

    Object.assign(window.EditorCore.prototype, {
        async loadData(silent = false) {
            try {
                const res = await fetch(`/api/slideshow/editor/load?id=${this.slideshowId}`);
                const json = await res.json();
                
                if (json.status === 'success') {
                    this.data = json.data;
                    
                    if (typeof this.data.slideshow.settings === 'string') {
                        try { this.data.slideshow.settings = JSON.parse(this.data.slideshow.settings); } catch(e) { this.data.slideshow.settings = {}; }
                    } else if (!this.data.slideshow.settings) {
                        this.data.slideshow.settings = {};
                    }
                    
                    if (!this.data.slideshow.settings.pinned_snapshots) {
                        this.data.slideshow.settings.pinned_snapshots = [];
                    }

                    if (this.data.items) {
                        this.data.items.forEach(item => {
                            if (typeof item.settings === 'string') {
                                try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
                            } else if (!item.settings) {
                                item.settings = {};
                            }
                        });
                    }

                    this.isReadOnly = this.data.slideshow.my_role === 'viewer';
                    if (this.data.slideshow.locked_by && this.data.slideshow.locked_by !== (window.currentUser ? window.currentUser.id : 0)) {
                        this.isReadOnly = true;
                    }
                    
                    this.isAdmin = window.currentUser && window.currentUser.role === 'admin';
                    this.isDarkTheme = this.data.slideshow.theme_mode === 'dark';
                    
                    if (this.saveStateToHistory) this.saveStateToHistory(true);

                    if (!silent) {
                        if (this.data.items && this.data.items.length > 0) this.selectedIndices = [0];
                        if (this.render) this.render();
                        if (this.startHeartbeat) this.startHeartbeat(); 
                    } else {
                        this.selectedIndices = this.selectedIndices.filter(idx => idx < this.data.items.length);
                        if (this.selectedIndices.length === 0 && this.data.items.length > 0) this.selectedIndices = [0];
                        
                        if (this.renderSidebar) this.renderSidebar();
                        if (this.renderProperties) this.renderProperties();
                        if (this.renderPreview) this.renderPreview();
                    }
                } else {
                    throw new Error(json.message);
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Kan editor niet laden: ' + e.message);
                if (this.close) this.close();
            }
        },

        async forceSave(logMessage = "Geforceerd opgeslagen") {
            if (this.isReadOnly) return true;
            clearTimeout(this.saveTimeout);
            this.isDirty = true;
            if (this.updateSyncStatus) this.updateSyncStatus('saving', 'Synchroniseren...');
            await this.performSave(logMessage);
            return true;
        },

        startHeartbeat() {
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = setInterval(async () => {
                try {
                    const csrf = await (await fetch('/api/csrf')).json();
                    const res = await fetch('/api/slideshow/editor/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            slideshow_id: this.slideshowId,
                            cursor_x: this.mouse ? this.mouse.x : 0,
                            cursor_y: this.mouse ? this.mouse.y : 0,
                            csrf_token: csrf.csrf_token
                        })
                    });
                    const json = await res.json();
                    if (res.ok && json.status === 'success') {
                        if (this.renderCollaborators) this.renderCollaborators(json.data);
                    }
                } catch(e) {}
            }, 3000); 
        },

        renderCollaborators(users) {
            let collabContainer = document.getElementById('ss-collaborators');
            if (!collabContainer) {
                const headerRight = document.querySelector('.ss-editor-header > div:nth-child(2)');
                if (headerRight) {
                    collabContainer = document.createElement('div');
                    collabContainer.id = 'ss-collaborators';
                    collabContainer.style.cssText = 'display:flex; align-items:center; margin-right:15px;';
                    headerRight.insertBefore(collabContainer, headerRight.firstChild);
                }
            }
            
            if (collabContainer) {
                let html = '';
                users.forEach(u => {
                    const initial = u.name.charAt(0).toUpperCase();
                    html += `<div title="${u.name} (Live)" style="width:32px; height:32px; border-radius:50%; background:${u.color}; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:2px solid var(--bg-surface); margin-left:-8px; position:relative; z-index:2; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${initial}</div>`;
                });
                collabContainer.innerHTML = html;
            }

            let cursorLayer = document.getElementById('ss-cursors-layer');
            if (!cursorLayer) {
                cursorLayer = document.createElement('div');
                cursorLayer.id = 'ss-cursors-layer';
                cursorLayer.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:99999; overflow:hidden;';
                document.body.appendChild(cursorLayer);
            }

            let cursorHtml = '';
            users.forEach(u => {
                cursorHtml += `
                    <div style="position:absolute; left:${u.x}vw; top:${u.y}vh; transition: all 3s linear; transform:translate(-2px, -2px); pointer-events:none; display:flex; flex-direction:column; align-items:flex-start;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${u.color}" stroke="white" stroke-width="1"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>
                        <div style="background:${u.color}; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; margin-top:2px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${u.name}</div>
                    </div>
                `;
            });
            cursorLayer.innerHTML = cursorHtml;
        },

        triggerAutoSave(logMessage = null) {
            if (this.isReadOnly) return;
            
            this.isDirty = true;
            if (this.updateSyncStatus) this.updateSyncStatus('saving');

            clearTimeout(this.saveTimeout);
            this._lastLogMsg = logMessage;
            
            this.saveTimeout = setTimeout(() => {
                if (this.saveStateToHistory) this.saveStateToHistory(); 
                if (this.performSave) this.performSave(this._lastLogMsg);
            }, 1000);
        },

        async performSave(logMsg) {
            if (this.isReadOnly) return;
            if (this.pendingDeltaItems.size === 0 && !this.isDirty) {
                if (this.updateSyncStatus) this.updateSyncStatus('saved');
                return;
            }

            const allDeltaItems = Array.from(this.pendingDeltaItems.values()).map(item => {
                const cleanItem = JSON.parse(JSON.stringify(item)); 
                const numericFields = [
                    'duration', 'transition_id', 'trim_start', 'trim_end', 'parent_id', 
                    'crop_x', 'crop_y', 'crop_w', 'crop_h', 'focus_x', 'focus_y', 
                    'filter_brightness', 'filter_contrast', 'filter_saturate', 
                    'transform_rotate', 'transform_flip_x', 'transform_flip_y', 
                    'media_scale', 'override_clock_id', 'override_background_id', 'override_watermark'
                ];
                numericFields.forEach(field => {
                    if (cleanItem[field] === "") cleanItem[field] = null;
                });
                return cleanItem;
            });

            this.pendingDeltaItems.clear(); 
            this.isDirty = false;

            const chunkSize = 10;
            const totalChunks = Math.ceil(allDeltaItems.length / chunkSize) || 1;

            let hasError = false;

            for (let i = 0; i < totalChunks; i++) {
                const chunk = allDeltaItems.slice(i * chunkSize, (i + 1) * chunkSize);
                
                const payload = {
                    slideshow_id: this.slideshowId,
                    settings: i === 0 ? this.data.slideshow : null,
                    delta_items: chunk,
                    log_message: i === 0 ? (logMsg || "Automatisch opgeslagen") : null
                };

                let retries = 3;
                while (retries > 0) {
                    try {
                        const csrfRes = await fetch('/api/csrf');
                        const csrfData = await csrfRes.json();
                        payload.csrf_token = csrfData.csrf_token;
                        
                        if (this.data.slideshow.password_new) {
                            payload.settings.password = this.data.slideshow.password_new;
                        }

                        const res = await fetch('/api/slideshow/editor/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if (!res.ok) throw new Error("Server fout tijdens opslaan.");

                        const json = await res.json();
                        if (json.status === 'success') {
                            this.data.slideshow.password_new = null; 
                            break; 
                        } else {
                            throw new Error(json.message);
                        }
                    } catch(e) {
                        retries--;
                        if (retries === 0) {
                            hasError = true;
                            if (window.EventBus) window.EventBus.emit('notify:error', 'Opslaan mislukt (Memory Limiet). Probeer opnieuw.');
                        } else {
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }
            }

            if (!hasError) {
                const status = document.getElementById('ss-save-status');
                if (status) {
                    // FASE 3: Toevoeging van de 'ss-save-pulse' class voor de groene gloed
                    status.className = 'ss-cloud-sync saved ss-save-pulse';
                    status.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> <span style="color:var(--success);">Opgeslagen</span>`;
                    setTimeout(() => { 
                        if (status && status.innerHTML.includes('Opgeslagen')) {
                            status.classList.remove('ss-save-pulse');
                            if (this.updateSyncStatus) this.updateSyncStatus('saved');
                        }
                    }, 2500);
                }
            } else {
                if (this.updateSyncStatus) this.updateSyncStatus('error');
            }
        },

        updateSyncStatus(status, textOverride = null) {
            // FASE 3: Inject CSS voor de Puls Animatie indien afwezig
            if (!document.getElementById('ss-api-anim-styles')) {
                const st = document.createElement('style');
                st.id = 'ss-api-anim-styles';
                st.innerHTML = `
                    @keyframes ssSavePulse { 
                        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 
                        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } 
                    } 
                    .ss-save-pulse { animation: ssSavePulse 1.5s ease-out; border-radius: 4px; }
                `;
                document.head.appendChild(st);
            }

            const el = document.getElementById('ss-save-status');
            if (!el) return;
            el.className = `ss-cloud-sync ${status}`;
            
            if (status === 'saving') {
                el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ss-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> <span>${textOverride || 'Opslaan...'}</span>`;
            } else if (status === 'saved') {
                el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> <span>${textOverride || 'Opgeslagen'}</span>`;
            } else if (status === 'error') {
                el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>${textOverride || 'Netwerkfout!'}</span>`;
            }
        },

        async removeSlide(itemId, index) {
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                const res = await fetch('/api/slideshow/editor/removeItems', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slideshow_id: this.slideshowId,
                        item_ids: [itemId],
                        csrf_token: csrfData.csrf_token
                    })
                });
                
                if (res.ok) {
                    const actualIdx = this.data.items.findIndex(i => i.id == itemId);
                    if (actualIdx > -1) {
                        this.data.items.splice(actualIdx, 1);
                    }
                    this.pendingDeltaItems.delete(itemId);
                    this.selectedIndices = this.data.items.length > 0 ? [0] : [];
                    
                    if (this.renderSidebar) this.renderSidebar();
                    if (this.renderPreview) this.renderPreview();
                    if (this.renderProperties) this.renderProperties();
                } else {
                    throw new Error("API Fout bij verwijderen.");
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Kon slide niet verwijderen: ' + e.message);
            }
        },

        async removeMultipleSlides(itemIds) {
            if (this.isReadOnly || !itemIds || itemIds.length === 0) return;
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                const res = await fetch('/api/slideshow/editor/removeItems', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slideshow_id: this.slideshowId,
                        item_ids: itemIds,
                        csrf_token: csrfData.csrf_token
                    })
                });
                
                if (res.ok) {
                    this.data.items = this.data.items.filter(i => !itemIds.includes(i.id));
                    itemIds.forEach(id => this.pendingDeltaItems.delete(id));
                    this.selectedIndices = this.data.items.length > 0 ? [0] : [];
                    
                    if (this.renderSidebar) this.renderSidebar();
                    if (this.renderPreview) this.renderPreview();
                    if (this.renderProperties) this.renderProperties();
                } else {
                    throw new Error("API Fout bij massa verwijderen.");
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Fout: ' + e.message);
            }
        }
    });
})();