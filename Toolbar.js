/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Toolbar.js */

(function() {
    class Toolbar {
        constructor() {
            this.btnAddNew = document.getElementById('btn-add-new');
            this.dropdownAddNew = document.getElementById('dropdown-add-new');
            this.btnNewFolder = document.getElementById('btn-new-folder');
            this.btnUpload = document.getElementById('btn-upload');
            this.btnUploadFolder = document.getElementById('btn-upload-folder');
            
            this.btnFilterToggle = document.getElementById('btn-filter-toggle');
            this.powerMenu = document.getElementById('power-menu');
            this.filterBadge = document.getElementById('filter-badge');
            this.filterLabel = document.getElementById('filter-active-label');
            this.btnClear = document.getElementById('btn-clear-filters');
            this.chipsContainer = document.getElementById('active-filters-container');

            if (this.btnFilterToggle) {
                this.btnFilterToggle.style.position = 'relative';
            }

            this.btnGrid = document.getElementById('btn-view-grid');
            this.btnMasonry = document.getElementById('btn-view-masonry');
            this.btnList = document.getElementById('btn-view-list');
            
            this.zoomSlider = document.getElementById('zoom-slider');
            this.btnZoomOut = document.getElementById('btn-zoom-out');
            this.btnZoomIn = document.getElementById('btn-zoom-in');

            this.currentPath = null;
            this.selectedCount = 0;

            this.initDropdowns();
            this.initFilters();
            this.initViewControls();
            this.initUploadLogic();
            this.initEventBusSync();
            this.initContextLogic(); 
        }

        initEventBusSync() {
            if (window.EventBus) {
                window.EventBus.on('render:complete', () => {
                    this.syncFilterUI();

                    const isRecent = window.App && window.App.renderEngine && window.App.renderEngine.currentMode === 'recent';
                    
                    const updateBtnState = (btn, shouldBeActive, shouldBeDisabled) => {
                        if (!btn) return;
                        if (shouldBeActive) btn.classList.add('active'); else btn.classList.remove('active');
                        if (shouldBeDisabled) {
                            btn.style.opacity = '0.3';
                            btn.style.pointerEvents = 'none';
                        } else {
                            btn.style.opacity = '1';
                            btn.style.pointerEvents = 'auto';
                        }
                    };

                    if (isRecent) {
                        updateBtnState(this.btnList, true, false); 
                        updateBtnState(this.btnGrid, false, true); 
                        updateBtnState(this.btnMasonry, false, true); 
                    } else {
                        if (window.ViewState && window.App.renderEngine) {
                            const key = this.getViewContextKey();
                            const settings = window.ViewState.get(key);
                            updateBtnState(this.btnList, settings.view === 'list', false);
                            updateBtnState(this.btnGrid, settings.view === 'grid', false);
                            updateBtnState(this.btnMasonry, settings.view === 'masonry', false);
                        }
                    }
                });
            }
        }

        initDropdowns() {
            if (this.btnAddNew && this.dropdownAddNew) {
                this.btnAddNew.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dropdownAddNew.classList.toggle('visible');
                    if (this.powerMenu) this.powerMenu.classList.remove('visible');
                });
            }

            if (this.btnFilterToggle && this.powerMenu) {
                this.btnFilterToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.powerMenu.classList.toggle('visible');
                    if (this.dropdownAddNew) this.dropdownAddNew.classList.remove('visible');
                });
            }

            document.addEventListener('click', (e) => {
                if (this.dropdownAddNew && !this.dropdownAddNew.contains(e.target) && !this.btnAddNew.contains(e.target)) {
                    this.dropdownAddNew.classList.remove('visible');
                }
                if (this.powerMenu && !this.powerMenu.contains(e.target) && !this.btnFilterToggle.contains(e.target)) {
                    this.powerMenu.classList.remove('visible');
                }
            });
        }

        syncFilterUI() {
            const fe = window.App?.filterEngine;
            if (!fe || !this.powerMenu) return;

            const setRadio = (name, val) => {
                const r = this.powerMenu.querySelector(`input[name="${name}"][value="${val}"]`);
                if (r) r.checked = true;
            };

            setRadio('sort_field', fe.sortField);
            setRadio('sort_order', fe.sortOrder);
            setRadio('group_by', fe.groupBy);
            setRadio('filter_cat', fe.filterCat);
            setRadio('filter_date', fe.filterDate);
            setRadio('filter_size', fe.filterSize);

            const checkboxes = this.powerMenu.querySelectorAll('input[type="checkbox"][name="filter_ext"]');
            if (checkboxes) checkboxes.forEach(cb => cb.checked = false);
            
            if (fe.activeExtensions) {
                fe.activeExtensions.forEach(ext => {
                    const cb = this.powerMenu.querySelector(`input[name="filter_ext"][value="${ext}"]`);
                    if (cb) cb.checked = true;
                });
            }
            
            this.updateChips();
        }

        initFilters() {
            if (!this.powerMenu) return;

            const notifyRender = () => {
                if (window.App && window.App.renderEngine) {
                    window.App.renderEngine.render();
                }
                this.updateChips();
            };

            const getFE = () => window.App && window.App.filterEngine ? window.App.filterEngine : null;

            setTimeout(() => {
                this.syncFilterUI();
            }, 100);

            const radios = this.powerMenu.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const fe = getFE();
                    if (!fe) return;
                    
                    const name = e.target.name;
                    const val = e.target.value;

                    if (name === 'sort_field') fe.setSort(val, fe.sortOrder);
                    if (name === 'sort_order') fe.setSort(fe.sortField, val);
                    if (name === 'group_by') fe.setGroupBy(val);
                    if (name === 'filter_cat') fe.setCategory(val);
                    if (name === 'filter_date') fe.setDate(val);
                    if (name === 'filter_size') fe.setSize(val);

                    notifyRender();
                });
            });

            const checkboxes = this.powerMenu.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const fe = getFE();
                    if (!fe) return;
                    fe.toggleExtension(e.target.value, e.target.checked);
                    notifyRender();
                });
            });

            if (this.btnClear) {
                this.btnClear.addEventListener('click', () => {
                    const fe = getFE();
                    if (fe) fe.clearAll();
                    
                    this.syncFilterUI();
                    notifyRender();
                    this.powerMenu.classList.remove('visible');
                });
            }
        }

        updateChips() {
            if (!this.chipsContainer) return;
            const fe = window.App?.filterEngine;
            if (!fe) return;

            let count = 0;
            let html = '';

            const createChip = (label, type, val) => {
                count++;
                return `<div class="filter-chip" data-type="${type}" data-val="${val}" style="display:inline-flex; align-items:center; gap:8px; background:rgba(37,99,235,0.1); color:var(--primary); padding:4px 12px; border-radius:20px; font-size:0.85rem; font-weight:600; border:1px solid rgba(37,99,235,0.2); box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                            ${label}
                            <button class="chip-remove" style="background:none; border:none; color:currentColor; font-size:1.2rem; line-height:1; padding:0; margin:0; cursor:pointer; opacity:0.6; display:flex; align-items:center; justify-content:center; height:16px; width:16px; border-radius:50%; transition:all 0.2s;" onmouseover="this.style.opacity='1'; this.style.background='rgba(37,99,235,0.2)';" onmouseout="this.style.opacity='0.6'; this.style.background='none';">&times;</button>
                        </div>`;
            };

            if (fe.filterCat !== 'alles') html += createChip(`Cat: ${fe.filterCat}`, 'cat', fe.filterCat);
            if (fe.filterDate !== 'all') html += createChip(`Datum: ${fe.filterDate}`, 'date', fe.filterDate);
            if (fe.filterSize !== 'all') html += createChip(`Grootte: ${fe.filterSize}`, 'size', fe.filterSize);
            
            fe.activeExtensions.forEach(ext => {
                html += createChip(`Ext: .${ext.split(',')[0]}`, 'ext', ext);
            });

            if (fe.groupBy !== 'none') html += createChip(`Groep: ${fe.groupBy}`, 'group', fe.groupBy);

            this.chipsContainer.innerHTML = html;

            if (this.filterBadge) {
                this.filterBadge.textContent = count > 0 ? count : '';
                this.filterBadge.style.display = count > 0 ? 'flex' : 'none';
                this.filterBadge.style.position = 'absolute';
                this.filterBadge.style.top = '-6px';
                this.filterBadge.style.right = '-6px';
                this.filterBadge.style.background = '#ef4444';
                this.filterBadge.style.color = 'white';
                this.filterBadge.style.width = '18px';
                this.filterBadge.style.height = '18px';
                this.filterBadge.style.borderRadius = '50%';
                this.filterBadge.style.alignItems = 'center';
                this.filterBadge.style.justifyContent = 'center';
                this.filterBadge.style.fontSize = '10px';
                this.filterBadge.style.fontWeight = 'bold';
                this.filterBadge.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.4)';
            }

            this.chipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const chip = e.target.closest('.filter-chip');
                    const type = chip.dataset.type;
                    const val = chip.dataset.val;

                    if (type === 'cat') { fe.setCategory('alles'); }
                    if (type === 'date') { fe.setDate('all'); }
                    if (type === 'size') { fe.setSize('all'); }
                    if (type === 'group') { fe.setGroupBy('none'); }
                    if (type === 'ext') { fe.toggleExtension(val, false); }

                    this.syncFilterUI();
                    if (window.App.renderEngine) window.App.renderEngine.render();
                });
            });
        }

        updateCounts(counts) {
            if (!this.powerMenu) return;
            for (const [ext, count] of Object.entries(counts)) {
                const badge = this.powerMenu.querySelector(`.filter-count[data-count="${ext}"]`);
                if (badge) badge.textContent = count;
            }
        }

        getViewContextKey() {
            if (!window.App || !window.App.renderEngine) return 'root';
            const re = window.App.renderEngine;
            if (re.currentMode === 'folder') return re.currentFolderId || 'root';
            if (re.currentMode === 'tag_detail') return 'tag_' + re.currentTagName;
            if (re.currentMode === 'album_detail') return 'album_' + re.currentAlbumId;
            return re.currentMode;
        }

        initViewControls() {
            const updateZoom = (val) => {
                if (!this.zoomSlider) return;
                this.zoomSlider.value = val;
                document.documentElement.style.setProperty('--zoom-level', `${val}px`);
                
                if (window.ViewState && window.App && window.App.renderEngine) {
                    const key = this.getViewContextKey();
                    const currentView = window.ViewState.get(key).view;
                    window.ViewState.setGlobalZoom(val);
                    window.ViewState.set(key, currentView, val);
                    
                    if (currentView === 'masonry') window.App.renderEngine.render();
                }
            };

            if (this.zoomSlider) {
                this.zoomSlider.addEventListener('input', (e) => document.documentElement.style.setProperty('--zoom-level', `${e.target.value}px`));
                this.zoomSlider.addEventListener('change', (e) => updateZoom(parseInt(e.target.value, 10)));
            }

            if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => updateZoom(Math.max(100, parseInt(this.zoomSlider.value, 10) - 25)));
            if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => updateZoom(Math.min(400, parseInt(this.zoomSlider.value, 10) + 25)));

            const toggleView = (v) => {
                if (window.App && window.App.renderEngine && window.App.renderEngine.currentMode === 'recent') return;
                if (this.btnGrid) this.btnGrid.classList.toggle('active', v === 'grid');
                if (this.btnList) this.btnList.classList.toggle('active', v === 'list');
                if (this.btnMasonry) this.btnMasonry.classList.toggle('active', v === 'masonry');
                
                if (window.ViewState && window.App && window.App.renderEngine) {
                    const key = this.getViewContextKey();
                    const currentZoom = window.ViewState.get(key).zoom;
                    window.ViewState.set(key, v, currentZoom);
                    window.App.renderEngine.render();
                }
            };
            
            if (this.btnGrid) this.btnGrid.addEventListener('click', () => toggleView('grid'));
            if (this.btnList) this.btnList.addEventListener('click', () => toggleView('list'));
            if (this.btnMasonry) this.btnMasonry.addEventListener('click', () => toggleView('masonry'));

            setTimeout(() => {
                if (window.ViewState && window.App && window.App.renderEngine) {
                    const key = this.getViewContextKey();
                    const settings = window.ViewState.get(key);
                    
                    if(this.zoomSlider) this.zoomSlider.value = settings.zoom;
                    document.documentElement.style.setProperty('--zoom-level', `${settings.zoom}px`);
                    
                    if (window.App.renderEngine.currentMode !== 'recent') {
                        if (this.btnGrid) this.btnGrid.classList.toggle('active', settings.view === 'grid');
                        if (this.btnList) this.btnList.classList.toggle('active', settings.view === 'list');
                        if (this.btnMasonry) this.btnMasonry.classList.toggle('active', settings.view === 'masonry');
                    }
                }
            }, 300);
        }

        initUploadLogic() {
            if(this.btnNewFolder) {
                this.btnNewFolder.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.ModalService) {
                        window.ModalService.prompt('Nieuwe Map', 'Naam van de nieuwe map:').then(async val => {
                            if(val) {
                                try {
                                    const resCsrf = await fetch('/api/csrf');
                                    const dataCsrf = await resCsrf.json();
                                    const currentFolderId = window.App.renderEngine ? window.App.renderEngine.currentFolderId : null;
                                    
                                    const res = await fetch('/api/folders/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ parent_id: currentFolderId, name: val, csrf_token: dataCsrf.csrf_token })
                                    });
                                    if (res.ok && window.EventBus) {
                                        window.EventBus.emit('view:refresh');
                                        window.EventBus.emit('notify:success', `Map '${val}' succesvol aangemaakt!`);
                                    }
                                } catch(err) {
                                    console.error(err);
                                }
                            }
                        });
                    }
                    if(this.dropdownAddNew) this.dropdownAddNew.classList.remove('visible');
                });
            }

            // FASE 4 FIX: Directe koppeling naar de veilige In-Memory Uploader motor!
            if(this.btnUpload) {
                this.btnUpload.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if(window.App && window.App.uploader) window.App.uploader.openFileDialog();
                    if (this.dropdownAddNew) this.dropdownAddNew.classList.remove('visible');
                });
            }
            
            if(this.btnUploadFolder) {
                this.btnUploadFolder.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if(window.App && window.App.uploader) window.App.uploader.openFolderDialog();
                    if (this.dropdownAddNew) this.dropdownAddNew.classList.remove('visible');
                });
            }
        }

        initContextLogic() {
            this.toolbarLeft = document.querySelector('.toolbar-left');
            if (!this.toolbarLeft) return;

            this.contextGroup = document.createElement('div');
            this.contextGroup.className = 'context-toolbar-group';
            this.contextGroup.style.display = 'none';
            this.contextGroup.style.alignItems = 'center';
            this.contextGroup.style.gap = '8px';
            this.contextGroup.style.animation = 'fadeIn 0.2s ease-in-out';
            
            if (this.btnAddNew) {
                this.btnAddNew.parentNode.insertBefore(this.contextGroup, this.btnAddNew.nextSibling);
            } else {
                this.toolbarLeft.appendChild(this.contextGroup);
            }

            if (window.EventBus) {
                window.EventBus.on('selection:changed', (selectedMap) => this.handleSelection(selectedMap));
                window.EventBus.on('navigation:navigate', (path) => this.handleNavigation(path));
            }
        }

        handleSelection(selectedMap) {
            this.selectedCount = selectedMap ? selectedMap.size : 0;
            
            if (this.selectedCount > 0) {
                if (this.btnAddNew) this.btnAddNew.style.display = 'none';
                if (this.btnFilterToggle) this.btnFilterToggle.style.display = 'none'; 
                
                this.contextGroup.style.display = 'flex';
                this.renderContextButtons(this.selectedCount, selectedMap);
            } else {
                this.resetToDefaultToolbar();
            }
        }

        handleNavigation(path) {
            this.currentPath = path;
            
            if (path === 'trash') {
                if (this.btnAddNew) this.btnAddNew.style.display = 'none';
                if (this.btnFilterToggle) this.btnFilterToggle.style.display = 'none';
                this.contextGroup.style.display = 'flex';
                this.renderTrashButtons();
            } else {
                this.resetToDefaultToolbar();
                if (window.App && window.App.selectionManager) {
                    this.handleSelection(window.App.selectionManager.selectedItems);
                }
            }
        }

        resetToDefaultToolbar() {
            const pathStr = String(this.currentPath || 'root');
            const isReadonly = ['trash', 'recent', 'favorites', 'albums_overview', 'tags_overview', 'slideshows_overview'].includes(pathStr) || 
                               pathStr.startsWith('album_') || 
                               pathStr.startsWith('tag_detail_') ||
                               pathStr.startsWith('slideshow_');

            if (this.btnAddNew) {
                this.btnAddNew.style.display = isReadonly ? 'none' : 'flex';
            }
            if (this.btnFilterToggle) {
                this.btnFilterToggle.style.display = pathStr === 'trash' ? 'none' : 'flex';
            }
            this.contextGroup.style.display = 'none';
            this.contextGroup.innerHTML = '';
        }

        renderContextButtons(count, selectedMap) {
            let html = `
                <span class="context-count-badge" style="font-size: 0.85rem; font-weight: 600; margin-right: 12px; color: var(--primary); background: rgba(37,99,235,0.1); padding: 4px 10px; border-radius: 12px;">
                    ${count} geselecteerd
                </span>
            `;

            html += `
                <button class="btn btn-icon context-action" data-action="download" title="Downloaden" style="border: 1px solid var(--border-dropdown); background: transparent; padding: 6px; border-radius: 8px; cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button class="btn btn-icon context-action" data-action="move" title="Verplaatsen" style="border: 1px solid var(--border-dropdown); background: transparent; padding: 6px; border-radius: 8px; cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3-3 3M2 12h20M12 2v20"></path></svg>
                </button>
                <button class="btn btn-icon context-action" data-action="share" title="Delen" style="border: 1px solid var(--border-dropdown); background: transparent; padding: 6px; border-radius: 8px; cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            `;

            if (count === 1) {
                html += `
                    <button class="btn btn-icon context-action" data-action="rename" title="Hernoemen" style="border: 1px solid var(--border-dropdown); background: transparent; padding: 6px; border-radius: 8px; cursor: pointer;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                `;
            }

            html += `
                <div style="width: 1px; height: 24px; background: var(--border-dropdown); margin: 0 8px;"></div>
                <button class="btn btn-icon context-action danger-hover" style="color: var(--error); border: 1px solid var(--error); background: transparent; padding: 6px; border-radius: 8px; cursor: pointer;" data-action="delete" title="Verwijderen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;

            this.contextGroup.innerHTML = html;
            this.attachContextEvents(selectedMap);
        }

        renderTrashButtons() {
            let html = `
                <button class="btn btn-primary context-action" data-action="restore_all" style="background: var(--success); border-color: var(--success); color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; font-size: 0.9rem; font-weight: 500;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Alles Herstellen
                </button>
                <button class="btn btn-danger context-action" data-action="empty_trash" style="background: var(--error); border-color: var(--error); color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; font-size: 0.9rem; font-weight: 500;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Prullenbak Legen
                </button>
            `;
            
            this.contextGroup.innerHTML = html;
            
            this.contextGroup.querySelectorAll('.context-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    if (window.App && window.App.contextMenu) {
                        window.App.contextMenu.executeAction(action);
                    } else if (window.EventBus) {
                        window.EventBus.emit(`trash:${action}`);
                    }
                });
            });
        }

        attachContextEvents(selectedMap) {
            this.contextGroup.querySelectorAll('.context-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    if (window.App && window.App.contextMenu) {
                        const ids = Array.from(selectedMap.keys());
                        window.App.contextMenu.activeIds = ids;
                        window.App.contextMenu.executeAction(action);
                    }
                });
            });
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.toolbar = new Toolbar();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();