/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/Render.js */

(function() {
    class RenderEngine {
        constructor() {
            this.container = document.getElementById('file-view');
            this.currentFolderId = null; 
            this.currentMode = 'folder'; 
            this.currentTagName = null; 
            this.currentAlbumId = null;
            this.currentData = { breadcrumbs: [], folders: [], files: [] };
            
            this.isFetchingData = false; 
            this.lastRenderContext = null;
            
            this.recentFilter = 'all';
            this.recentDays = 30;
            
            this.injectDynamicStyles();
            this.initListeners();
            this.initTabSync();
            
            // FASE 5 FIX: Patch VirtualScroll om List/Masonry views te beschermen tegen blanco tegels
            this.patchVirtualScroll();

            setTimeout(() => {
                if (window.EventBus) {
                    window.EventBus.emit('navigation:navigate', 'dashboard');
                }
            }, 50);
        }

        // FASE 4 FIX: Kruisbesmetting / XSS Beveiliging. 
        // Filtert gevaarlijke tekens uit gebruikersinvoer voordat ze in de DOM komen.
        escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // FASE 5 FIX: Veiligheidspatch voor VirtualScroll
        patchVirtualScroll() {
            if (window.App && window.App.virtualScroll && !window.App.virtualScroll.isPatchedByRenderEngine) {
                const vs = window.App.virtualScroll;
                const origCleanup = vs.cleanupContent.bind(vs);
                
                vs.cleanupContent = function(element) {
                    if (element.classList.contains('vs-rendered')) {
                        element.classList.remove('vs-rendered');
                        const videos = element.querySelectorAll('video');
                        videos.forEach(vid => { if (!vid.paused) vid.pause(); });

                        // Recycle ALLEEN grid-tiles (de grote RAM vreters). Laat lijstweergave intact!
                        if (element.classList.contains('grid-tile') && !element.classList.contains('is-back-tile') && element.dataset.id) {
                            element.innerHTML = '';
                            element.dataset.cleared = 'true';
                        }
                    }
                };
                vs.isPatchedByRenderEngine = true;
            }
        }

        // FASE 5 FIX: Herbouw de tegel HTML als we er weer naartoe scrollen
        rebuildTile(element, itemData, type) {
            if (!itemData || !element.classList.contains('grid-tile')) return;
            
            if (window.App && window.App.tileBuilder) {
                let tempTile = window.App.tileBuilder.build(itemData, type, 0, this.currentMode);
                if (typeof tempTile === 'string') {
                    const temp = document.createElement('div');
                    temp.innerHTML = tempTile;
                    tempTile = temp.firstElementChild;
                }
                
                if (tempTile) {
                    element.innerHTML = tempTile.innerHTML;
                    
                    // Herstel interacties, overlays en selectiestatus
                    this.attachInteractionEvents(element, itemData, type);
                    this.applyOverlays(element, itemData, type);
                    
                    if (window.App.selectionManager && window.App.selectionManager.selectedItems.has(String(itemData.id))) {
                        element.classList.add('selected');
                    } else {
                        element.classList.remove('selected');
                    }
                }
            }
        }

        hasPerm(key) {
            if (window.currentUser && window.currentUser.role === 'admin') return true;
            if (window.currentUser && window.currentUser.role_id === 1) return true; 
            return window.currentUser && window.currentUser.permissions && window.currentUser.permissions[key] === true;
        }

        getIconForExtension(ext) {
            const e = (ext || '').toLowerCase();
            
            if (['jpg','jpeg','png','gif','webp','heic'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            if (['svg'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            
            if (['mp4','webm','mov','avi','mkv'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
            
            if (['mp3','wav','ogg','flac'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;

            if (['pdf'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            if (['doc','docx'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            if (['xls','xlsx','csv'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="12" y1="13" x2="12" y2="22"></line></svg>`;
            if (['ppt','pptx'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            if (['txt'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            
            if (['html','css','js','php','py','java','c','cpp'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
            if (['json','xml','sql'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;

            if (['zip','rar','7z','tar','gz'].includes(e)) return `<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
            
            return `<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
        }

        shuffleArray(array) {
            let newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

        injectDynamicStyles() {
            if (document.getElementById('render-dynamic-styles')) return;
            const style = document.createElement('style');
            style.id = 'render-dynamic-styles';
            style.innerHTML = `
                @keyframes starburst {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.4) rotate(15deg); filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                .animate-starburst svg { animation: starburst 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .btn-favorite { opacity: 0; pointer-events: auto; }
                .grid-tile:hover .btn-favorite, .list-row:hover .btn-favorite { opacity: 1; }
                .btn-favorite.active { opacity: 1 !important; }
                .btn-favorite:hover { transform: scale(1.1); }
                
                .tag-dot-container { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px; z-index: 5; }
                .tag-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.4); transition: transform 0.2s; }
                .tag-dot:hover { transform: scale(1.5); }
                .list-tag-dots { display: inline-flex; gap: 4px; vertical-align: middle; margin-left: 10px; }
                .list-tag-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }

                .render-loading-bar {
                    position: absolute; top: 0; left: 0; height: 3px; background: var(--primary);
                    animation: loadingBar 1s infinite linear; z-index: 9999;
                }
                @keyframes loadingBar { 
                    0% { width: 0%; left: 0; } 
                    50% { width: 50%; left: 25%; } 
                    100% { width: 0%; left: 100%; } 
                }
                
                @keyframes slideInFade {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .staggered-entry {
                    opacity: 0;
                    animation: slideInFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }

                body.is-viewer-mode .drag-overlay { background: rgba(239, 68, 68, 0.8) !important; }
                body.is-viewer-mode .drag-overlay::after { content: "Je kunt hier niet uploaden (Alleen Lezen)"; color: white; font-size: 2rem; font-weight: bold; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }

                .recent-dashboard { max-width: 1400px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; animation: slideInFade 0.4s ease; }
                .cover-flow-wrapper { display: flex; gap: 16px; overflow-x: auto; padding: 10px 4px 20px 4px; scroll-snap-type: x mandatory; scrollbar-width: none; }
                .cover-flow-wrapper::-webkit-scrollbar { display: none; }
                .cover-item { min-width: 200px; height: 140px; border-radius: 16px; background-color: var(--bg-surface); background-size: cover; background-position: center; border: 1px solid var(--border-dropdown); box-shadow: 0 10px 20px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s; scroll-snap-align: start; position: relative; overflow: hidden; flex-shrink: 0; }
                .cover-item:hover { transform: translateY(-8px) scale(1.05); box-shadow: 0 15px 30px rgba(0,0,0,0.2); z-index: 10; border-color: var(--primary); }
                .cover-item-label { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(15,23,42,0.9), transparent); padding: 20px 12px 10px 12px; color: white; font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .recent-controls { display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 16px 24px; border-radius: 16px; border: 1px solid var(--border-dropdown); flex-wrap: wrap; gap: 16px; }
                .r-filter-btn { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-dropdown); padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; }
                .r-filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 10px rgba(37,99,235,0.3); }
                
                .time-slider-container { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); }
                .time-slider { -webkit-appearance: none; width: 150px; height: 6px; background: var(--border-dropdown); border-radius: 3px; outline: none; }
                .time-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--primary); cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

                .recent-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
                @media (max-width: 1024px) { .recent-grid { grid-template-columns: 1fr; } }

                .timeline-group-header { font-size: 0.9rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; display: flex; align-items: center; gap: 12px; }
                .timeline-group-header::after { content: ''; flex: 1; height: 1px; background: var(--border-dropdown); }
                .timeline-item { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 12px; margin-bottom: 8px; transition: transform 0.2s, box-shadow 0.2s; cursor: grab; }
                .timeline-item:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.05); border-color: var(--primary); }
                .timeline-item.dragging { opacity: 0.5; }
                .timeline-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(128,128,128,0.1); flex-shrink: 0; overflow: hidden; }
                .timeline-info { flex: 1; min-width: 0; }
                .timeline-title { font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; }
                .timeline-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px; }

                .recent-widgets { display: flex; flex-direction: column; gap: 16px; }
                .r-widget { background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
                .r-widget-title { font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
                
                .r-widget-list { max-height: 250px; overflow-y: auto; padding-right: 8px; }
                .r-widget-list::-webkit-scrollbar { width: 6px; }
                .r-widget-list::-webkit-scrollbar-track { background: transparent; }
                .r-widget-list::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 4px; }
                .r-widget-list::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.4); }

                .r-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid rgba(128,128,128,0.05); font-size: 0.85rem; border-radius: 8px; transition: background 0.2s; }
                .r-list-item:hover { background: rgba(128,128,128,0.05); }
                .r-list-item:last-child { border-bottom: none; }
                .r-list-name { font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
                .r-list-val { color: var(--text-muted); font-weight: 500; }

                .mini-trash-zone { border: 2px dashed #ef4444; border-radius: 16px; padding: 30px; text-align: center; background: rgba(239,68,68,0.05); transition: all 0.2s; color: #ef4444; display: flex; flex-direction: column; align-items: center; gap: 10px; font-weight: 600; cursor: default; }
                .mini-trash-zone.drag-over { background: rgba(239,68,68,0.15); transform: scale(1.02); box-shadow: 0 10px 20px rgba(239,68,68,0.2); border-color: #dc2626; }
                
                .audit-item { display: flex; gap: 12px; padding: 10px 0; font-size: 0.8rem; border-bottom: 1px solid rgba(128,128,128,0.05); }
                .audit-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 6px; flex-shrink: 0; }
                .audit-text { color: var(--text-main); }
                .audit-time { color: var(--text-muted); font-size: 0.75rem; margin-top: 2px; }

                .btn-zip-download {
                    position: absolute; bottom: 8px; left: 8px; background: var(--bg-surface); 
                    border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
                    z-index: 10; cursor: pointer; border: 1px solid var(--border-dropdown); 
                    color: var(--text-main); transition: all 0.2s; opacity: 0;
                }
                .grid-tile:hover .btn-zip-download, .list-row:hover .btn-zip-download { opacity: 1; }
                .btn-zip-download:hover { transform: scale(1.1); color: var(--primary); border-color: var(--primary); }
            `;
            document.head.appendChild(style);
        }

        toggleToolbarMode(mode) {
            const tb = document.getElementById('main-toolbar');
            const btnAdd = document.getElementById('btn-add-new');
            
            if (tb) tb.style.display = (mode === 'recent' || mode === 'tags_overview' || mode === 'albums_overview' || mode === 'dashboard' || mode === 'settings' || mode === 'admin' || mode === 'shares') ? 'none' : 'flex';
            
            const role = this.currentData.current_role;
            const isReadonly = (role === 'viewer');
            
            const canAdd = (this.hasPerm('folder_create') || this.hasPerm('file_upload')) && !isReadonly;
            if (btnAdd) {
                if (mode === 'shared_with_me') btnAdd.style.display = 'none';
                else btnAdd.style.display = (mode === 'folder' && canAdd) ? 'inline-flex' : 'none';
            }

            let btnEmptyTrash = document.getElementById('btn-empty-trash-toolbar');
            if (!btnEmptyTrash && tb) {
                const leftArea = tb.querySelector('.toolbar-left');
                if (leftArea) {
                    btnEmptyTrash = document.createElement('button');
                    btnEmptyTrash.id = 'btn-empty-trash-toolbar';
                    btnEmptyTrash.className = 'btn-sm btn-secondary';
                    btnEmptyTrash.style.cssText = 'padding: 8px 16px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; color: var(--error); border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); cursor: pointer; transition: all 0.2s;';
                    btnEmptyTrash.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Prullenbak Legen`;
                    btnEmptyTrash.onmouseenter = () => btnEmptyTrash.style.background = 'rgba(239, 68, 68, 0.1)';
                    btnEmptyTrash.onmouseleave = () => btnEmptyTrash.style.background = 'rgba(239, 68, 68, 0.05)';
                    btnEmptyTrash.onclick = () => {
                        if (window.App && window.App.contextMenu) window.App.contextMenu.executeAction('empty_trash');
                    };
                    leftArea.appendChild(btnEmptyTrash);
                }
            }
            if (btnEmptyTrash) btnEmptyTrash.style.display = (mode === 'trash' && this.hasPerm('trash_empty')) ? 'inline-flex' : 'none';

            let btnAssign = document.getElementById('btn-assign-toolbar');
            if (!btnAssign && tb) {
                const leftArea = tb.querySelector('.toolbar-left');
                if (leftArea) {
                    btnAssign = document.createElement('button');
                    btnAssign.id = 'btn-assign-toolbar';
                    btnAssign.className = 'btn-primary';
                    btnAssign.style.cssText = 'padding: 8px 16px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; background: var(--primary); color: white; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); transition: all 0.2s;';
                    btnAssign.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Koppelen`;
                    btnAssign.onmouseenter = () => btnAssign.style.transform = 'translateY(-1px)';
                    btnAssign.onmouseleave = () => btnAssign.style.transform = 'none';
                    btnAssign.onclick = () => {
                        if (this.currentMode === 'album_detail' && this.currentAlbumId) {
                            if (window.EventBus) window.EventBus.emit('album:add_files', this.currentAlbumId);
                        } else if (this.currentMode === 'tag_detail' && this.currentTagName) {
                            if (window.EventBus) window.EventBus.emit('tag:add_files', this.currentTagName);
                        }
                    };
                    leftArea.appendChild(btnAssign);
                }
            }
            
            const canAssign = (mode === 'album_detail' && this.hasPerm('album_edit')) || (mode === 'tag_detail' && this.hasPerm('tag_assign'));
            if (btnAssign) btnAssign.style.display = canAssign ? 'inline-flex' : 'none';

            let btnEdit = document.getElementById('btn-edit-toolbar');
            if (!btnEdit && tb) {
                const leftArea = tb.querySelector('.toolbar-left');
                if (leftArea) {
                    btnEdit = document.createElement('button');
                    btnEdit.id = 'btn-edit-toolbar';
                    btnEdit.className = 'btn-secondary';
                    btnEdit.style.cssText = 'padding: 8px 16px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; background: rgba(128,128,128,0.05); color: var(--text-main); border: 1px solid var(--border-dropdown); cursor: pointer; transition: all 0.2s; margin-left: 8px;';
                    btnEdit.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Bewerken`;
                    btnEdit.onmouseenter = () => btnEdit.style.background = 'rgba(128,128,128,0.1)';
                    btnEdit.onmouseleave = () => btnEdit.style.background = 'rgba(128,128,128,0.05)';
                    btnEdit.onclick = () => {
                        if (this.currentMode === 'album_detail' && this.currentAlbumId) {
                            if (window.EventBus) window.EventBus.emit('album:edit', this.currentAlbumId);
                        } else if (this.currentMode === 'tag_detail' && this.currentTagName) {
                            if (window.EventBus) window.EventBus.emit('tag:edit', this.currentTagName);
                        }
                    };
                    leftArea.appendChild(btnEdit);
                }
            }
            
            const canEdit = (mode === 'album_detail' && this.hasPerm('album_edit')) || (mode === 'tag_detail' && this.hasPerm('tag_manage'));
            if (btnEdit) btnEdit.style.display = canEdit ? 'inline-flex' : 'none';
        }

        resetSearch() {
            const searchInput = document.getElementById('spotlight-search');
            if (searchInput && searchInput.value !== '') {
                searchInput.value = '';
                if (window.App && window.App.filterEngine) window.App.filterEngine.setSearch('');
            }
        }

        clearSelection() {
            if (window.App && window.App.selectionManager) {
                if (typeof window.App.selectionManager.clear === 'function') window.App.selectionManager.clear();
                if (typeof window.App.selectionManager.clearSelection === 'function') window.App.selectionManager.clearSelection();
            }
        }

        initTabSync() {
            window.addEventListener('storage', (e) => {
                if (e.key === 'fm_tab_sync' && e.newValue) {
                    try {
                        const data = JSON.parse(e.newValue);
                        if (data.action === 'refresh_view' && data.timestamp > Date.now() - 5000) {
                            this.refreshCurrentView();
                        }
                    } catch (err) {}
                }
            });
        }

        broadcastSync() {
            localStorage.setItem('fm_tab_sync', JSON.stringify({ action: 'refresh_view', timestamp: Date.now() }));
        }

        refreshCurrentView() {
            if (this.currentMode === 'folder') this.loadFolder(this.currentFolderId);
            else if (this.currentMode === 'recent') this.loadRecent();
            else if (this.currentMode === 'favorites') this.loadFavorites();
            else if (this.currentMode === 'trash') this.loadTrash();
            else if (this.currentMode === 'shared_with_me') this.loadSharedWithMe(); 
            else if (this.currentMode === 'tags_overview') this.loadTagsOverview();
            else if (this.currentMode === 'albums_overview') this.loadAlbumsOverview();
            else if (this.currentMode === 'tag_detail' && this.currentTagName) this.loadTagDetail(this.currentTagName);
            else if (this.currentMode === 'album_detail' && this.currentAlbumId) this.loadAlbumDetail(this.currentAlbumId);
        }

        getContextKey() {
            if (this.currentMode === 'folder') return 'category_folder';
            if (this.currentMode === 'tag_detail' || this.currentMode === 'tags_overview') return 'category_tag';
            if (this.currentMode === 'album_detail' || this.currentMode === 'albums_overview') return 'category_album';
            if (this.currentMode === 'shared_with_me') return 'category_shared';
            return 'category_' + this.currentMode;
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('navigation:navigate', (path) => {
                    this.resetSearch(); 
                    
                    if (path === 'dashboard' || path === 'settings' || path === 'admin') {
                        this.currentMode = path;
                        return;
                    }
                    
                    if (path === 'shares') {
                        this.currentMode = path;
                        this.toggleToolbarMode(path);
                        if (window.Shares) {
                            if (!window.App.sharesViewInstance) window.App.sharesViewInstance = new window.Shares();
                            window.App.sharesViewInstance.render();
                        }
                        return;
                    }

                    if (path === 'tags_overview') return this.loadTagsOverview();
                    if (path === 'albums_overview') return this.loadAlbumsOverview();
                    if (path === 'favorites') return this.loadFavorites();
                    if (path === 'recent') return this.loadRecent();
                    if (path === 'trash') return this.loadTrash();
                    if (path === 'shared_with_me') return this.loadSharedWithMe();
                    
                    if (typeof path === 'string' && path.startsWith('tag_detail_')) return this.loadTagDetail(path.replace('tag_detail_', ''));
                    if (typeof path === 'string' && path.startsWith('album_')) return this.loadAlbumDetail(path.replace('album_', ''));
                    
                    if (path === '/' || path === null || path === 'root') this.loadFolder(null);
                    else this.loadFolder(path);
                });

                window.EventBus.on('navigation:action', (action) => {
                    this.resetSearch();
                    if (action === 'recent') this.loadRecent();
                    else if (action === 'favorites') this.loadFavorites();
                    else if (action === 'tags_overview') this.loadTagsOverview();
                    else if (action === 'albums_overview') this.loadAlbumsOverview();
                    else if (action === 'trash') this.loadTrash();
                    else if (action === 'shared_with_me') this.loadSharedWithMe();
                });

                window.EventBus.on('filter:tag', (tagName) => {
                    this.resetSearch();
                    setTimeout(() => this.loadTagDetail(tagName), 50); 
                });

                window.EventBus.on('favorite:toggled', (data) => {
                    const targetList = data.type === 'folder' ? this.currentData.folders : this.currentData.files;
                    if (targetList) {
                        const dataItem = targetList.find(i => String(i.id) === String(data.id));
                        if (dataItem) dataItem.is_favorite = data.is_favorite;
                    }

                    const el = document.querySelector(`.grid-tile[data-id="${data.id}"], .list-row[data-id="${data.id}"], .masonry-tile[data-id="${data.id}"]`);
                    if (el) {
                        const btnFav = el.querySelector('.btn-favorite');
                        if (btnFav) {
                            if (data.is_favorite) {
                                btnFav.classList.add('active', 'animate-starburst');
                                btnFav.style.color = '#f59e0b';
                                const svg = btnFav.querySelector('svg');
                                if (svg) svg.setAttribute('fill', '#f59e0b');
                            } else {
                                btnFav.classList.remove('active', 'animate-starburst');
                                btnFav.style.color = 'rgba(128,128,128,0.5)';
                                const svg = btnFav.querySelector('svg');
                                if (svg) svg.setAttribute('fill', 'none');
                            }
                        }

                        if (this.currentMode === 'favorites' && !data.is_favorite) {
                            el.style.opacity = '0';
                            el.style.transform = 'scale(0.9)';
                            setTimeout(() => {
                                el.remove();
                                const remaining = this.container.querySelectorAll('.grid-tile, .list-row, .masonry-tile').length;
                                const headerCount = document.querySelector('.view-header-count');
                                if (headerCount) headerCount.textContent = remaining;
                                if (remaining === 0 && window.App.emptyStates) {
                                    window.App.emptyStates.render(this.container, this.currentMode);
                                }
                            }, 200);
                        }
                    }
                });

                window.EventBus.on('view:refresh', () => this.refreshCurrentView());
            }

            setTimeout(() => {
                document.querySelectorAll('.toolbar-right button, .toolbar-right .btn-icon-small').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const title = (btn.title || '').toLowerCase();
                        const html = btn.innerHTML.toLowerCase();
                        let viewType = null;

                        if (title.includes('lijst') || title.includes('list') || html.includes('list') || html.includes('line')) viewType = 'list';
                        else if (title.includes('tegel') || title.includes('grid') || html.includes('grid') || html.includes('rect')) viewType = 'grid';
                        else if (title.includes('pinterest') || title.includes('masonry') || html.includes('columns')) viewType = 'masonry';
                        
                        if (viewType) {
                            e.preventDefault();
                            document.querySelectorAll('.toolbar-right button, .toolbar-right .btn-icon-small').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');

                            const contextKey = this.getContextKey();
                            
                            if (window.ViewState) {
                                window.ViewState.set(contextKey, viewType);
                                this.render();
                            }
                        }
                    });
                });
            }, 500);
        }

        showLoadingState() {
            if (this.isFetchingData) return;
            this.isFetchingData = true;
            let bar = document.getElementById('render-loading-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'render-loading-bar';
                bar.className = 'render-loading-bar';
                if (this.container) {
                    this.container.style.position = 'relative'; 
                    this.container.appendChild(bar);
                }
            } else {
                bar.style.display = 'block';
            }
        }

        hideLoadingState() {
            this.isFetchingData = false;
            let bar = document.getElementById('render-loading-bar');
            if (bar) bar.style.display = 'none';
        }

        async loadFolder(folderId) {
            this.currentMode = 'folder';
            this.currentFolderId = folderId;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.showLoadingState();

            try {
                if (window.App && window.App.fileApi) {
                    this.currentData = await window.App.fileApi.getFolder(folderId);
                    this.hideLoadingState();
                    this.render();
                }
            } catch (err) {
                this.hideLoadingState();
                this.container.innerHTML = `<h2>Verbindingsfout: ${this.escapeHTML(err.message)}</h2>`;
            }
        }

        async loadSharedWithMe() {
            this.currentMode = 'shared_with_me';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.showLoadingState();

            try {
                const res = await fetch('/api/files?action=shared_with_me');
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success') {
                        this.currentData = json.data;
                    }
                }
                this.hideLoadingState();
                this.render();
            } catch (err) {
                this.hideLoadingState();
                this.currentData = { breadcrumbs: [{ id: 'shared_with_me', name: 'Gedeeld met mij' }], folders: [], files: [] };
                this.render();
            }
        }

        async loadRecent() {
            this.currentMode = 'recent';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.showLoadingState();

            try {
                const res = await fetch('/api/files?action=recent_rich');
                const json = await res.json();
                if (json.status === 'success') {
                    this.currentData = json.data;
                }
                this.hideLoadingState();
                this.render();
            } catch (err) {
                this.hideLoadingState();
                this.currentData = { timeline: [] };
                this.render();
            }
        }

        async loadFavorites() {
            this.currentMode = 'favorites';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.showLoadingState();

            try {
                if (window.App && window.App.fileApi) {
                    this.currentData = await window.App.fileApi.getFavorites();
                    this.hideLoadingState();
                    this.render();
                }
            } catch (err) {
                this.hideLoadingState();
                this.currentData = { breadcrumbs: [{ id: 'favorites', name: 'Favorieten' }], folders: [], files: [] };
                this.render();
            }
        }

        async loadTrash() {
            this.currentMode = 'trash';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.showLoadingState();

            try {
                if (window.App && window.App.fileApi) {
                    this.currentData = await window.App.fileApi.getTrash();
                    this.hideLoadingState();
                    this.render();
                }
            } catch (err) {
                this.hideLoadingState();
                this.currentData = { breadcrumbs: [{ id: 'trash', name: 'Prullenbak' }], folders: [], files: [] };
                this.render();
            }
        }

        async loadAlbumDetail(albumId) {
            this.currentMode = 'album_detail';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = albumId;
            this.clearSelection();
            this.toggleToolbarMode('album_detail'); 
            this.showLoadingState();

            try {
                const res = await fetch(`/api/albums/contents?id=${albumId}`);
                const json = await res.json();
                
                if (json.status === 'locked') {
                    this.currentData = { status: 'locked', breadcrumbs: [] };
                    this.hideLoadingState();
                    this.container.innerHTML = '';
                    this.fireRenderComplete(); 
                    return;
                }

                if (json.status === 'success') {
                    this.currentData = json.data;
                    this.currentData.status = 'success';
                    this.hideLoadingState();
                    this.render();
                } else {
                    throw new Error(json.message);
                }
            } catch (err) {
                console.error("Album laden mislukt:", err);
                this.hideLoadingState();
                this.currentData = { breadcrumbs: [{ id: 'albums_overview', name: 'Mijn Albums' }], folders: [], files: [] };
                this.render();
            }
        }

        async loadTagDetail(tagName) {
            this.currentMode = 'tag_detail';
            this.currentFolderId = null;
            this.currentAlbumId = null;
            this.currentTagName = tagName;
            this.clearSelection();
            this.toggleToolbarMode('tag_detail'); 
            this.showLoadingState();

            try {
                const res = await fetch(`/api/files?action=tag&name=${encodeURIComponent(tagName)}`);
                const json = await res.json();
                if (json.status === 'success') {
                    this.currentData = json.data;
                }
                this.hideLoadingState();
                this.render();
            } catch (err) {
                this.hideLoadingState();
                this.currentData = { breadcrumbs: [{ id: 'tags_overview', name: 'Mijn Tags' }, { id: 'tag_detail_' + tagName, name: tagName }], folders: [], files: [] };
                this.render();
            }
        }

        async loadAlbumsOverview() {
            this.currentMode = 'albums_overview';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.currentData = { breadcrumbs: [{ id: 'albums_overview', name: 'Mijn Albums' }], folders: [], files: [] };
            
            this.showLoadingState();
            let albums = [];
            try {
                if (window.App && window.App.albumManager) {
                    if (typeof window.App.albumManager.fetchAlbums === 'function') {
                        albums = await window.App.albumManager.fetchAlbums();
                    } else {
                        albums = window.App.albumManager.albums || [];
                    }
                }
            } catch(e) { console.error(e); }
            this.hideLoadingState();
            
            const btnHtml = this.hasPerm('album_create') ? `
                <button id="btn-overview-new-album" class="btn-primary" style="padding: 10px 20px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Nieuw Album
                </button>
            ` : '';

            let html = `
                <div style="padding: 40px 30px; max-width: 1400px; margin: 0 auto; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                        <div>
                            <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Mijn Albums</h1>
                            <p style="color: var(--text-muted); margin: 0; font-size: 1.05rem;">Prachtige collecties van je belangrijkste foto's en bestanden.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap: 16px;">
                            <div style="background: var(--bg-surface); padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-dropdown); font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                <span style="color: var(--primary); font-size: 1.1rem;">${albums.length}</span> albums
                            </div>
                            ${btnHtml}
                        </div>
                    </div>
            `;

            if (albums.length === 0) {
                html += `
                    <div style="text-align: center; padding: 80px 20px; background: var(--bg-surface); border-radius: 16px; border: 2px dashed var(--border-dropdown);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 20px; opacity: 0.4;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Geen albums gevonden</h3>
                        <p style="color: var(--text-muted); font-size: 1.05rem;">${this.hasPerm('album_create') ? "Klik rechtsboven op '+ Nieuw Album' om je eerste album te maken." : "Je hebt momenteel geen actieve albums."}</p>
                    </div>
                `;
            } else {
                html += `<div id="album-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;"></div>`;
            }
            
            html += `</div>`;
            this.container.innerHTML = html;

            setTimeout(() => {
                const btnNew = document.getElementById('btn-overview-new-album');
                if (btnNew) {
                    btnNew.onclick = (e) => { 
                        e.preventDefault();
                        if (window.App && window.App.albumManager) {
                            if (typeof window.App.albumManager.showEditModal === 'function') window.App.albumManager.showEditModal(null);
                            else window.App.albumManager.showModal(null); 
                        }
                    };
                }
            }, 50);

            if (albums.length > 0) {
                const grid = document.getElementById('album-cards-grid');
                albums.forEach(album => {
                    const card = document.createElement('div');
                    card.className = 'album-card';
                    card.dataset.id = album.id;
                    card.style.background = 'var(--bg-surface)';
                    card.style.borderRadius = '16px';
                    card.style.border = '1px solid var(--border-dropdown)';
                    card.style.cursor = 'pointer';
                    card.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    card.style.position = 'relative';
                    card.style.overflow = 'hidden';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    
                    let coverHtml = '';
                    if (album.cover_file_id) {
                        const t = new Date(album.cover_updated || album.created_at).getTime();
                        coverHtml = `<div style="width: 100%; height: 160px; background: rgba(0,0,0,0.05); border-bottom: 1px solid var(--border-dropdown);">
                                        <img src="/api/files?action=thumb&id=${album.cover_file_id}&t=${t}" style="width: 100%; height: 100%; object-fit: cover;">
                                     </div>`;
                    } else {
                        const color = album.color || 'var(--primary)';
                        const iconSvg = album.icon && window.App.iconPicker && window.App.iconPicker.icons && window.App.iconPicker.icons.find(i=>i.id===album.icon) 
                            ? window.App.iconPicker.icons.find(i=>i.id===album.icon).inner 
                            : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>';
                        
                        coverHtml = `<div style="width: 100%; height: 160px; background: ${color}15; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--border-dropdown);">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="opacity: 0.8;">${iconSvg}</svg>
                        </div>`;
                    }

                    card.innerHTML = `
                        ${coverHtml}
                        <div style="padding: 20px;">
                            <h3 style="margin: 0 0 6px 0; font-size: 1.3rem; font-weight: 700; color: var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${this.escapeHTML(album.name)}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">Gemaakt op: ${new Date(album.created_at).toLocaleDateString()}</p>
                        </div>
                    `;

                    card.addEventListener('mouseenter', () => {
                        card.style.transform = 'translateY(-6px)';
                        card.style.boxShadow = `0 15px 30px rgba(0,0,0,0.1), 0 5px 15px rgba(37,99,235,0.1)`;
                        card.style.borderColor = `var(--primary)`;
                    });
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = 'translateY(0)';
                        card.style.boxShadow = 'none';
                        card.style.borderColor = 'var(--border-dropdown)';
                    });
                    card.addEventListener('click', () => this.loadAlbumDetail(album.id));

                    grid.appendChild(card);
                });
            }
            this.fireRenderComplete();
        }

        async loadTagsOverview() {
            this.currentMode = 'tags_overview';
            this.currentFolderId = null;
            this.currentTagName = null;
            this.currentAlbumId = null;
            this.clearSelection();
            this.toggleToolbarMode(this.currentMode);
            this.currentData = { breadcrumbs: [{ id: 'tags_overview', name: 'Mijn Tags' }], folders: [], files: [] };
            
            this.showLoadingState();
            let tags = [];
            try {
                if (window.App && window.App.tagManager) {
                    if (typeof window.App.tagManager.fetchTags === 'function') await window.App.tagManager.fetchTags();
                    tags = window.App.tagManager.availableTags || [];
                }
            } catch(e) { console.error(e); }
            this.hideLoadingState();
            
            const btnHtml = this.hasPerm('tag_manage') ? `
                <button id="btn-overview-new-tag" class="btn-primary" style="padding: 10px 20px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Nieuw Label
                </button>
            ` : '';

            let html = `
                <div style="padding: 40px 30px; max-width: 1400px; margin: 0 auto; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                        <div>
                            <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">Mijn Tags</h1>
                            <p style="color: var(--text-muted); margin: 0; font-size: 1.05rem;">Beheer je gekleurde labels en filter razendsnel door je projecten.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap: 16px;">
                            <div style="background: var(--bg-surface); padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-dropdown); font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                <span style="color: var(--primary); font-size: 1.1rem;">${tags.length}</span> actieve tags
                            </div>
                            ${btnHtml}
                        </div>
                    </div>
            `;

            if (tags.length === 0) {
                html += `
                    <div style="text-align: center; padding: 80px 20px; background: var(--bg-surface); border-radius: 16px; border: 2px dashed var(--border-dropdown);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 20px; opacity: 0.4;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Geen tags gevonden</h3>
                        <p style="color: var(--text-muted); font-size: 1.05rem;">${this.hasPerm('tag_manage') ? "Klik rechtsboven op '+ Nieuw Label' om je eerste label te maken." : "Je hebt momenteel geen actieve labels."}</p>
                    </div>
                `;
            } else {
                html += `<div id="tag-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;"></div>`;
            }
            
            html += `</div>`;
            this.container.innerHTML = html;

            setTimeout(() => {
                const btnNew = document.getElementById('btn-overview-new-tag');
                if (btnNew) {
                    btnNew.onclick = (e) => { 
                        e.preventDefault();
                        if (window.App && window.App.tagManager) {
                            if (typeof window.App.tagManager.showEditModal === 'function') window.App.tagManager.showEditModal(null);
                            else window.App.tagManager.show([]); 
                        }
                    };
                }
            }, 50);

            if (tags.length > 0) {
                const grid = document.getElementById('tag-cards-grid');
                tags.forEach(tag => {
                    const card = document.createElement('div');
                    card.className = 'tag-card';
                    card.dataset.name = tag.name;
                    card.style.background = 'var(--bg-surface)';
                    card.style.borderRadius = '16px';
                    card.style.padding = '24px';
                    card.style.border = '1px solid var(--border-dropdown)';
                    card.style.cursor = 'pointer';
                    card.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    card.style.position = 'relative';
                    card.style.overflow = 'hidden';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.gap = '20px';
                    
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

                    card.innerHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="width: 54px; height: 54px; border-radius: 14px; background: ${tag.color}15; color: ${tag.color}; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px ${tag.color}30;">
                                ${iconHtml}
                            </div>
                            <div style="background: rgba(128,128,128,0.05); padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); border: 1px solid var(--border-dropdown); display: flex; align-items: center; gap: 4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                Openen
                            </div>
                        </div>
                        <div>
                            <h3 style="margin: 0 0 6px 0; font-size: 1.3rem; font-weight: 700; color: var(--text-main);">${this.escapeHTML(tag.name)}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">Klik om bestanden met dit label te bekijken.</p>
                        </div>
                    `;

                    card.addEventListener('mouseenter', () => {
                        card.style.transform = 'translateY(-6px)';
                        card.style.boxShadow = `0 15px 30px rgba(0,0,0,0.1), 0 5px 15px ${tag.color}15`;
                        card.style.borderColor = `${tag.color}50`;
                    });
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = 'translateY(0)';
                        card.style.boxShadow = 'none';
                        card.style.borderColor = 'var(--border-dropdown)';
                    });
                    card.addEventListener('click', () => this.loadTagDetail(tag.name));

                    grid.appendChild(card);
                });
            }
            this.fireRenderComplete();
        }

        renderRecentDashboard() {
            const data = this.currentData || {};
            
            let html = `
                <div class="recent-dashboard">
                    <div>
                        <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(16,185,129,0.1); color: #10B981; display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                            Recent & Overzicht
                        </h1>
                        <p style="color:var(--text-muted); margin:5px 0 0 0; font-size:1.05rem;">Analyseer en beheer je meest actieve bestanden.</p>
                    </div>

                    <div id="recent-cover-flow" class="cover-flow-wrapper"></div>

                    <div class="recent-controls">
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button class="r-filter-btn ${this.recentFilter==='all'?'active':''}" data-filter="all">Alle Bestanden</button>
                            <button class="r-filter-btn ${this.recentFilter==='image'?'active':''}" data-filter="image">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Foto's
                            </button>
                            <button class="r-filter-btn ${this.recentFilter==='document'?'active':''}" data-filter="document">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                Documenten
                            </button>
                            <button class="r-filter-btn ${this.recentFilter==='video'?'active':''}" data-filter="video">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                Video's
                            </button>
                        </div>
                        <div class="time-slider-container">
                            <span id="slider-val-label">Tot ${this.recentDays} dagen terug</span>
                            <input type="range" id="recent-time-slider" class="time-slider" min="1" max="60" value="${this.recentDays}">
                        </div>
                    </div>

                    <div class="recent-grid">
                        <div id="recent-timeline-container"></div>

                        <div class="recent-widgets">
                            
                            <div id="mini-trash-dropzone" class="mini-trash-zone">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                <span>Sleep bestanden hierheen om te verwijderen</span>
                            </div>

                            <div class="r-widget">
                                <div class="r-widget-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    Grootste Opslag Vreters
                                </div>
                                <div id="widget-storage-eaters"></div>
                            </div>

                            <div class="r-widget">
                                <div class="r-widget-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    Vaakst Geopend (Trending)
                                </div>
                                <div id="widget-top-viewed"></div>
                            </div>

                            <div class="r-widget">
                                <div class="r-widget-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    Systeem Activiteit
                                </div>
                                <div id="widget-activity-log"></div>
                            </div>

                        </div>
                    </div>
                </div>
            `;

            this.container.innerHTML = html;

            const coverWrapper = document.getElementById('recent-cover-flow');
            const allImages = (data.timeline || []).filter(item => ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes((item.extension || '').toLowerCase()));
            const shuffledImages = this.shuffleArray(allImages).slice(0, 15); 
            
            if (shuffledImages.length === 0 && coverWrapper) {
                coverWrapper.style.display = 'none';
            } else if (coverWrapper) {
                coverWrapper.innerHTML = '';
                const timestamp = new Date().getTime();
                shuffledImages.forEach((img, index) => {
                    const el = document.createElement('div');
                    el.className = 'cover-item';
                    el.style.backgroundImage = `url('/api/files?action=thumb&id=${img.id}&t=${timestamp}')`;
                    el.innerHTML = `<div class="cover-item-label">${this.escapeHTML(img.name)}</div>`;
                    
                    el.onclick = () => {
                        if (window.App && window.App.lightbox) window.App.lightbox.open(shuffledImages, index);
                        else if (window.EventBus) window.EventBus.emit('file:open', img.id);
                    };
                    coverWrapper.appendChild(el);
                });
            }

            this.drawTimeline();

            const wStorage = document.getElementById('widget-storage-eaters');
            if (wStorage && data.top_large && data.top_large.length > 0) {
                let sHtml = '<div class="r-widget-list">';
                data.top_large.forEach(f => {
                    sHtml += `<div class="r-list-item widget-click-item" data-id="${f.id}" data-list="top_large" style="cursor:pointer;">
                        <div class="r-list-name" title="${this.escapeHTML(f.name)}">${this.escapeHTML(f.name)}</div><div class="r-list-val" style="color:#eab308;">${f.formatted_size || ''}</div></div>`;
                });
                sHtml += '</div>';
                wStorage.innerHTML = sHtml;
            } else if(wStorage) wStorage.innerHTML = '<div class="r-list-val">Geen data</div>';

            const wViewed = document.getElementById('widget-top-viewed');
            if (wViewed && data.top_viewed && data.top_viewed.length > 0) {
                let vHtml = '<div class="r-widget-list">';
                data.top_viewed.forEach(f => {
                    vHtml += `<div class="r-list-item widget-click-item" data-id="${f.id}" data-list="top_viewed" style="cursor:pointer;">
                        <div class="r-list-name" title="${this.escapeHTML(f.name)}">${this.escapeHTML(f.name)}</div><div class="r-list-val" style="color:#ec4899; font-weight:800;">${f.view_count}x</div></div>`;
                });
                vHtml += '</div>';
                wViewed.innerHTML = vHtml;
            } else if(wViewed) wViewed.innerHTML = '<div class="r-list-val">Geen data</div>';

            const wActivity = document.getElementById('widget-activity-log');
            if (wActivity && data.activity && data.activity.length > 0) {
                let aHtml = '<div class="r-widget-list" style="max-height: 200px;">';
                data.activity.forEach(log => {
                    aHtml += `<div class="audit-item"><div class="audit-dot"></div><div><div class="audit-text">${this.escapeHTML(log.details)}</div><div class="audit-time">${log.created_at}</div></div></div>`;
                });
                aHtml += '</div>';
                wActivity.innerHTML = aHtml;
            } else if(wActivity) wActivity.innerHTML = '<div class="r-list-val" style="padding-top:10px;">Geen recente activiteit</div>';

            this.container.querySelectorAll('.widget-click-item').forEach(el => {
                el.addEventListener('click', () => {
                    const fileId = el.dataset.id;
                    const listName = el.dataset.list;
                    const fileList = data[listName] || [];
                    const fileObj = fileList.find(f => String(f.id) === String(fileId));
                    
                    if (fileObj) {
                        const isMedia = ['jpg','jpeg','png','gif','webp','mp4','webm','mov'].includes((fileObj.extension || '').toLowerCase());
                        if (isMedia && window.App && window.App.lightbox) {
                            const mediaList = fileList.filter(f => ['jpg','jpeg','png','gif','webp','mp4','webm','mov'].includes((f.extension || '').toLowerCase()));
                            const idx = mediaList.findIndex(f => String(f.id) === String(fileId));
                            window.App.lightbox.open(mediaList, idx !== -1 ? idx : 0);
                        } else {
                            if (window.EventBus) window.EventBus.emit('file:open', fileId);
                        }
                    }
                });
            });

            this.container.querySelectorAll('.r-filter-btn').forEach(btn => {
                btn.onclick = () => {
                    this.recentFilter = btn.dataset.filter;
                    this.container.querySelectorAll('.r-filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.drawTimeline();
                };
            });

            const slider = document.getElementById('recent-time-slider');
            const sliderLabel = document.getElementById('slider-val-label');
            if (slider && sliderLabel) {
                slider.addEventListener('input', (e) => {
                    this.recentDays = parseInt(e.target.value);
                    sliderLabel.textContent = `Tot ${this.recentDays} dagen terug`;
                    this.drawTimeline();
                });
            }

            const dropzone = document.getElementById('mini-trash-dropzone');
            if (dropzone) {
                dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
                dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('drag-over'); });
                dropzone.addEventListener('drop', e => {
                    e.preventDefault();
                    dropzone.classList.remove('drag-over');
                    const fileId = e.dataTransfer.getData('text/plain');
                    if (fileId) this.handleMiniTrashDrop(fileId);
                });
            }
        }

        drawTimeline() {
            const container = document.getElementById('recent-timeline-container');
            if (!container) return;

            let filtered = (this.currentData.timeline || []).filter(item => {
                const itemDate = new Date(item.created_at);
                const diffDays = (new Date() - itemDate) / (1000 * 60 * 60 * 24);
                if (diffDays > this.recentDays) return false;

                if (this.recentFilter === 'all') return true;
                const cat = item.category || 'other';
                if (this.recentFilter === 'image' && cat === 'image') return true;
                if (this.recentFilter === 'video' && cat === 'video') return true;
                if (this.recentFilter === 'document' && cat === 'doc') return true;
                return false;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-surface); border-radius:16px; border:1px dashed var(--border-dropdown);">Geen bestanden gevonden in deze periode of categorie.</div>`;
                return;
            }

            const groups = { 'Vandaag': [], 'Gisteren': [], 'Afgelopen week': [], 'Afgelopen maand': [], 'Ouder': [] };
            
            filtered.forEach(item => {
                const groupName = this.formatDateRelative(item.created_at);
                if(groups[groupName]) groups[groupName].push(item);
            });

            let html = '';
            Object.keys(groups).forEach(groupName => {
                if (groups[groupName].length > 0) {
                    html += `<div class="timeline-group-header">${groupName} <span style="font-size:0.7rem; font-weight:600; padding:2px 8px; background:var(--bg-surface); border-radius:10px; color:var(--text-main); margin-left:8px;">${groups[groupName].length} items</span></div>`;
                    
                    groups[groupName].forEach(item => {
                        let iconHtml = this.getIconForExtension(item.extension);
                        if (item.category === 'image') {
                            iconHtml = `<img src="/api/files?action=thumb&id=${item.id}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" onerror="this.style.display='none'">`;
                        }

                        html += `
                            <div class="timeline-item" draggable="true" data-id="${item.id}">
                                <div class="timeline-icon" style="color:${item.color || 'var(--primary)'}">${iconHtml}</div>
                                <div class="timeline-info">
                                    <div class="timeline-title">${this.escapeHTML(item.name)}</div>
                                    <div class="timeline-meta">
                                        <span>${item.formatted_size || (Math.round(item.size/1024)+' KB')}</span>
                                        <span>•</span>
                                        <span>${item.created_at.substring(11, 16)}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            });

            container.innerHTML = html;

            container.querySelectorAll('.timeline-item').forEach(el => {
                el.addEventListener('click', () => {
                    const fileId = el.dataset.id;
                    const fileObj = filtered.find(f => String(f.id) === String(fileId));
                    if (fileObj) {
                        const isMedia = ['jpg','jpeg','png','gif','webp','mp4','webm','mov'].includes((fileObj.extension || '').toLowerCase());
                        if (isMedia && window.App && window.App.lightbox) {
                            const mediaList = filtered.filter(f => ['jpg','jpeg','png','gif','webp','mp4','webm','mov'].includes((f.extension || '').toLowerCase()));
                            const idx = mediaList.findIndex(f => String(f.id) === String(fileId));
                            window.App.lightbox.open(mediaList, idx !== -1 ? idx : 0);
                        } else {
                            if (window.EventBus) window.EventBus.emit('file:open', fileId);
                        }
                    }
                });

                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', el.dataset.id);
                    el.classList.add('dragging');
                });
                el.addEventListener('dragend', () => el.classList.remove('dragging'));
            });
        }

        formatDateRelative(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays <= 1 && now.getDate() === date.getDate()) return 'Vandaag';
            if (diffDays <= 2 && now.getDate() !== date.getDate()) return 'Gisteren';
            if (diffDays <= 7) return 'Afgelopen week';
            if (diffDays <= 30) return 'Afgelopen maand';
            return 'Ouder';
        }

        async handleMiniTrashDrop(fileId) {
            try {
                let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                if (!csrfToken) {
                    const tokenRes = await fetch('/api/csrf');
                    const tokenData = await tokenRes.json();
                    csrfToken = tokenData.csrf_token;
                }

                const res = await fetch('/api/files/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'file', id: fileId, csrf_token: csrfToken })
                });

                const data = await res.json();
                if (res.ok && data.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Bestand verplaatst naar prullenbak!');
                    const itemEl = this.container.querySelector(`.timeline-item[data-id="${fileId}"]`);
                    if (itemEl) {
                        itemEl.style.transform = 'scale(0)';
                        setTimeout(() => itemEl.remove(), 200);
                    }
                    if (this.currentData && this.currentData.timeline) {
                        this.currentData.timeline = this.currentData.timeline.filter(f => String(f.id) !== String(fileId));
                    }
                } else {
                    throw new Error(data.message);
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Verwijderen mislukt: ' + e.message);
            }
        }

        render() {
            try {
                if (this.currentMode === 'tags_overview' || this.currentMode === 'albums_overview') return;
                
                if (this.currentMode === 'recent') {
                    this.renderRecentDashboard();
                    return;
                }

                const contextKey = this.getContextKey();
                
                if (this.lastRenderContext !== contextKey) {
                    if (window.App && window.App.filterEngine) {
                        window.App.filterEngine.loadState();
                    }
                    this.lastRenderContext = contextKey;
                }

                const settings = window.ViewState ? window.ViewState.get(contextKey) : { view: 'grid', zoom: 150 };

                document.documentElement.style.setProperty('--zoom-level', `${settings.zoom}px`);
                
                if (window.App && window.App.virtualScroll) {
                    window.App.virtualScroll.disconnect();
                    if (settings.view !== 'masonry' && settings.view !== 'list') {
                        window.App.virtualScroll.initObserver();
                    }
                }

                let safeData = {
                    breadcrumbs: this.currentData.breadcrumbs || [],
                    folders: this.currentData.folders || [],
                    files: this.currentData.files || [],
                    counts: this.currentData.counts || {}
                };

                if (this.currentData && this.currentData.current_role === 'viewer') {
                    document.body.classList.add('is-viewer-mode');
                } else {
                    document.body.classList.remove('is-viewer-mode');
                }

                let rawData = window.App && window.App.filterEngine ? window.App.filterEngine.apply(safeData) : safeData;

                if (window.App && window.App.toolbar && rawData.counts) {
                    window.App.toolbar.updateCounts(rawData.counts);
                }

                const displayData = {
                    breadcrumbs: rawData.breadcrumbs || [],
                    folders: [...(rawData.folders || [])],
                    files: [...(rawData.files || [])],
                    groupedFiles: rawData.groupedFiles || null
                };

                let hasBackButton = false;
                if (this.currentMode === 'folder' && safeData.breadcrumbs && safeData.breadcrumbs.length > 1) {
                    let parentId = safeData.breadcrumbs[safeData.breadcrumbs.length - 2].id;
                    displayData.folders.unshift({ id: parentId, name: '.. (Terug)', itemType: 'folder', isBackTile: true, formatted_size: 'Ga een map omhoog' });
                    hasBackButton = true;
                } else if (this.currentMode === 'album_detail') {
                    displayData.folders.unshift({ id: 'albums_overview', name: '.. (Terug naar Albums)', itemType: 'folder', isBackTile: true, formatted_size: 'Alle albums' });
                    hasBackButton = true;
                } else if (this.currentMode === 'tag_detail') {
                    displayData.folders.unshift({ id: 'tags_overview', name: '.. (Terug naar Tags)', itemType: 'folder', isBackTile: true, formatted_size: 'Alle labels' });
                    hasBackButton = true;
                }

                this.container.innerHTML = '';

                let pageHeaderHtml = '';
                const totalItems = (displayData.folders.length + displayData.files.length) - (hasBackButton ? 1 : 0);

                let roleBadge = '';
                if (this.currentMode === 'folder' && this.currentData.current_role) {
                    if (this.currentData.current_role === 'viewer') {
                        roleBadge = `<div style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Alleen Lezen</div>`;
                    } else if (this.currentData.current_role !== 'owner') {
                        roleBadge = `<div style="background: rgba(59,130,246,0.1); color: var(--primary); border: 1px solid rgba(59,130,246,0.2); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Bewerken Toegestaan</div>`;
                    }
                }

                if (this.currentMode === 'favorites') {
                    pageHeaderHtml = `
                        <div style="padding: 20px 30px 10px 30px; margin: 0 auto; width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                                <div>
                                    <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                                        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245,158,11,0.1); color: #F59E0B; display:flex; align-items:center; justify-content:center;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        </div>
                                        Favorieten
                                    </h1>
                                    <p style="color: var(--text-muted); margin: 0; font-size: 1.05rem;">Snel toegang tot je belangrijkste bestanden en mappen.</p>
                                </div>
                                <div style="background: var(--bg-surface); padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-dropdown); font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                    <span style="color: #F59E0B; font-size: 1.1rem;" class="view-header-count">${totalItems}</span> items
                                </div>
                            </div>
                        </div>`;
                } else if (this.currentMode === 'trash') {
                    pageHeaderHtml = `
                        <div style="padding: 20px 30px 10px 30px; margin: 0 auto; width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 20px;">
                                <div>
                                    <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                                        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(239,68,68,0.1); color: #EF4444; display:flex; align-items:center; justify-content:center;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </div>
                                        Prullenbak
                                    </h1>
                                    <p style="color: var(--text-muted); margin: 0; font-size: 1.05rem;">Verwijderde items. Klik op 'Prullenbak Legen' om deze definitief te wissen.</p>
                                </div>
                                <div style="background: var(--bg-surface); padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-dropdown); font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                    <span style="color: #EF4444; font-size: 1.1rem;" class="view-header-count">${totalItems}</span> items
                                </div>
                            </div>
                        </div>`;
                } else if (this.currentMode === 'shared_with_me') {
                    pageHeaderHtml = `
                        <div style="padding: 20px 30px 10px 30px; margin: 0 auto; width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                                <div>
                                    <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                                        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(20,184,166,0.1); color: #14B8A6; display:flex; align-items:center; justify-content:center;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="21"></line></svg>
                                        </div>
                                        Gedeeld met mij
                                    </h1>
                                    <p style="color: var(--text-muted); margin: 0; font-size: 1.05rem;">Mappen en bestanden waarvoor collega's jou hebben uitgenodigd.</p>
                                </div>
                                <div style="background: var(--bg-surface); padding: 8px 20px; border-radius: 20px; border: 1px solid var(--border-dropdown); font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                                    <span style="color: #14B8A6; font-size: 1.1rem;" class="view-header-count">${totalItems}</span> items
                                </div>
                            </div>
                        </div>`;
                }

                if (pageHeaderHtml || roleBadge) {
                    const headerWrapper = document.createElement('div');
                    headerWrapper.innerHTML = (roleBadge ? `<div style="padding: 10px 30px 0 30px;">${roleBadge}</div>` : '') + pageHeaderHtml;
                    this.container.appendChild(headerWrapper);
                }

                if (safeData.folders.length === 0 && safeData.files.length === 0 && this.currentMode === 'shared_with_me') {
                    this.container.innerHTML += `
                        <div style="text-align: center; padding: 80px 20px; background: var(--bg-surface); border-radius: 16px; border: 2px dashed var(--border-dropdown); max-width: 800px; margin: 40px auto;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" stroke-width="1.5" style="margin-bottom: 20px; opacity: 0.5;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Nog geen samenwerkingen</h3>
                            <p style="color: var(--text-muted); font-size: 1.05rem;">Er zijn nog geen bestanden of mappen met jou gedeeld door collega's.</p>
                        </div>
                    `;
                    this.fireRenderComplete();
                    return;
                }

                if (safeData.folders.length === 0 && safeData.files.length === 0) {
                    if (hasBackButton) {
                        if (settings.view === 'list' && window.App.listBuilder) {
                            window.App.listBuilder.render(this.container, {folders: displayData.folders, files: []}, this.currentMode);
                        } else {
                            this.renderGrid({folders: displayData.folders, files: []}, settings.zoom);
                        }
                        const emptyEl = document.createElement('div');
                        emptyEl.style.marginTop = '40px';
                        this.container.appendChild(emptyEl);
                        if(window.App.emptyStates) window.App.emptyStates.render(emptyEl, this.currentMode, this.currentTagName);
                    } else {
                        if(window.App.emptyStates) window.App.emptyStates.render(this.container, this.currentMode, this.currentTagName);
                    }
                    this.fireRenderComplete();
                    return;
                }

                if (displayData.folders.length === 0 && displayData.files.length === 0) {
                    if(window.App.emptyStates) window.App.emptyStates.renderFilterEmptyState(this.container);
                    this.fireRenderComplete();
                    return;
                }

                const groupBy = window.App && window.App.filterEngine ? window.App.filterEngine.groupBy : 'none';

                if (groupBy !== 'none' && settings.view === 'grid') {
                    this.renderGroupedGrid(displayData, settings.zoom, groupBy);
                } else if (settings.view === 'list' && window.App.listBuilder) {
                    window.App.listBuilder.render(this.container, displayData, this.currentMode);
                    this.applyOverlaysToAll();
                } else if (settings.view === 'masonry' && window.App.masonryLayout) {
                    window.App.masonryLayout.render(this.container, displayData, settings.zoom);
                    this.applyOverlaysToAll();
                } else {
                    this.renderGrid(displayData, settings.zoom);
                }

                this.fireRenderComplete();

            } catch (e) {
                console.error("[RenderEngine] Crash:", e);
                this.container.innerHTML = `
                    <div style="padding: 40px; text-align: left; max-width: 800px; margin: 0 auto;">
                        <h2 style="color: var(--text-main); margin-bottom: 10px;">RenderEngine gecrasht</h2>
                        <pre style="background: #0f172a; color: #10b981; padding: 20px; border-radius: 12px; border: 1px solid var(--border-dropdown); overflow-x: auto; font-family: monospace; font-size: 0.85rem;">${this.escapeHTML(e.name)}: ${this.escapeHTML(e.message)}\n\n${this.escapeHTML(e.stack)}</pre>
                    </div>
                `;
            }
        }

        applyOverlays(tile, item, type) {
            if (!tile || item.isBackTile) return;
            
            tile.style.position = 'relative';

            if (item.is_quarantined == 1) {
                const qBadge = document.createElement('div');
                qBadge.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                qBadge.style.cssText = 'position:absolute; inset:0; background:rgba(239,68,68,0.7); backdrop-filter:blur(2px); z-index:20; display:flex; align-items:center; justify-content:center; border-radius:inherit; cursor:not-allowed;';
                qBadge.title = "Dit bestand is geblokkeerd (Quarantaine)";
                tile.appendChild(qBadge);
            }

            if (type === 'folder' || this.currentMode === 'album_detail') {
                const zipBtn = document.createElement('button');
                zipBtn.className = 'btn-icon-small btn-zip-download';
                zipBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
                zipBtn.title = "Download als ZIP archief";
                zipBtn.onclick = (e) => {
                    e.stopPropagation();
                    const dlType = this.currentMode === 'album_detail' ? 'album' : 'folder';
                    const dlId = this.currentMode === 'album_detail' ? this.currentAlbumId : item.id;
                    window.location.href = `/api/files/zip?id=${dlId}&type=${dlType}`;
                    if(window.EventBus) window.EventBus.emit('notify:success', 'ZIP generatie gestart, download begint zo...');
                };
                tile.appendChild(zipBtn);
            }

            const dateStr = item.file_created || item.created_at;
            if (dateStr) {
                const createdDate = new Date(dateStr);
                const now = new Date();
                const diffHours = (now - createdDate) / (1000 * 60 * 60);
                if (diffHours < 24) {
                    const newBadge = document.createElement('div');
                    newBadge.innerHTML = 'Nieuw';
                    newBadge.style.cssText = 'position:absolute; top:-6px; left:-6px; background:#ef4444; color:white; font-size:0.7rem; font-weight:bold; padding:2px 8px; border-radius:10px; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:10; pointer-events:none;';
                    tile.appendChild(newBadge);
                }
            }

            if (item.is_shared || this.currentMode === 'shared_with_me') {
                const sharedBadge = document.createElement('div');
                sharedBadge.style.cssText = 'position:absolute; bottom:8px; right:8px; background:var(--bg-card); border-radius:50%; padding:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); z-index:10; display:flex; align-items:center; justify-content:center; color:#14b8a6;';
                
                if (item.owner_avatar) {
                    // Avatar URL moet wel in HTML attributen gerespecteerd blijven (dus geen innerHTML waar het fout kan gaan)
                    sharedBadge.innerHTML = `<img src="${this.escapeHTML(item.owner_avatar)}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">`;
                    sharedBadge.title = "Eigenaar: " + (item.owner_name ? item.owner_name : 'Onbekend');
                } else {
                    sharedBadge.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
                    sharedBadge.title = "Gedeeld door: " + (item.owner_name ? item.owner_name : 'collega');
                }
                tile.appendChild(sharedBadge);
            }
        }

        applyOverlaysToAll() {
            if (!this.currentData) return;
            const items = [...(this.currentData.folders || []), ...(this.currentData.files || [])];
            
            items.forEach(item => {
                if (item.isBackTile) return;
                const listRow = document.querySelector(`.list-row[data-id="${item.id}"]`);
                if (listRow) {
                    const nameCol = listRow.querySelector('.list-name-col');
                    if (nameCol) {
                        if (item.is_shared || this.currentMode === 'shared_with_me') {
                            const badge = document.createElement('span');
                            badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" style="vertical-align:middle; margin-left:8px;" title="Gedeeld item"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`;
                            nameCol.appendChild(badge);
                        }
                    }
                }
                const masonryTile = document.querySelector(`.masonry-tile[data-id="${item.id}"]`);
                if (masonryTile) this.applyOverlays(masonryTile, item, 'file');
            });
        }

        renderGrid(data, zoom) {
            document.documentElement.style.setProperty('--zoom-level', `${zoom}px`);
            const fragment = document.createDocumentFragment();
            const gridWrapper = document.createElement('div');
            gridWrapper.className = 'view-grid';

            if (window.App.tileBuilder) {
                let globalIndex = 0;
                
                data.folders.forEach((folder, i) => {
                    let tile = window.App.tileBuilder.build(folder, 'folder', i, this.currentMode);
                    if (typeof tile === 'string') {
                        const temp = document.createElement('div');
                        temp.innerHTML = tile;
                        tile = temp.firstElementChild;
                    }
                    if (tile) {
                        tile.classList.add('staggered-entry');
                        tile.style.animationDelay = `${Math.min(globalIndex++, 20) * 30}ms`;
                        
                        this.applyOverlays(tile, folder, 'folder'); 

                        if (window.App && window.App.virtualScroll) {
                            window.App.virtualScroll.observe(tile, folder);
                        }

                        gridWrapper.appendChild(tile);
                        this.attachInteractionEvents(tile, folder, 'folder'); 
                    }
                });
                
                data.files.forEach((file, i) => {
                    let tile = window.App.tileBuilder.build(file, 'file', data.folders.length + i, this.currentMode);
                    if (typeof tile === 'string') {
                        const temp = document.createElement('div');
                        temp.innerHTML = tile;
                        tile = temp.firstElementChild;
                    }
                    if (tile) {
                        tile.classList.add('staggered-entry');
                        tile.style.animationDelay = `${Math.min(globalIndex++, 20) * 30}ms`;

                        this.applyOverlays(tile, file, 'file'); 

                        if (window.App && window.App.virtualScroll) {
                            window.App.virtualScroll.observe(tile, file);
                        }

                        gridWrapper.appendChild(tile);
                        this.attachInteractionEvents(tile, file, 'file'); 
                    }
                });
            }

            fragment.appendChild(gridWrapper);
            this.container.appendChild(fragment);
        }

        renderGroupedGrid(data, zoom, groupBy) {
            document.documentElement.style.setProperty('--zoom-level', `${zoom}px`);
            const fragment = document.createDocumentFragment();

            const createGroup = (title, items, type) => {
                if(items.length === 0) return;
                const header = document.createElement('div'); 
                header.className = 'group-header-title'; 
                // Gebruik textContent i.p.v. innerHTML zodat titel automatisch XSS veilig is
                header.textContent = title;
                fragment.appendChild(header);
                
                const wrapper = document.createElement('div'); 
                wrapper.className = 'view-grid';
                if (window.App.tileBuilder) {
                    let localIndex = 0;
                    items.forEach((item, i) => {
                        let tile = window.App.tileBuilder.build(item, type, i, this.currentMode);
                        if (typeof tile === 'string') {
                            const temp = document.createElement('div');
                            temp.innerHTML = tile;
                            tile = temp.firstElementChild;
                        }
                        if (tile) {
                            tile.classList.add('staggered-entry');
                            tile.style.animationDelay = `${Math.min(localIndex++, 20) * 30}ms`;
                            
                            this.applyOverlays(tile, item, type); 

                            if (window.App && window.App.virtualScroll) {
                                window.App.virtualScroll.observe(tile, item);
                            }

                            wrapper.appendChild(tile);
                            this.attachInteractionEvents(tile, item, type);
                        }
                    });
                }
                fragment.appendChild(wrapper);
            };

            if (groupBy === 'type') {
                createGroup('Mappen', data.folders, 'folder');
                const categories = [...new Set(data.files.map(f => f.category || 'Overig'))];
                categories.forEach(cat => {
                    const title = cat === 'image' ? 'Afbeeldingen' : (cat === 'doc' ? 'Documenten' : (cat === 'video' ? 'Video\'s' : (cat === 'audio' ? 'Audio' : 'Overig')));
                    const filesInCat = data.files.filter(f => f.category === cat);
                    createGroup(title, filesInCat, 'file');
                });
            } else if (data.groupedFiles) {
                createGroup('Mappen', data.folders, 'folder');
                for (const [groupName, groupFiles] of Object.entries(data.groupedFiles)) {
                    createGroup(groupName, groupFiles, 'file');
                }
            } else {
                this.renderGrid(data, zoom);
            }
            this.container.appendChild(fragment);
        }

        fireRenderComplete() {
            if (window.EventBus) window.EventBus.emit('render:complete');
            if (window.App && window.App.imageLoader) window.App.imageLoader.startQueue(this.container);
        }

        attach3DEffect(element) {
            if(window.App.tileBuilder) window.App.tileBuilder.attach3DEffect(element);
        }

        attachInteractionEvents(el, item, type) {
            el.addEventListener('dblclick', () => { 
                if (item.is_quarantined == 1) {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Dit bestand staat in quarantaine (beveiligingsrisico).');
                    return;
                }
                if (this.currentMode === 'trash') {
                    if (window.EventBus) window.EventBus.emit('notify:warning', 'Herstel dit item eerst om het te kunnen openen.');
                    return;
                }
                if (type === 'folder') this.loadFolder(item.id); 
            });

            el.addEventListener('click', async (e) => {
                const btnFav = e.target.closest('.btn-favorite');
                const btnZip = e.target.closest('.btn-zip-download');
                if (btnFav || btnZip) {
                    e.stopPropagation();
                    return; 
                }
                
                if (window.App && window.App.selectionManager) {
                    if (typeof window.App.selectionManager.toggle === 'function') window.App.selectionManager.toggle(el, e);
                    else if (typeof window.App.selectionManager.toggleItem === 'function') window.App.selectionManager.toggleItem(el, e);
                    else if (typeof window.App.selectionManager.toggleSelection === 'function') window.App.selectionManager.toggleSelection(el, e);
                    else if (typeof window.App.selectionManager.selectItemByElement === 'function') {
                        const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
                        if (!isMulti) window.App.selectionManager.clearSelection();
                        if (el.classList.contains('selected') && isMulti) {
                            el.classList.remove('selected');
                            window.App.selectionManager.selectedItems.delete(String(item.id));
                        } else {
                            window.App.selectionManager.selectItemByElement(el, isMulti);
                        }
                    }
                }
            });

            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                if (item.isBackTile) return;

                if (window.App && window.App.selectionManager && !el.classList.contains('selected')) {
                    window.App.selectionManager.clearSelection();
                    if (typeof window.App.selectionManager.selectItemByElement === 'function') {
                        window.App.selectionManager.selectItemByElement(el, false);
                    }
                }

                if (window.App && window.App.contextMenu && typeof window.App.contextMenu.open === 'function') {
                    window.App.contextMenu.open(e, item, type);
                } else if (window.EventBus) {
                    window.EventBus.emit('contextmenu:show', { event: e, item: item, type: type });
                }
            });
        }
    }

    window.App = window.App || {}; 
    window.App.renderEngine = new RenderEngine();
})();