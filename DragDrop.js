/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Interaction | FILE: public/js/modules/interaction/DragDrop.js */

(function() {
    class DragDropEngine {
        constructor() {
            this.container = document.getElementById('file-view');
            this.draggedItems = [];
            this.ghostElement = null;
            
            this.hoverTimer = null;
            this.hoverTargetId = null;
            this.scrollInterval = null;

            this.injectStyles();
            this.initListeners();
            
            if (window.EventBus) {
                window.EventBus.on('render:complete', () => this.makeItemsDraggable());
            }

            setTimeout(() => this.makeItemsDraggable(), 500);
        }

        injectStyles() {
            if (document.getElementById('drag-drop-styles')) return;
            const style = document.createElement('style');
            style.id = 'drag-drop-styles';
            style.innerHTML = `
                /* FASE 5: Validatie Feedback (Groen = Goed) */
                .drag-over-valid {
                    outline: 3px dashed var(--success, #10b981) !important;
                    outline-offset: -3px;
                    background-color: rgba(16, 185, 129, 0.08) !important;
                    transform: scale(1.02);
                    transition: all 0.2s ease;
                    border-radius: inherit;
                    box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.2) !important;
                }
                
                /* FASE 5: Validatie Feedback (Rood = Fout/Zichzelf) */
                .drag-over-invalid {
                    outline: 3px dashed var(--error, #ef4444) !important;
                    outline-offset: -3px;
                    background-color: rgba(239, 68, 68, 0.08) !important;
                    transform: scale(1.02);
                    transition: all 0.2s ease;
                    border-radius: inherit;
                    box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.2) !important;
                    cursor: not-allowed !important;
                }
                
                [draggable="true"] { cursor: grab; }
                [draggable="true"]:active { cursor: grabbing; }

                /* FIX: Native Image Drag Blocker */
                /* Voorkomt dat de browser stiekem de foto in de muis stopt als uploadbestand */
                #file-view img, .grid-tile img, .list-row img, .masonry-tile img {
                    -webkit-user-drag: none !important;
                    user-drag: none !important;
                    pointer-events: none !important; 
                }
            `;
            document.head.appendChild(style);
        }

        makeItemsDraggable() {
            if (!this.container) return;
            const items = this.container.querySelectorAll('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile), .masonry-tile:not(.is-back-tile)');
            items.forEach(el => el.setAttribute('draggable', 'true'));
        }

        initListeners() {
            document.addEventListener('dragstart', this.handleDragStart.bind(this), true);
            document.addEventListener('dragover', this.handleDragOver.bind(this), true);
            document.addEventListener('dragenter', this.handleDragEnter.bind(this), true);
            document.addEventListener('dragleave', this.handleDragLeave.bind(this), true);
            document.addEventListener('drop', this.handleDrop.bind(this), true);
            document.addEventListener('dragend', this.handleDragEnd.bind(this), true);
        }

        handleDragStart(e) {
            const el = e.target.closest('.grid-tile, .list-row, .masonry-tile');
            if (!el) return;

            if (el.classList.contains('is-back-tile')) {
                e.preventDefault();
                return;
            }

            const id = el.dataset.id;
            const type = el.dataset.type || 'file';

            if (window.App && window.App.selectionManager) {
                const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
                
                if (isMulti) {
                    if (!window.App.selectionManager.selectedItems.has(String(id))) {
                        e.preventDefault(); 
                        return;
                    }
                }
                
                if (!window.App.selectionManager.selectedItems.has(String(id))) {
                    window.App.selectionManager.clearSelection();
                    window.App.selectionManager.selectItemByElement(el, false, false);
                }
                
                this.draggedItems = Array.from(window.App.selectionManager.selectedItems.keys()).map(k => {
                    const itemEl = document.querySelector(`[data-id="${k}"]`);
                    return { id: k, type: itemEl ? (itemEl.dataset.type || 'file') : 'file', exists: !!itemEl };
                }).filter(item => item.exists); 
                
            } else {
                this.draggedItems = [{ id, type }];
            }

            const payload = { action: 'internal_move', items: this.draggedItems };
            e.dataTransfer.setData('application/json', JSON.stringify(payload));
            e.dataTransfer.effectAllowed = 'move';

            this.createGhost(e, el);
        }

        createGhost(e, sourceEl) {
            this.ghostElement = document.createElement('div');
            this.ghostElement.style.position = 'absolute';
            this.ghostElement.style.top = '-1000px';
            this.ghostElement.style.left = '-1000px';
            
            const visual = document.createElement('div');
            visual.style.width = '120px';
            visual.style.height = '120px';
            visual.style.background = 'var(--bg-surface)';
            visual.style.border = '2px solid var(--primary)';
            visual.style.borderRadius = '16px';
            visual.style.boxShadow = '0 15px 30px rgba(0,0,0,0.2)';
            visual.style.display = 'flex';
            visual.style.alignItems = 'center';
            visual.style.justifyContent = 'center';
            visual.style.color = 'var(--text-main)';
            visual.style.fontFamily = 'system-ui, sans-serif';
            visual.style.zIndex = '9999';
            
            visual.style.opacity = '0.7';

            if (this.draggedItems.length > 1) {
                visual.innerHTML = `<span style="background:var(--primary); color:white; padding:6px 14px; border-radius:20px; font-weight:700; font-size:1.1rem; box-shadow:0 4px 10px rgba(37,99,235,0.4);">${this.draggedItems.length} items</span>`;
                for (let i = 1; i <= 2; i++) {
                    const stack = document.createElement('div');
                    stack.style.position = 'absolute';
                    stack.style.top = `${i * 6}px`;
                    stack.style.left = `${i * 6}px`;
                    stack.style.width = '100%';
                    stack.style.height = '100%';
                    stack.style.background = 'var(--bg-surface)';
                    stack.style.border = '1px solid var(--border-dropdown)';
                    stack.style.borderRadius = '16px';
                    stack.style.zIndex = -i;
                    stack.style.transform = `rotate(${i * 4}deg)`;
                    visual.appendChild(stack);
                }
            } else {
                visual.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
            }

            this.ghostElement.appendChild(visual);
            document.body.appendChild(this.ghostElement);
            e.dataTransfer.setDragImage(this.ghostElement, 60, 60);

            setTimeout(() => {
                this.draggedItems.forEach(item => {
                    const domEl = document.querySelector(`[data-id="${item.id}"]`);
                    if (domEl) { domEl.style.opacity = '0.4'; domEl.style.filter = 'grayscale(50%)'; }
                });
            }, 0);
        }

        handleDragOver(e) {
            this.handleScroll(e);
            const targetFolder = e.target.closest('.type-folder, .is-back-tile, .breadcrumb-drop, .empty-state-placeholder.breadcrumb-drop');
            if (targetFolder) { 
                e.preventDefault(); 
                e.dataTransfer.dropEffect = 'move'; 
            }
        }

        handleDragEnter(e) {
            const targetFolder = e.target.closest('.type-folder, .is-back-tile, .breadcrumb-drop, .empty-state-placeholder.breadcrumb-drop');
            if (targetFolder) {
                let targetId = targetFolder.dataset.id || targetFolder.getAttribute('data-folder-id');
                if (targetId === 'null' || targetId === 'undefined' || targetId === 'root') targetId = null;

                const isSelf = this.draggedItems.some(item => String(item.id) === String(targetId) && item.type === 'folder');
                
                if (isSelf) {
                    targetFolder.classList.add('drag-over-invalid');
                } else {
                    targetFolder.classList.add('drag-over-valid');
                    
                    if (this.hoverTargetId !== targetId) {
                        clearTimeout(this.hoverTimer);
                        this.hoverTargetId = targetId;
                        if (!targetFolder.classList.contains('empty-state-placeholder') && !targetFolder.classList.contains('is-back-tile')) {
                            this.hoverTimer = setTimeout(() => {
                                if (window.App && window.App.renderEngine) {
                                    targetFolder.classList.remove('drag-over-valid');
                                    window.App.renderEngine.loadFolder(targetId);
                                }
                            }, 1500);
                        }
                    }
                }
            }
        }

        handleDragLeave(e) {
            const targetFolder = e.target.closest('.type-folder, .is-back-tile, .breadcrumb-drop, .empty-state-placeholder.breadcrumb-drop');
            if (targetFolder && !targetFolder.contains(e.relatedTarget)) {
                targetFolder.classList.remove('drag-over-valid', 'drag-over-invalid');
                let targetId = targetFolder.dataset.id || targetFolder.getAttribute('data-folder-id');
                if (targetId === 'null' || targetId === 'undefined' || targetId === 'root') targetId = null;
                if (this.hoverTargetId === targetId) { 
                    clearTimeout(this.hoverTimer); 
                    this.hoverTargetId = null; 
                }
            }
        }

        async handleDrop(e) {
            e.preventDefault();
            const targetFolder = e.target.closest('.type-folder, .is-back-tile, .breadcrumb-drop, .empty-state-placeholder.breadcrumb-drop');
            
            if (targetFolder) {
                const isInvalid = targetFolder.classList.contains('drag-over-invalid');
                targetFolder.classList.remove('drag-over-valid', 'drag-over-invalid');
                clearTimeout(this.hoverTimer);
                
                if (isInvalid) {
                    if (window.EventBus) window.EventBus.emit('notify:warning', 'Je kunt een map niet in zichzelf verplaatsen.');
                    this.handleDragEnd(); 
                    return;
                }
                
                let destFolderId = targetFolder.dataset.id || targetFolder.getAttribute('data-folder-id');
                if (!destFolderId || destFolderId === 'null' || destFolderId === 'undefined' || destFolderId === 'root') {
                    destFolderId = ""; 
                }
                
                const payloadStr = e.dataTransfer.getData('application/json');
                let internalPayload = null;
                try { if (payloadStr) internalPayload = JSON.parse(payloadStr); } catch(err) {}

                if (internalPayload && internalPayload.action === 'internal_move') {
                    const itemsToMove = internalPayload.items;
                    if (itemsToMove.length === 0) return;
                    if (itemsToMove.some(item => String(item.id) === String(destFolderId))) return;

                    if (window.EventBus) window.EventBus.emit('notify:info', `Verplaatsen van ${itemsToMove.length} item(s)...`);

                    try {
                        // FASE 3 FIX: BULK API Aanroep. Gebruikt de CSRF Cache uit FileApi.js
                        let token = '';
                        if (window.App && window.App.fileApi) {
                            token = await window.App.fileApi.getCsrfToken();
                        } else {
                            const csrfRes = await fetch('/api/csrf');
                            const csrfData = await csrfRes.json();
                            token = csrfData.csrf_token;
                        }

                        // Groepeer bestanden en mappen voor de Bulk API
                        const fileIds = itemsToMove.filter(i => i.type === 'file').map(i => i.id);
                        const folderIds = itemsToMove.filter(i => i.type === 'folder').map(i => i.id);

                        const res = await fetch('/api/move-bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                file_ids: fileIds,
                                folder_ids: folderIds, 
                                new_folder_id: destFolderId, 
                                csrf_token: token 
                            })
                        });

                        const json = await res.json();

                        if (res.ok && json.status === 'success') {
                            if (window.EventBus) {
                                window.EventBus.emit('notify:success', `${itemsToMove.length} item(s) succesvol verplaatst.`);
                                window.EventBus.emit('view:refresh');
                                if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                            }
                        } else {
                            throw new Error(json.message || "Fout bij verplaatsen");
                        }

                    } catch (err) {
                        console.error('DragDrop Fout:', err);
                        // Fallback naar de oude lus als '/api/move-bulk' niet bestaat op jouw server (veiligheid)
                        if (err.message !== "Fout bij verplaatsen") {
                            this.fallbackMoveLoop(itemsToMove, destFolderId);
                        } else {
                            if (window.EventBus) window.EventBus.emit('notify:error', err.message);
                        }
                    }
                } 
                else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    if(window.EventBus) window.EventBus.emit('upload:files', { files: e.dataTransfer.files, folderId: destFolderId });
                }
            }
        }

        // FASE 3: Fallback lus mocht de bulk endpoint op de PHP server nog niet gecreeerd zijn
        async fallbackMoveLoop(itemsToMove, destFolderId) {
            let token = '';
            if (window.App && window.App.fileApi) {
                token = await window.App.fileApi.getCsrfToken();
            } else {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                token = csrfData.csrf_token;
            }

            let successCount = 0;
            for (const item of itemsToMove) {
                const res = await fetch('/api/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: item.type, id: item.id, new_folder_id: destFolderId, csrf_token: token })
                });
                if (res.ok) successCount++;
            }

            if (window.EventBus) {
                if (successCount > 0) window.EventBus.emit('notify:success', `${successCount} item(s) succesvol verplaatst.`);
                else window.EventBus.emit('notify:error', `Bestand(en) konden niet worden verplaatst.`);
                window.EventBus.emit('view:refresh');
                if (window.App.selectionManager) window.App.selectionManager.clearSelection();
            }
        }

        handleDragEnd(e) {
            this.draggedItems.forEach(item => {
                const domEl = document.querySelector(`[data-id="${item.id}"]`);
                if (domEl) { domEl.style.opacity = '1'; domEl.style.filter = 'none'; }
            });
            this.draggedItems = [];
            if (this.ghostElement && this.ghostElement.parentNode) {
                this.ghostElement.parentNode.removeChild(this.ghostElement);
                this.ghostElement = null;
            }
            clearTimeout(this.hoverTimer);
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
            document.querySelectorAll('.drag-over-valid, .drag-over-invalid').forEach(el => el.classList.remove('drag-over-valid', 'drag-over-invalid'));
        }

        handleScroll(e) {
            const threshold = 60; 
            const speed = 15;     
            const y = e.clientY;
            clearInterval(this.scrollInterval);
            if (y < threshold) { this.scrollInterval = setInterval(() => { window.scrollBy(0, -speed); }, 20); } 
            else if (y > window.innerHeight - threshold) { this.scrollInterval = setInterval(() => { window.scrollBy(0, speed); }, 20); }
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.App.dragDropEngine) window.App.dragDropEngine = new DragDropEngine();
    });
})();