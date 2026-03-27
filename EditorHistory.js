/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorHistory.js */

(function() {
    if (!window.EditorCore) return;

    Object.assign(window.EditorCore.prototype, {
        openSnapshotModal() {
            let overlay = document.getElementById('ss-snap-modal-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'ss-snap-modal-overlay';
                overlay.className = 'ss-snap-modal-overlay';
                document.body.appendChild(overlay);
            }
            
            overlay.innerHTML = `
                <div class="ss-snap-modal">
                    <h3 style="margin:0 0 8px 0; font-size:1.2rem; color:var(--text-main); font-weight:800;">Nieuwe Time Machine Backup</h3>
                    <p style="margin:0 0 20px 0; font-size:0.85rem; color:var(--text-muted);">Bevries de huidige status van je presentatie. Geef je backup een duidelijke naam zodat je hem later makkelijk kunt herkennen.</p>
                    
                    <div class="ss-form-group">
                        <label class="ss-label">Titel van Backup</label>
                        <input type="text" id="ss-snap-title" class="ss-input" value="Handmatige Backup" placeholder="Bijv: Voor de kerst update...">
                    </div>
                    
                    <div class="ss-form-group">
                        <label class="ss-label">Korte Notitie (Optioneel)</label>
                        <input type="text" id="ss-snap-desc" class="ss-input" placeholder="Wat is er speciaal aan deze versie?">
                    </div>
                    
                    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                        <button id="btn-snap-cancel" style="padding:10px 16px; background:transparent; border:none; color:var(--text-main); cursor:pointer; font-weight:600;">Annuleren</button>
                        <button id="btn-snap-confirm" class="ss-btn-primary">Opslaan</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => overlay.classList.add('visible'), 10);

            document.getElementById('btn-snap-cancel').onclick = () => {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 300);
            };
            
            document.getElementById('btn-snap-confirm').onclick = () => {
                const title = document.getElementById('ss-snap-title').value || 'Handmatige Backup';
                const desc = document.getElementById('ss-snap-desc').value || 'Opgeslagen door gebruiker';
                
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 300);
                
                if (this.createSnapshot) this.createSnapshot(title, desc, false);
            };
        },

        async showDiffModal(snapshotId) {
            try {
                const res = await fetch(`/api/slideshow/editor/snapshot/diff?id=${this.slideshowId}&snapshot_id=${snapshotId}`);
                const json = await res.json();
                if (res.ok && json.status === 'success') {
                    const d = json.data;
                    let detailsHtml = d.details.map(det => `<div style="margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);"><span style="color:var(--primary); margin-right:6px;">•</span> ${det}</div>`).join('');
                    if (!detailsHtml) detailsHtml = '<div style="font-size:0.85rem; color:var(--text-muted);">Geen wijzigingen gevonden.</div>';
                    
                    let overlay = document.getElementById('ss-diff-modal-overlay');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'ss-diff-modal-overlay';
                        overlay.className = 'ss-snap-modal-overlay';
                        document.body.appendChild(overlay);
                    }
                    overlay.innerHTML = `
                        <div class="ss-snap-modal" style="width:500px;">
                            <h3 style="margin:0 0 8px 0; font-size:1.2rem; color:var(--text-main); font-weight:800;">Wijzigingen Sinds "${d.snapshot_title}"</h3>
                            <div style="display:flex; gap:12px; margin-bottom:20px; margin-top:16px;">
                                <div style="flex:1; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); padding:12px; border-radius:8px; text-align:center;">
                                    <div style="font-size:1.5rem; font-weight:bold; color:var(--success);">${d.added}</div>
                                    <div style="font-size:0.7rem; text-transform:uppercase; color:var(--success);">Toegevoegd</div>
                                </div>
                                <div style="flex:1; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:12px; border-radius:8px; text-align:center;">
                                    <div style="font-size:1.5rem; font-weight:bold; color:var(--error);">${d.removed}</div>
                                    <div style="font-size:0.7rem; text-transform:uppercase; color:var(--error);">Verwijderd</div>
                                </div>
                                <div style="flex:1; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); padding:12px; border-radius:8px; text-align:center;">
                                    <div style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${d.modified}</div>
                                    <div style="font-size:0.7rem; text-transform:uppercase; color:var(--primary);">Gewijzigd</div>
                                </div>
                            </div>
                            <div style="max-height:200px; overflow-y:auto; padding-right:8px; margin-bottom:24px;" class="custom-scrollbar">
                                ${detailsHtml}
                            </div>
                            <div style="display:flex; justify-content:flex-end;">
                                <button id="btn-diff-close" class="ss-btn-primary">Sluiten</button>
                            </div>
                        </div>
                    `;
                    requestAnimationFrame(() => overlay.classList.add('visible'));
                    document.getElementById('btn-diff-close').onclick = () => {
                        overlay.classList.remove('visible');
                        setTimeout(() => overlay.remove(), 300);
                    };
                } else {
                    if (window.EventBus) window.EventBus.emit('notify:error', json.message);
                }
            } catch (e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Kon verschillen niet laden.');
            }
        },

        renderTimelineData() {
            const container = document.getElementById('ss-timeline-container');
            if (!container) return;

            let html = '<div class="ss-timeline">';
            
            const pinnedIds = this.data.slideshow.settings.pinned_snapshots || [];
            
            const snaps = this.data.snapshots || [];
            if (snaps.length === 0) {
                html += `<div style="text-align:center; padding:40px 20px; opacity:0.5; color:var(--text-main); font-size:0.85rem;">Nog geen geschiedenis opgebouwd.</div>`;
            } else {
                const sortedSnaps = [...snaps].sort((a, b) => {
                    const aPinned = pinnedIds.includes(parseInt(a.id));
                    const bPinned = pinnedIds.includes(parseInt(b.id));
                    if (aPinned && !bPinned) return -1;
                    if (!aPinned && bPinned) return 1;
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                sortedSnaps.forEach(snap => {
                    const isPinned = pinnedIds.includes(parseInt(snap.id));
                    const isAuto = snap.title === 'Auto-Backup';
                    let dotClass = '';
                    if (isPinned) dotClass = 'pinned';
                    else if (isAuto) dotClass = 'auto';

                    let coverHtml = `<div class="ss-timeline-cover" style="display:flex;align-items:center;justify-content:center;background:rgba(128,128,128,0.1);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;
                    
                    try {
                        const snapData = JSON.parse(snap.snapshot_data);
                        if (snapData.items && snapData.items.length > 0) {
                            const firstItem = snapData.items[0];
                            const t = new Date().getTime();
                            coverHtml = `<img class="ss-timeline-cover" src="/api/files?action=thumb&id=${firstItem.file_id}&t=${t}" onerror="this.style.display='none';">`;
                        }
                    } catch(e) {}

                    const author = snap.created_by == 0 ? 'Systeem' : (snap.creator_name || 'Gebruiker');

                    html += `
                        <div class="ss-timeline-node">
                            <div class="ss-timeline-dot ${dotClass}"></div>
                            <div class="ss-timeline-content">
                                ${coverHtml}
                                <div class="ss-timeline-info">
                                    <div class="ss-timeline-title">
                                        ${snap.title}
                                        ${!this.isReadOnly ? `<button class="ss-pin-btn ${isPinned ? 'active' : ''}" data-id="${snap.id}" title="Vastzetten (limiet negeren)"><svg width="16" height="16" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>` : ''}
                                    </div>
                                    <div style="font-size:0.8rem; margin:4px 0;">${snap.subject || 'Geen details'}</div>
                                    <div class="ss-timeline-meta">
                                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${snap.created_at}</span>
                                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${author}</span>
                                    </div>
                                    ${!this.isReadOnly ? `
                                    <div style="display:flex; gap:8px;">
                                        <div class="ss-btn-hold" data-snap="${snap.id}" style="flex:1;">
                                            <div class="ss-btn-hold-fill"></div>
                                            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Herstellen</span>
                                        </div>
                                        <button class="ss-btn-outline btn-diff" data-snap="${snap.id}" style="flex:1; margin-top:8px; padding:8px 0;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                            Diff
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            html += '</div>';
            container.innerHTML = html;

            if (!this.isReadOnly) {
                container.querySelectorAll('.btn-diff').forEach(btn => {
                    btn.onclick = () => this.showDiffModal(btn.dataset.snap);
                });

                container.querySelectorAll('.ss-pin-btn').forEach(btn => {
                    btn.onclick = () => {
                        const id = parseInt(btn.dataset.id);
                        const settings = this.data.slideshow.settings;
                        if (settings.pinned_snapshots.includes(id)) {
                            settings.pinned_snapshots = settings.pinned_snapshots.filter(p => p !== id);
                        } else {
                            settings.pinned_snapshots.push(id);
                        }
                        if (this.triggerAutoSave) this.triggerAutoSave('Snapshot gepind.');
                        this.renderTimelineData(); 
                    };
                });

                container.querySelectorAll('.ss-btn-hold').forEach(btn => {
                    let holdTimer = null;
                    const snapId = btn.dataset.snap;

                    const startHold = (e) => {
                        e.preventDefault(); 
                        btn.classList.add('holding');
                        holdTimer = setTimeout(() => {
                            btn.classList.remove('holding');
                            this.validateAndRestoreSnapshot(snapId);
                        }, 2000);
                    };

                    const cancelHold = () => {
                        clearTimeout(holdTimer);
                        btn.classList.remove('holding');
                    };

                    btn.addEventListener('mousedown', startHold);
                    btn.addEventListener('touchstart', startHold);
                    
                    btn.addEventListener('mouseup', cancelHold);
                    btn.addEventListener('mouseleave', cancelHold);
                    btn.addEventListener('touchend', cancelHold);
                    btn.addEventListener('touchcancel', cancelHold);
                });
            }
        },

        triggerScannerFlash() {
            let flash = document.getElementById('ss-scanner-overlay');
            if(!flash) {
                flash = document.createElement('div');
                flash.id = 'ss-scanner-overlay';
                flash.className = 'ss-scanner-flash';
                document.body.appendChild(flash);
            }
            flash.classList.remove('ss-scanner-active');
            void flash.offsetWidth; 
            flash.classList.add('ss-scanner-active');
            
            if (navigator.vibrate) navigator.vibrate(100);
        },

        async createSnapshot(title, subject, isAuto = false) {
            if (!isAuto) this.triggerScannerFlash();
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                await fetch('/api/slideshow/editor/snapshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slideshow_id: this.slideshowId, title, subject, csrf_token: csrfData.csrf_token })
                });
                if (!isAuto && window.EventBus) window.EventBus.emit('notify:success', 'Time Machine moment vastgelegd!');
                if (this.loadData) this.loadData(true); 
            } catch (e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Snapshot fout: ' + e.message);
            }
        },

        async validateAndRestoreSnapshot(snapshotId) {
            if (window.EventBus) window.EventBus.emit('notify:info', 'Bestanden valideren met server...');
            
            setTimeout(async () => {
                try {
                    const csrfRes = await fetch('/api/csrf');
                    const csrfData = await csrfRes.json();
                    const res = await fetch('/api/slideshow/editor/snapshot/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slideshow_id: this.slideshowId, snapshot_id: snapshotId, csrf_token: csrfData.csrf_token })
                    });
                    const json = await res.json();
                    
                    if (res.ok && json.status === 'success') {
                        if (window.EventBus) window.EventBus.emit('notify:success', 'Time Machine Herstel Succesvol!');
                        if (this.loadData) this.loadData(); 
                    } else {
                        throw new Error(json.message || "Fout bij herstel");
                    }
                } catch(e) {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Herstel mislukt: ' + e.message);
                }
            }, 1000);
        },

        updateUndoRedoButtons() {
            const btnUndo = document.getElementById('btn-editor-undo');
            const btnRedo = document.getElementById('btn-editor-redo');
            if (!btnUndo || !btnRedo) return;

            if (this.isReadOnly || this.historyStep <= 0) {
                btnUndo.disabled = true;
                btnUndo.style.opacity = '0.3';
                btnUndo.style.cursor = 'default';
            } else {
                btnUndo.disabled = false;
                btnUndo.style.opacity = '1';
                btnUndo.style.cursor = 'pointer';
            }

            if (this.isReadOnly || this.historyStep >= this.history.length - 1) {
                btnRedo.disabled = true;
                btnRedo.style.opacity = '0.3';
                btnRedo.style.cursor = 'default';
            } else {
                btnRedo.disabled = false;
                btnRedo.style.opacity = '1';
                btnRedo.style.cursor = 'pointer';
            }
        },

        saveStateToHistory(isInit = false) {
            if (this.isUndoRedoAction) {
                this.isUndoRedoAction = false;
                return;
            }
            
            this.history = this.history.slice(0, this.historyStep + 1);
            this.history.push(JSON.parse(JSON.stringify(this.data.items)));
            
            if (this.history.length > 20) this.history.shift();
            this.historyStep = this.history.length - 1;
            
            this.updateUndoRedoButtons();
        },

        undo() {
            if (this.isReadOnly || this.historyStep <= 0) return;
            this.historyStep--;
            this.isUndoRedoAction = true;
            
            this.data.items = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            this.pendingDeltaItems.clear();
            this.data.items.forEach(item => this.pendingDeltaItems.set(item.id, item));
            
            if (this.renderUI) this.renderUI();
            if (this.triggerAutoSave) this.triggerAutoSave('Undo actie uitgevoerd');
            if (window.EventBus) window.EventBus.emit('notify:info', 'Ongedaan gemaakt (Undo)');
            
            this.updateUndoRedoButtons();
        },

        redo() {
            if (this.isReadOnly || this.historyStep >= this.history.length - 1) return;
            this.historyStep++;
            this.isUndoRedoAction = true;
            
            this.data.items = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            this.pendingDeltaItems.clear();
            this.data.items.forEach(item => this.pendingDeltaItems.set(item.id, item));
            
            if (this.renderUI) this.renderUI();
            if (this.triggerAutoSave) this.triggerAutoSave('Redo actie uitgevoerd');
            if (window.EventBus) window.EventBus.emit('notify:info', 'Opnieuw toegepast (Redo)');
            
            this.updateUndoRedoButtons();
        }
    });
})();