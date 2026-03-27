/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/SlideDragDrop.js */

(function() {
    class SlideDragDrop {
        constructor() {
            this.container = null;
            this.slideshowId = null;
            this.observer = null;
            
            this.isDragging = false;
            this.draggedIndices = [];
            this.dropIndicator = null;
            this.trashZone = null;
            
            this.targetIndex = -1;
            this.dropAction = 'none'; 
            this.targetChapter = null;

            this.handleDragStart = this.onDragStart.bind(this);
            this.handleGlobalDragOver = this.onGlobalDragOver.bind(this);
            this.handleGlobalDrop = this.onGlobalDrop.bind(this);
            this.handleDragEnd = this.onDragEnd.bind(this);
            
            this.globalListenersAttached = false;

            if (window.EventBus) {
                window.EventBus.on('slideshow:init_dragdrop', (data) => this.init(data));
            }
        }

        injectStyles() {
            if (document.getElementById('ss-drag-styles')) return;
            const style = document.createElement('style');
            style.id = 'ss-drag-styles';
            style.innerHTML = `
                .ss-drop-indicator { position: absolute; pointer-events: none; z-index: 9999; background: var(--primary); transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1); box-shadow: 0 0 10px var(--primary); border-radius: 4px; opacity: 0; }
                .ss-drop-indicator.visible { opacity: 1; }
                .ss-drop-indicator::before { content: ''; position: absolute; width: 10px; height: 10px; background: var(--primary); border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px solid white; box-shadow: 0 0 8px var(--primary); }
                .ss-drop-indicator.horizontal { height: 4px; left: 16px; right: 16px; }
                .ss-drop-indicator.vertical { width: 4px; top: 0; bottom: 0; }
                .ss-slide-wrapper { transition: margin 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
                .ss-slide-item.is-drag-hidden { opacity: 0.3; filter: grayscale(100%); border: 2px dashed rgba(128,128,128,0.5); }
                
                /* Trello-style Drop & Groep Targets */
                .ss-slide-item.is-group-target .ss-slide-thumb { border-color: #a855f7 !important; box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.4) !important; transform: scale(1.05); }
                .ss-slide-item.is-group-target::after { content: 'Koppel Layout'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #a855f7; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; z-index: 20; box-shadow: 0 4px 15px rgba(0,0,0,0.3); pointer-events: none; }
                
                /* Hoofdstuk Dropzone Styling */
                .ss-chapter-header.is-drag-over { background: rgba(37, 99, 235, 0.15) !important; border-left: 4px solid var(--primary) !important; color: var(--primary); }
                
                /* Trash Zone */
                .ss-trash-zone { position: fixed; bottom: 0; left: 0; width: 100vw; height: 100px; background: linear-gradient(0deg, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0) 100%); z-index: 100000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 20px; color: white; font-weight: 800; font-size: 1.2rem; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), padding 0.2s, font-size 0.2s; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .ss-trash-zone.active { transform: translateY(0); pointer-events: auto; }
                .ss-trash-zone.hovered { background: linear-gradient(0deg, rgba(220, 38, 38, 1) 0%, rgba(239, 68, 68, 0.5) 100%); font-size: 1.4rem; padding-bottom: 30px; }
                
                /* Ghost Drag Container (Trello Stijl) */
                .ss-ghost-container { position: absolute; top: -2000px; left: -2000px; z-index: -1; pointer-events: none; }
                .ss-ghost-stack { position: relative; width: 160px; height: 90px; }
                .ss-ghost-card { position: absolute; inset: 0; border-radius: 8px; background-size: cover; background-position: center; box-shadow: 0 8px 20px rgba(0,0,0,0.4); border: 2px solid white; transition: transform 0.1s; }
                .ss-ghost-badge { position: absolute; top: -12px; right: -12px; background: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.95rem; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.6); z-index: 10; border: 2px solid white; }
            `;
            document.head.appendChild(style);
        }

        init(data) {
            if (!data || !data.containerId) return;
            this.container = document.getElementById(data.containerId);
            this.slideshowId = data.slideshowId;
            if (!this.container) return;

            this.injectStyles();

            if (this.observer) this.observer.disconnect();
            
            this.makeChildrenDraggable();
            this.observer = new MutationObserver(() => this.makeChildrenDraggable());
            this.observer.observe(this.container, { childList: true });
            
            this.buildUI();

            this.container.addEventListener('dragstart', this.handleDragStart);
            this.container.addEventListener('dragend', this.handleDragEnd);

            this.container.addEventListener('click', (e) => {
                if (e.target === this.container) {
                    const editor = window.App.slideshowEditor;
                    if (editor && !editor.isReadOnly) {
                        editor.selectedIndices = [];
                        editor.renderSidebar();
                        editor.renderPreview();
                        editor.renderProperties();
                    }
                }
            });

            if (!this.globalListenersAttached) {
                document.addEventListener('dragover', this.handleGlobalDragOver);
                document.addEventListener('drop', this.handleGlobalDrop);
                
                document.addEventListener('dragleave', (e) => {
                    if (e.clientX === 0 || e.clientY === 0) {
                        this.hideTrashZone();
                    }
                });
                
                this.globalListenersAttached = true;
            }
        }

        buildUI() {
            if (!document.getElementById('ss-trash-zone')) {
                this.trashZone = document.createElement('div');
                this.trashZone.id = 'ss-trash-zone';
                this.trashZone.className = 'ss-trash-zone';
                this.trashZone.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:10px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Sleep hier om te verwijderen`;
                document.body.appendChild(this.trashZone);
            } else {
                this.trashZone = document.getElementById('ss-trash-zone');
            }

            if (!document.getElementById('ss-drop-indicator')) {
                this.dropIndicator = document.createElement('div');
                this.dropIndicator.id = 'ss-drop-indicator';
                this.dropIndicator.className = 'ss-drop-indicator';
                this.container.parentElement.appendChild(this.dropIndicator); 
            } else {
                this.dropIndicator = document.getElementById('ss-drop-indicator');
            }
        }

        makeChildrenDraggable() {
            if (!this.container) return;
            const wrappers = this.container.querySelectorAll('.ss-slide-wrapper');
            wrappers.forEach(wrapper => {
                if (!wrapper.hasAttribute('draggable')) {
                    wrapper.setAttribute('draggable', 'true');
                }
            });
        }

        hideTrashZone() {
            if (this.trashZone) {
                this.trashZone.classList.remove('active', 'hovered');
            }
        }

        onDragStart(e) {
            if (window.App.slideshowEditor && window.App.slideshowEditor.isReadOnly) {
                e.preventDefault();
                return;
            }

            const wrapper = e.target.closest('.ss-slide-wrapper');
            if (!wrapper) return;

            if (e.target.closest('.ss-thumb-overlay') || e.target.tagName.toLowerCase() === 'button') {
                e.preventDefault();
                return;
            }

            const itemEl = wrapper.querySelector('.ss-slide-item');
            if (!itemEl) return;
            
            const rect = itemEl.getBoundingClientRect();

            this.isDragging = true;
            const editor = window.App.slideshowEditor;
            const clickedIndex = parseInt(itemEl.dataset.index);

            if (editor.selectedIndices.includes(clickedIndex)) {
                this.draggedIndices = [...editor.selectedIndices];
            } else {
                this.draggedIndices = [clickedIndex];
                editor.selectedIndices = [clickedIndex];
                editor.renderSidebar(); 
            }
            this.draggedIndices.sort((a, b) => a - b);

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', clickedIndex); 
            
            if (this.draggedIndices.length > 0) {
                const ghostContainer = document.createElement('div');
                ghostContainer.className = 'ss-ghost-container';
                let stackHtml = `<div class="ss-ghost-stack">`;
                const t = new Date().getTime();

                this.draggedIndices.forEach((idx, loopIndex) => {
                    if (loopIndex > 3) return; 
                    const dataItem = editor.data.items[idx];
                    if (!dataItem) return;
                    
                    let thumbUrl = `/api/files?action=thumb&id=${dataItem.file_id}&t=${t}`;
                    if (dataItem.mime_type && dataItem.mime_type.startsWith('video') && dataItem.file_hash) {
                        thumbUrl = `/storage/thumbs/${dataItem.file_hash}.webp`;
                    }

                    // Trello styling rotatie en offset
                    const rot = loopIndex === 0 ? 0 : (loopIndex % 2 === 0 ? 5 : -5);
                    const offX = loopIndex * 6;
                    const offY = loopIndex * 6;
                    const z = 10 - loopIndex;
                    
                    stackHtml += `<div class="ss-ghost-card" style="background-image:url('${thumbUrl}'); transform: translate(${offX}px, ${offY}px) rotate(${rot}deg); z-index:${z};"></div>`;
                });
                
                if (this.draggedIndices.length > 1) {
                    stackHtml += `<div class="ss-ghost-badge">${this.draggedIndices.length}</div>`;
                }
                stackHtml += `</div>`;
                
                ghostContainer.innerHTML = stackHtml;
                document.body.appendChild(ghostContainer);

                const clickPercentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const clickPercentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                
                const ghostOffsetX = 160 * clickPercentX;
                const ghostOffsetY = 90 * clickPercentY;

                if (typeof e.dataTransfer.setDragImage === 'function') {
                    e.dataTransfer.setDragImage(ghostContainer, ghostOffsetX, ghostOffsetY);
                }

                setTimeout(() => ghostContainer.remove(), 100);
            }

            setTimeout(() => {
                this.draggedIndices.forEach(idx => {
                    const el = this.container.querySelector(`.ss-slide-item[data-index="${idx}"]`);
                    if(el) el.classList.add('is-drag-hidden');
                });
                this.trashZone.classList.add('active');
            }, 0);
        }

        onGlobalDragOver(e) {
            if (!this.isDragging) return;
            e.preventDefault(); 

            // 1. Check Prullenbak
            const trashOver = e.target.closest('.ss-trash-zone');
            if (trashOver) {
                this.dropAction = 'trash';
                this.trashZone.classList.add('hovered');
                this.dropIndicator.classList.remove('visible');
                this.clearGroupTargets();
                this.removeWrapperMargins();
                e.dataTransfer.dropEffect = 'move';
                return;
            } else {
                this.trashZone.classList.remove('hovered');
            }

            // 2. Check Hoofdstukken Dropzone
            const chapterOver = e.target.closest('.ss-chapter-header');
            if (chapterOver) {
                this.dropAction = 'chapter';
                this.targetChapter = chapterOver.dataset.chapterName || '';
                this.dropIndicator.classList.remove('visible');
                this.clearGroupTargets();
                this.removeWrapperMargins();
                chapterOver.classList.add('is-drag-over');
                e.dataTransfer.dropEffect = 'move';
                return;
            }

            // 3. Check Dia Target
            const targetItem = e.target.closest('.ss-slide-item');
            if (targetItem && this.container.contains(targetItem)) {
                const targetIdx = parseInt(targetItem.dataset.index);
                
                if (this.draggedIndices.includes(targetIdx)) {
                    this.dropAction = 'none';
                    this.dropIndicator.classList.remove('visible');
                    this.removeWrapperMargins();
                    this.clearGroupTargets();
                    return;
                }

                const rect = targetItem.getBoundingClientRect();
                const isGrid = this.container.classList.contains('view-grid') || this.container.classList.contains('view-compact');

                const midX = rect.left + rect.width / 2;
                const midY = rect.top + rect.height / 2;
                const dist = Math.sqrt(Math.pow(e.clientX - midX, 2) + Math.pow(e.clientY - midY, 2));

                // Koppel-Dropzone
                if (dist < 40) {
                    this.dropAction = 'group';
                    this.targetIndex = targetIdx;
                    this.clearGroupTargets();
                    targetItem.classList.add('is-group-target');
                    this.dropIndicator.classList.remove('visible');
                    this.removeWrapperMargins();
                    e.dataTransfer.dropEffect = 'copy'; 
                    return;
                }

                // Reorder Indicator
                this.clearGroupTargets();
                this.dropAction = 'reorder';
                e.dataTransfer.dropEffect = 'move';
                
                let insertBefore = true;
                if (isGrid) {
                    insertBefore = e.clientX < midX;
                } else {
                    insertBefore = e.clientY < midY;
                }

                this.targetIndex = insertBefore ? targetIdx : targetIdx + 1;

                this.removeWrapperMargins();
                const targetWrapper = targetItem.closest('.ss-slide-wrapper');
                const gapSize = isGrid ? '160px' : '100px'; 
                
                if (insertBefore) {
                    if (isGrid) targetWrapper.style.marginLeft = gapSize;
                    else targetWrapper.style.marginTop = gapSize;
                } else {
                    if (isGrid) targetWrapper.style.marginRight = gapSize;
                    else targetWrapper.style.marginBottom = gapSize;
                }

                this.dropIndicator.classList.add('visible');
                const containerRect = this.container.parentElement.getBoundingClientRect();
                
                if (isGrid) {
                    this.dropIndicator.className = 'ss-drop-indicator vertical visible';
                    this.dropIndicator.style.top = `${rect.top - containerRect.top}px`;
                    this.dropIndicator.style.height = `${rect.height}px`;
                    this.dropIndicator.style.left = insertBefore ? `${rect.left - containerRect.left - 5}px` : `${rect.right - containerRect.left + 5}px`;
                } else {
                    this.dropIndicator.className = 'ss-drop-indicator horizontal visible';
                    this.dropIndicator.style.left = `${rect.left - containerRect.left}px`;
                    this.dropIndicator.style.width = `${rect.width}px`;
                    this.dropIndicator.style.top = insertBefore ? `${rect.top - containerRect.top - 8}px` : `${rect.bottom - containerRect.top + 8}px`;
                }
                
                return;
            }

            this.dropAction = 'none';
            this.dropIndicator.classList.remove('visible');
            this.clearGroupTargets();
            this.removeWrapperMargins();
        }

        onGlobalDrop(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            this.handleAction();
        }

        onDragEnd(e) {
            if (this.isDragging) {
                this.hideTrashZone();
                this.handleAction();
            }
        }

        handleAction() {
            this.isDragging = false;
            
            this.hideTrashZone();
            this.dropIndicator.classList.remove('visible');
            this.removeWrapperMargins();
            this.clearGroupTargets();
            this.container.querySelectorAll('.is-drag-hidden').forEach(el => el.classList.remove('is-drag-hidden'));

            const editor = window.App.slideshowEditor;
            if (!editor || !editor.data) return;

            // ACTIE: VERWIJDEREN
            if (this.dropAction === 'trash') {
                const idsToDelete = [];
                this.draggedIndices.forEach(idx => {
                    const item = editor.data.items[idx];
                    if (item && item.id && !isNaN(item.id)) idsToDelete.push(item.id);
                });

                const sortedIndices = [...this.draggedIndices].sort((a, b) => b - a);
                sortedIndices.forEach(idx => {
                    const item = editor.data.items[idx];
                    if (item) editor.pendingDeltaItems.delete(item.id);
                    editor.data.items.splice(idx, 1);
                });

                editor.data.items.forEach((item, idx) => {
                    if (item.sort_order !== idx) {
                        item.sort_order = idx;
                        editor.pendingDeltaItems.set(item.id, item);
                    }
                });

                editor.selectedIndices = editor.data.items.length > 0 ? [0] : [];
                editor.renderSidebar();
                editor.renderPreview();
                editor.renderProperties();

                if (idsToDelete.length > 0) {
                    (async () => {
                        try {
                            const csrfRes = await fetch('/api/csrf');
                            const csrfData = await csrfRes.json();
                            await fetch('/api/slideshow/editor/removeItems', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ slideshow_id: this.slideshowId, item_ids: idsToDelete, csrf_token: csrfData.csrf_token })
                            });
                            if (window.EventBus) window.EventBus.emit('notify:success', `${sortedIndices.length} dia('s) verwijderd.`);
                        } catch (e) {
                            if (window.EventBus) window.EventBus.emit('notify:error', 'Verwijderen op server mislukt.');
                        }
                    })();
                } else {
                    if (window.EventBus) window.EventBus.emit('notify:success', `${sortedIndices.length} dia('s) verwijderd.`);
                }
                
                editor.triggerAutoSave();
            } 
            
            // ACTIE: HOOFDSTUK WIJZIGEN
            else if (this.dropAction === 'chapter' && this.targetChapter !== null) {
                let changedCount = 0;
                this.draggedIndices.forEach(idx => {
                    const item = editor.data.items[idx];
                    if (item && item.chapter_name !== this.targetChapter) {
                        item.chapter_name = this.targetChapter;
                        editor.pendingDeltaItems.set(item.id, item);
                        changedCount++;
                    }
                });

                if (changedCount > 0) {
                    editor.triggerAutoSave(`${changedCount} dia('s) verplaatst naar map.`);
                    editor.selectedIndices = [];
                    editor.renderSidebar();
                    editor.renderProperties();
                }
            }

            // ACTIE: KOPPELEN (DUBBELE LAYOUT)
            else if (this.dropAction === 'group' && this.targetIndex !== -1) {
                this.draggedIndices.forEach(idx => {
                    const item = editor.data.items[idx];
                    if (item) {
                        item.settings = item.settings || {};
                        item.settings.dual_link = true; 
                        editor.pendingDeltaItems.set(item.id, item);
                    }
                });

                editor.triggerAutoSave(`Gekoppeld aan dubbele layout.`);
                editor.renderSidebar(); 
                editor.renderProperties();
            } 
            
            // ACTIE: REORDER & HOOFDSTUK OVERERVEN
            else if (this.dropAction === 'reorder' && this.targetIndex !== -1) {
                const newItemsArray = [];
                const itemsToMove = [];
                
                this.draggedIndices.forEach(idx => {
                    itemsToMove.push(editor.data.items[idx]);
                });

                // Bepaal het nieuwe hoofdstuk op basis van de droplocatie
                let inheritedChapter = '';
                if (editor.data.items[this.targetIndex]) {
                    inheritedChapter = editor.data.items[this.targetIndex].chapter_name || '';
                } else if (this.targetIndex > 0 && editor.data.items[this.targetIndex - 1]) {
                    inheritedChapter = editor.data.items[this.targetIndex - 1].chapter_name || '';
                }

                for (let i = 0; i <= editor.data.items.length; i++) {
                    if (i === this.targetIndex) {
                        newItemsArray.push(...itemsToMove);
                    }
                    if (i < editor.data.items.length && !this.draggedIndices.includes(i)) {
                        newItemsArray.push(editor.data.items[i]);
                    }
                }

                let changedCount = 0;
                const newSelectedIndices = [];
                
                newItemsArray.forEach((item, index) => {
                    if (itemsToMove.includes(item)) {
                        newSelectedIndices.push(index);
                        // Pas hoofdstuk aan als het is gewijzigd
                        if (item.chapter_name !== inheritedChapter) {
                            item.chapter_name = inheritedChapter;
                            editor.pendingDeltaItems.set(item.id, item);
                            changedCount++;
                        }
                    }
                    
                    if (item.sort_order !== index) {
                        item.sort_order = index;
                        editor.pendingDeltaItems.set(item.id, item);
                        changedCount++;
                    }
                });

                editor.data.items = newItemsArray;
                editor.selectedIndices = newSelectedIndices;

                if (changedCount > 0) {
                    editor.triggerAutoSave(`Volgorde van dia('s) gewijzigd.`);
                }
                editor.renderSidebar(); 
            }

            this.dropAction = 'none';
            this.targetIndex = -1;
            this.targetChapter = null;
            this.draggedIndices = [];
        }

        clearGroupTargets() {
            this.container.querySelectorAll('.is-group-target').forEach(el => el.classList.remove('is-group-target'));
            this.container.querySelectorAll('.ss-chapter-header').forEach(el => el.classList.remove('is-drag-over'));
        }

        removeWrapperMargins() {
            this.container.querySelectorAll('.ss-slide-wrapper').forEach(el => {
                el.style.marginTop = '0';
                el.style.marginBottom = '0';
                el.style.marginLeft = '0';
                el.style.marginRight = '0';
            });
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.slideDragDrop = new SlideDragDrop();
    });
})();