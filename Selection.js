/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Interaction | FILE: public/js/modules/interaction/Selection.js */

(function() {
    class SelectionManager {
        constructor() {
            this.selectedItems = new Map(); 
            this.container = document.getElementById('file-view');
            this.lastSelectedElement = null; 
            
            this.lassoElement = null;
            this.isLassoing = false;
            this.startX = 0;
            this.startY = 0;
            this.lassoTicking = false; 
            
            this.clickStartX = 0;
            this.clickStartY = 0;
            this.lastProcessTime = 0;
            
            this.lastShakeTime = 0;
            this.lastShakeCoords = { x: 0, y: 0, z: 0 };
            
            // FASE A FIX: De Capture Shield status
            this.phantomLock = false;

            this.injectStyles();
            this.initPhantomShield();
            this.initListeners();
            this.initLasso();
            this.initMobileShake();
            this.initMobileSwipe();
        }

        injectStyles() {
            if (document.getElementById('selection-dynamic-styles')) return;
            const style = document.createElement('style');
            style.id = 'selection-dynamic-styles';
            style.innerHTML = `
                .grid-tile.lasso-hover, .list-row.lasso-hover, .masonry-tile.lasso-hover {
                    background-color: rgba(37, 99, 235, 0.2) !important;
                    outline: 2px solid var(--primary) !important;
                    outline-offset: -2px !important;
                    transform: scale(1.02) !important;
                    transition: transform 0.1s ease, background-color 0.1s ease !important;
                    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3) !important;
                    opacity: 1 !important;
                    filter: none !important;
                }
                .is-cut {
                    opacity: 0.4 !important;
                    filter: grayscale(50%);
                    transition: opacity 0.2s ease;
                }
            `;
            document.head.appendChild(style);
        }

        // --- HET CAPTURE SCHILD ---
        initPhantomShield() {
            // 1. Zodra we op een menu klikken, activeer het schild voor 300ms
            document.addEventListener('mousedown', (e) => {
                if (e.target.closest('.context-menu-root, .dropdown-menu, .action-btn')) {
                    this.phantomLock = true;
                    setTimeout(() => this.phantomLock = false, 300);
                }
            }, true); // 'true' = Capture phase (als allereerste opvangen)

            // 2. Vang fantoom-kliks af VOORDAT andere scripts (zoals Render.js) ze zien
            document.addEventListener('click', (e) => {
                if (this.phantomLock) {
                    // Als de klik per ongeluk op een bestand valt (omdat het menu net sloot) -> Vernietig de klik!
                    if (!e.target.closest('.context-menu-root, .dropdown-menu, .action-btn')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }
            }, true);
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('render:complete', () => this.restoreSelectionVisuals());
                
                window.EventBus.on('navigation:navigate', () => {
                    this.selectedItems.forEach(item => item.el = null); 
                });
            }

            // GLOBALE mousedown registratie
            document.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                
                const protectedElements = e.target.closest('.grid-tile, .list-row, .masonry-tile, button, input, a, .action-btn, .context-menu-root, .modal-overlay, #properties-panel, .dropdown-menu, .nav-item');
                
                // Wis selectie bij klik op witruimte
                if (!protectedElements) {
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        this.clearSelection(); 
                    }
                }
                
                this.clickStartX = e.clientX;
                this.clickStartY = e.clientY;
            });

            // GLOBALE mouseup registratie
            document.addEventListener('mouseup', (e) => {
                if (e.button !== 0 || this.isLassoing || this.phantomLock) return;
                if (e.target.closest('.context-menu-root, .dropdown-menu')) return;
                
                const dx = Math.abs(e.clientX - this.clickStartX);
                const dy = Math.abs(e.clientY - this.clickStartY);
                
                if (dx <= 5 && dy <= 5) {
                    const itemEl = e.target.closest('.grid-tile, .list-row, .masonry-tile');
                    if (itemEl && !e.target.closest('.btn-favorite, button, input')) {
                        this.processClick(itemEl, e);
                    }
                }
            });
        }

        // --- LASSO ENGINE ---
        initLasso() {
            if (!this.container) return;

            const onMouseMove = (e) => {
                if (!this.isLassoing) {
                    const dx = Math.abs(e.clientX - this.startX);
                    const dy = Math.abs(e.clientY - this.startY);
                    
                    if (dx > 5 || dy > 5) {
                        this.isLassoing = true;
                        this.createLassoElement();
                        
                        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                            this.clearSelection();
                        }
                    }
                }

                if (this.isLassoing) {
                    if (!this.lassoTicking) {
                        window.requestAnimationFrame(() => {
                            this.updateLassoPosition(e.clientX, e.clientY);
                            this.calculateIntersections();
                            this.lassoTicking = false;
                        });
                        this.lassoTicking = true;
                    }
                }
            };

            const onMouseUp = (e) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                if (this.isLassoing) {
                    this.isLassoing = false;
                    this.finalizeLassoSelection();
                    this.destroyLassoElement();
                }
            };

            this.container.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; 
                if (e.ctrlKey || e.metaKey || e.shiftKey) return; 
                if (e.target.closest('.grid-tile, .list-row, .masonry-tile, button, input, .action-btn')) return;
                if (e.clientX > document.documentElement.clientWidth - 20) return;

                this.startX = e.clientX;
                this.startY = e.clientY;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        createLassoElement() {
            this.lassoElement = document.createElement('div');
            this.lassoElement.className = 'lasso-selection-box';
            this.lassoElement.style.position = 'fixed'; 
            this.lassoElement.style.border = '1px solid var(--primary)';
            this.lassoElement.style.background = 'rgba(37, 99, 235, 0.2)';
            this.lassoElement.style.boxShadow = 'inset 0 0 10px rgba(37, 99, 235, 0.1)';
            this.lassoElement.style.pointerEvents = 'none';
            this.lassoElement.style.zIndex = '9999';
            // FASE 4 FIX: Extra fallback voor de Glassmorphism blur (inline styling)
            this.lassoElement.style.backdropFilter = 'blur(4px)';
            this.lassoElement.style.webkitBackdropFilter = 'blur(4px)';
            
            document.body.appendChild(this.lassoElement);
        }

        updateLassoPosition(currentX, currentY) {
            if (!this.lassoElement) return;
            const width = Math.abs(currentX - this.startX);
            const height = Math.abs(currentY - this.startY);
            const left = Math.min(this.startX, currentX);
            const top = Math.min(this.startY, currentY);

            this.lassoElement.style.left = `${left}px`;
            this.lassoElement.style.top = `${top}px`;
            this.lassoElement.style.width = `${width}px`;
            this.lassoElement.style.height = `${height}px`;
        }

        calculateIntersections() {
            if (!this.lassoElement) return;
            const lassoRect = this.lassoElement.getBoundingClientRect();
            const items = this.container.querySelectorAll('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile), .masonry-tile:not(.is-back-tile)');
            
            items.forEach(el => {
                const itemRect = el.getBoundingClientRect();
                const isIntersecting = !(
                    lassoRect.right < itemRect.left || 
                    lassoRect.left > itemRect.right || 
                    lassoRect.bottom < itemRect.top || 
                    lassoRect.top > itemRect.bottom
                );

                if (isIntersecting) el.classList.add('lasso-hover');
                else el.classList.remove('lasso-hover');
            });
        }

        finalizeLassoSelection() {
            const lassoedItems = this.container.querySelectorAll('.lasso-hover');
            lassoedItems.forEach(el => {
                el.classList.remove('lasso-hover');
                const id = String(el.dataset.id);
                const type = el.dataset.type || 'file';
                
                el.classList.add('selected');
                this.selectedItems.set(id, { id, type, el });
                this.lastSelectedElement = el;
            });
            this.broadcastSelectionChange();
        }

        destroyLassoElement() {
            if (this.lassoElement && this.lassoElement.parentNode) {
                this.lassoElement.parentNode.removeChild(this.lassoElement);
                this.lassoElement = null;
            }
            document.querySelectorAll('.lasso-hover').forEach(el => el.classList.remove('lasso-hover'));
        }

        // --- CLIPBOARD MANAGER ---
        copySelected() {
            if (this.selectedItems.size === 0) return;
            const items = Array.from(this.selectedItems.keys());
            localStorage.setItem('fm_clipboard', JSON.stringify({ action: 'copy', items: items }));
            
            document.querySelectorAll('.is-cut').forEach(el => el.classList.remove('is-cut'));
            
            if (window.EventBus) window.EventBus.emit('notify:success', `${items.length} item(s) gekopieerd`);
            this.clearSelection();
        }

        cutSelected() {
            if (this.selectedItems.size === 0) return;
            const items = Array.from(this.selectedItems.keys());
            localStorage.setItem('fm_clipboard', JSON.stringify({ action: 'cut', items: items }));
            
            this.selectedItems.forEach(item => {
                if (item.el) item.el.classList.add('is-cut');
            });
            
            if (window.EventBus) window.EventBus.emit('notify:info', `${items.length} item(s) geknipt`);
        }

        // --- UNIVERSELE SELECTIE LOGICA ---
        
        toggle(el, e) { this.processClick(el, e); }
        toggleItem(el, e) { this.processClick(el, e); }
        toggleSelection(el, e) { this.processClick(el, e); }
        
        processClick(element, e) {
            if (!element || element.classList.contains('is-back-tile')) return;
            
            const now = Date.now();
            if (now - this.lastProcessTime < 50) return; 
            this.lastProcessTime = now;

            const isCheckboxClick = e.target && e.target.closest('.multi-select-checkbox') !== null;
            const isMulti = e.ctrlKey || e.metaKey || isCheckboxClick; 
            const isShift = e.shiftKey;
            
            this.selectItemByElement(element, isMulti, isShift);
        }

        selectItemByElement(element, isMulti = false, isShift = false) {
            if (!element || element.classList.contains('is-back-tile')) return;
            
            const id = String(element.dataset.id);
            const type = element.dataset.type || 'file';

            if (isShift && this.lastSelectedElement) {
                this.selectRange(this.lastSelectedElement, element);
            } else if (isMulti) {
                if (this.selectedItems.has(id)) {
                    this.selectedItems.delete(id);
                    element.classList.remove('selected');
                } else {
                    this.selectedItems.set(id, { id, type, el: element });
                    element.classList.add('selected');
                    this.lastSelectedElement = element;
                }
            } else {
                this.clearSelection(); 
                this.selectedItems.set(id, { id, type, el: element });
                element.classList.add('selected');
                this.lastSelectedElement = element;
            }

            this.broadcastSelectionChange();
        }

        selectRange(startEl, endEl) {
            if (!startEl || !endEl || !this.container) return;

            const items = Array.from(this.container.querySelectorAll('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile), .masonry-tile:not(.is-back-tile)'));
            const startIndex = items.indexOf(startEl);
            const endIndex = items.indexOf(endEl);

            if (startIndex === -1 || endIndex === -1) return;

            const min = Math.min(startIndex, endIndex);
            const max = Math.max(startIndex, endIndex);

            for (let i = min; i <= max; i++) {
                const el = items[i];
                const id = String(el.dataset.id);
                const type = el.dataset.type || 'file';
                
                this.selectedItems.set(id, { id, type, el });
                el.classList.add('selected');
            }
        }

        selectAll() {
            if (!this.container) return;
            
            const items = this.container.querySelectorAll('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile), .masonry-tile:not(.is-back-tile)');
            items.forEach(el => {
                const id = String(el.dataset.id);
                const type = el.dataset.type || 'file';
                this.selectedItems.set(id, { id, type, el });
                el.classList.add('selected');
            });
            this.broadcastSelectionChange();
        }

        clearSelection() {
            if (this.selectedItems.size === 0) return;

            this.selectedItems.forEach(item => {
                if (item.el && item.el.classList) item.el.classList.remove('selected');
                const el = document.querySelector(`.grid-tile[data-id="${item.id}"], .list-row[data-id="${item.id}"]`);
                if (el) el.classList.remove('selected');
            });

            this.selectedItems.clear();
            this.lastSelectedElement = null;
            this.broadcastSelectionChange();
        }

        restoreSelectionVisuals() {
            if (this.selectedItems.size === 0) return;
            const toDelete = [];
            
            this.selectedItems.forEach((value, id) => {
                const el = document.querySelector(`.grid-tile[data-id="${id}"], .list-row[data-id="${id}"], .masonry-tile[data-id="${id}"]`);
                if (el) {
                    el.classList.add('selected');
                    value.el = el;
                } else {
                    toDelete.push(id);
                }
            });

            if (toDelete.length > 0) {
                toDelete.forEach(id => this.selectedItems.delete(id));
                this.broadcastSelectionChange();
            }
        }

        broadcastSelectionChange() {
            if (window.EventBus) window.EventBus.emit('selection:changed', new Map(this.selectedItems));
        }

        // --- MOBIELE INTERACTIES ---
        initMobileShake() {
            if (typeof window.DeviceMotionEvent === 'undefined') return;
            window.addEventListener('devicemotion', (e) => {
                if (this.selectedItems.size === 0) return; 
                const current = e.accelerationIncludingGravity;
                if (!current) return;
                const currentTime = new Date().getTime();
                
                if ((currentTime - this.lastShakeTime) > 100) {
                    const diffTime = (currentTime - this.lastShakeTime);
                    this.lastShakeTime = currentTime;
                    const speed = Math.abs(current.x + current.y + current.z - this.lastShakeCoords.x - this.lastShakeCoords.y - this.lastShakeCoords.z) / diffTime * 10000;

                    if (speed > 800) { 
                        this.clearSelection();
                        if (window.EventBus) window.EventBus.emit('notify:info', 'Selectie gewist door schudden.');
                    }
                    this.lastShakeCoords.x = current.x;
                    this.lastShakeCoords.y = current.y;
                    this.lastShakeCoords.z = current.z;
                }
            });
        }

        initMobileSwipe() {
            if (!this.container) return;
            let startX = 0;
            let currentX = 0;
            let swipingEl = null;

            this.container.addEventListener('touchstart', (e) => {
                const target = e.target.closest('.list-row, .grid-tile');
                if (!target || e.touches.length > 1) return;
                startX = e.touches[0].clientX;
                swipingEl = target;
                swipingEl.style.transition = 'none';
            }, { passive: true });

            this.container.addEventListener('touchmove', (e) => {
                if (!swipingEl) return;
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                
                if (diff < 0) { 
                    if (e.cancelable) e.preventDefault(); 
                    swipingEl.style.transform = `translateX(${Math.max(diff, -100)}px)`;
                }
            }, { passive: false });

            this.container.addEventListener('touchend', (e) => {
                if (!swipingEl) return;
                const diff = currentX - startX;
                swipingEl.style.transition = 'transform 0.3s ease';
                
                if (diff < -75) { 
                    swipingEl.style.transform = `translateX(0px)`;
                    const id = String(swipingEl.dataset.id);
                    
                    this.clearSelection();
                    this.selectItemByElement(swipingEl);
                    
                    if (window.App && window.App.contextMenu) {
                        window.App.contextMenu.activeIds = [id];
                        window.App.contextMenu.executeAction('delete'); 
                    }
                } else {
                    swipingEl.style.transform = `translateX(0px)`;
                }
                swipingEl = null;
            });
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.App.selectionManager) window.App.selectionManager = new SelectionManager();
    });
})();