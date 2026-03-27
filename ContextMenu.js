/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/ContextMenu.js */

class ContextMenu {
    constructor() {
        this.menu = null;
        this.activeTarget = null;
        this.activeType = null;
        this.activeId = null;
        
        this.activeIds = []; 
        
        this.activeTrashItemType = null; 
        
        this.submenuTimer = null;
        this.activeSubmenu = null;

        this.touchTimer = null;
        this.touchDuration = 500; 
        this.touchStartX = 0;
        this.touchStartY = 0;

        this.quickColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

        this.injectStyles();
        this.initDOM();
        this.initListeners();
    }

    hasPerm(key) {
        if (window.currentUser && window.currentUser.role === 'admin') return true;
        if (window.currentUser && window.currentUser.role_id === 1) return true; 
        return window.currentUser && window.currentUser.permissions && window.currentUser.permissions[key] === true;
    }

    injectStyles() {
        if (document.getElementById('context-menu-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'context-menu-dynamic-styles';
        style.innerHTML = `
            .cm-has-submenu::after, .has-submenu::after {
                content: none !important;
                display: none !important;
            }
            .context-menu-root { z-index: 100005 !important; }
            .context-submenu { z-index: 100006 !important; }
        `;
        document.head.appendChild(style);
    }

    initDOM() {
        if (!document.getElementById('context-menu-root')) {
            this.menu = document.createElement('div');
            this.menu.id = 'context-menu-root';
            this.menu.className = 'context-menu-root';
            document.body.appendChild(this.menu);
        } else {
            this.menu = document.getElementById('context-menu-root');
        }
    }

    initListeners() {
        document.addEventListener('contextmenu', (e) => {
            if (document.body.classList.contains('dashboard-view-active') && e.target.closest('#file-view')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.target.closest('.list-header')) return;
            
            e.preventDefault();
            this.handleMenuTrigger(e.target, e.clientX, e.clientY);
        });

        document.addEventListener('click', (e) => {
            if (this.menu.classList.contains('visible') && !this.menu.contains(e.target)) {
                this.close();
            }
        });

        document.addEventListener('scroll', () => {
            if (this.menu.classList.contains('visible')) this.close();
        }, { passive: true });

        document.addEventListener('touchstart', (e) => {
            if (document.body.classList.contains('dashboard-view-active') && e.target.closest('#file-view')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.target.closest('.list-header')) return;
            if (e.touches.length > 1) return; 
            
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            
            this.touchTimer = setTimeout(() => {
                this.handleMenuTrigger(e.target, this.touchStartX, this.touchStartY);
            }, this.touchDuration);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const dx = Math.abs(e.touches[0].clientX - this.touchStartX);
            const dy = Math.abs(e.touches[0].clientY - this.touchStartY);
            if (dx > 10 || dy > 10) {
                clearTimeout(this.touchTimer);
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            clearTimeout(this.touchTimer);
        }, { passive: true });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menu.classList.contains('visible')) {
                this.close();
            }
        });

        document.addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile)');
            if (fileItem && fileItem.dataset.type === 'file') {
                e.preventDefault();
                e.stopPropagation(); 
                
                this.activeId = fileItem.dataset.id;
                this.executeAction('preview', null); 
            }
        }, true);
    }

    handleMenuTrigger(targetElement, x, y) {
        this.activeTarget = targetElement;
        this.activeType = 'whitespace'; 
        this.activeId = null;
        this.activeIds = [];
        this.activeTrashItemType = null;

        let currentMode = 'folder';
        if (window.App && window.App.renderEngine) {
            currentMode = window.App.renderEngine.currentMode;
        }

        const fileItem = targetElement.closest('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile), .masonry-tile:not(.is-back-tile)');
        
        const sidebarItem = targetElement.closest('.nav-item, .sidebar-link, .nav-link');
        const tagPill = targetElement.closest('.tag-pill, .sidebar-tag, [data-path^="tag_detail_"]');
        const albumNav = targetElement.closest('.album-item, .sidebar-album, [data-path^="album_"]');
        const albumCard = targetElement.closest('.album-card, .album-polaroid');
        const tagCard = targetElement.closest('.tag-card');
        
        // FASE 4 FIX: Voeg selectie toe voor slideshows
        const slideshowNav = targetElement.closest('.slideshow-item, .sidebar-slideshow, [data-path^="slideshow_"]');
        const slideshowCard = targetElement.closest('.slideshow-card');

        if (albumCard) {
            this.activeType = 'album_card';
            this.activeId = albumCard.dataset.id;
            this.activeIds = [this.activeId];
        } else if (tagCard) {
            this.activeType = 'tag_card';
            this.activeId = tagCard.dataset.name || tagCard.dataset.id;
            this.activeIds = [this.activeId];
        } else if (slideshowCard) {
            this.activeType = 'slideshow_card';
            this.activeId = slideshowCard.dataset.id;
            this.activeIds = [this.activeId];
        } else if (tagPill) {
            this.activeType = 'sidebar_tag_item';
            this.activeId = tagPill.dataset.path ? tagPill.dataset.path.replace('tag_detail_', '') : (tagPill.dataset.name || tagPill.textContent.trim());
            this.activeIds = [this.activeId];
        } else if (albumNav) {
            this.activeType = 'sidebar_album_item';
            this.activeId = albumNav.dataset.path ? albumNav.dataset.path.replace('album_', '') : albumNav.dataset.id;
            this.activeIds = [this.activeId];
        } else if (slideshowNav) {
            this.activeType = 'sidebar_slideshow_item';
            this.activeId = slideshowNav.dataset.path ? slideshowNav.dataset.path.replace('slideshow_', '') : slideshowNav.dataset.id;
            this.activeIds = [this.activeId];
        } else if (fileItem) {
            this.activeType = fileItem.dataset.type === 'folder' ? 'folder' : 'file';
            this.activeId = fileItem.dataset.id;
            
            if (window.App && window.App.selectionManager && window.App.selectionManager.selectedItems.has(String(this.activeId))) {
                this.activeIds = Array.from(window.App.selectionManager.selectedItems.keys());
            } else {
                this.activeIds = [this.activeId];
                if (window.App.selectionManager) {
                    window.App.selectionManager.clearSelection();
                    window.App.selectionManager.selectItemByElement(fileItem, false);
                }
            }
            
            if (currentMode === 'album_detail' && this.activeType === 'file') this.activeType = 'album_file';
            if (currentMode === 'tag_detail' && this.activeType === 'file') this.activeType = 'tag_file';
            if (currentMode === 'trash') {
                this.activeTrashItemType = this.activeType; 
                this.activeType = 'trash_item'; 
            }
            
        } else if (sidebarItem) {
            const path = sidebarItem.dataset.path;
            if (path === 'root' || path === '/') this.activeType = 'sidebar_root';
            else if (path === 'trash') this.activeType = 'sidebar_trash';
            else if (path === 'favorites') this.activeType = 'sidebar_favorites';
            else if (path === 'recent') this.activeType = 'sidebar_recent';
            else if (path === 'tags_overview') this.activeType = 'sidebar_tags';
            else if (path === 'albums_overview') this.activeType = 'sidebar_albums';
            else if (path === 'slideshows_overview') this.activeType = 'sidebar_slideshows';
            else {
                this.activeType = 'sidebar_folder';
                this.activeId = path;
            }
        } else {
            if (currentMode === 'trash') {
                this.activeType = 'whitespace_trash';
            } else if (currentMode === 'recent' || currentMode === 'favorites') {
                this.activeType = 'whitespace_readonly';
            }
        }

        this.buildAndShowMenu(x, y);
    }

    buildAndShowMenu(x, y) {
        const isMulti = this.activeIds.length > 1;
        
        let itemIsReadonly = false;
        let isFavorite = false; 
        let currentFileTags = [];
        let ext = '';
        
        if (window.App && window.App.renderEngine && window.App.renderEngine.currentData) {
            const data = window.App.renderEngine.currentData;
            
            if (['file', 'album_file', 'tag_file'].includes(this.activeType)) {
                const f = (data.files || []).find(x => String(x.id) === String(this.activeId));
                if (f) {
                    if (f.role === 'viewer') itemIsReadonly = true;
                    if (f.tags) currentFileTags = f.tags.map(t => t.name);
                    if (f.extension) ext = f.extension.toLowerCase();
                    if (parseInt(f.is_favorite || 0) === 1 || f.is_favorite === true) isFavorite = true;
                }
            } else if (['folder', 'sidebar_folder'].includes(this.activeType)) {
                const fd = (data.folders || []).find(x => String(x.id) === String(this.activeId));
                if (fd && fd.role === 'viewer') itemIsReadonly = true;
            }
        }
        
        const matrix = this.getMatrixOptions(isFavorite, currentFileTags, ext, itemIsReadonly);
        
        let html = '';

        if (!isMulti && ['file', 'folder', 'sidebar_folder', 'album_file', 'tag_file'].includes(this.activeType)) {
            if (this.hasPerm('item_rename') && !itemIsReadonly) {
                html += `<div class="cm-color-row" style="display:flex; justify-content:space-between; padding: 8px 16px 12px 16px; border-bottom: 1px solid var(--border-dropdown); margin-bottom: 6px;">`;
                this.quickColors.forEach(color => {
                    html += `<div class="cm-color-dot" style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; transition: transform 0.2s;" data-action="set_color" data-value="${color}" title="Kleur instellen"></div>`;
                });
                html += `<div class="cm-color-dot" data-action="set_color" data-value="none" style="background-color: transparent; border: 1px dashed var(--text-muted); color: var(--text-muted); width: 20px; height: 20px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size:10px; cursor: pointer; transition: transform 0.2s;" title="Kleur wissen">&times;</div>`;
                html += `</div>`;
            }
        }

        matrix.forEach(item => {
            if (item === 'divider') {
                html += `<div class="cm-divider" style="height: 1px; background: var(--border-dropdown); margin: 6px 0;"></div>`;
            } else {
                if (item.show === false) return;

                const isItemDisabled = item.disabled ? true : false;
                const dangerClass = item.danger && !isItemDisabled ? 'danger' : '';
                const submenuClass = item.submenu ? 'cm-has-submenu' : '';
                const disabledClass = isItemDisabled ? 'cm-disabled' : '';
                
                const textColor = isItemDisabled ? 'var(--text-muted)' : (item.danger ? 'var(--error)' : 'var(--text-main)');
                const opacityStyle = isItemDisabled ? 'opacity: 0.6;' : '';
                const cursorStyle = isItemDisabled ? 'cursor: not-allowed;' : 'cursor: pointer;';
                
                const subHtml = item.submenu ? `<svg class="submenu-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto; opacity:0.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>` : '';
                
                let dynamicLabel = item.label;
                if (isMulti && ['delete', 'move', 'copy', 'force_delete', 'restore', 'remove_from_tag', 'remove_from_album'].includes(item.action)) {
                    dynamicLabel = `${item.label} (${this.activeIds.length})`;
                }
                
                if (isItemDisabled) {
                    dynamicLabel += ' <span style="font-size:0.8em; margin-left:6px;" title="Alleen Lezen">🔒</span>';
                }
                
                html += `<div class="cm-item context-item ${dangerClass} ${submenuClass} ${disabledClass}" data-action="${item.action}" data-value="${item.value || ''}" style="display:flex; align-items:center; padding: 10px 16px; ${cursorStyle} transition: background 0.15s, color 0.15s; font-size:0.9rem; font-weight:500; color: ${textColor}; ${opacityStyle} position:relative;">
                            <span style="margin-right: 12px; display:flex; align-items:center; opacity:0.7;">${item.icon || ''}</span>
                            <span style="flex:1;">${dynamicLabel}</span>
                            ${subHtml}
                            ${item.submenu ? this.buildSubmenu(item.submenu) : ''}
                         </div>`;
            }
        });

        html = html.replace(/(<div class="cm-divider"[^>]*><\/div>\s*)+/g, '<div class="cm-divider" style="height: 1px; background: var(--border-dropdown); margin: 6px 0;"></div>');
        if (html.startsWith('<div class="cm-divider"')) html = html.substring(html.indexOf('</div>') + 6);
        if (html.endsWith('<div class="cm-divider" style="height: 1px; background: var(--border-dropdown); margin: 6px 0;"></div>')) html = html.substring(0, html.lastIndexOf('<div class="cm-divider"'));

        this.menu.innerHTML = html;
        this.bindItemActions();
        this.showAtPosition(x, y);
    }

    buildSubmenu(items) {
        let html = `<div class="context-submenu">`;
        items.forEach(item => {
            if (item === 'divider') {
                html += `<div class="cm-divider" style="height: 1px; background: var(--border-dropdown); margin: 6px 0;"></div>`;
            } else {
                html += `<div class="cm-item context-item" data-action="${item.action}" data-value="${item.value || ''}" style="display:flex; align-items:center; padding:10px 16px; cursor:pointer; font-size:0.9rem; font-weight:500; color:var(--text-main); transition:background 0.15s;">
                            ${item.icon ? `<span style="margin-right:12px; opacity:0.7; display:flex;">${item.icon}</span>` : ''} 
                            <span style="flex:1;">${item.label}</span>
                         </div>`;
            }
        });
        html += `</div>`;
        return html;
    }

    bindItemActions() {
        this.menu.querySelectorAll('.cm-color-dot').forEach(dot => {
            dot.addEventListener('mouseover', () => dot.style.transform = 'scale(1.2)');
            dot.addEventListener('mouseout', () => dot.style.transform = 'scale(1)');
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeAction('set_color', dot.dataset.value);
                this.close();
            });
        });

        this.menu.querySelectorAll('.cm-item').forEach(item => {
            item.addEventListener('mouseover', () => {
                if (item.classList.contains('cm-disabled')) return; 
                if (item.classList.contains('danger')) {
                    item.style.background = 'rgba(239, 68, 68, 0.1)';
                } else {
                    item.style.background = 'rgba(37, 99, 235, 0.1)';
                    item.style.color = 'var(--primary)';
                }
            });
            item.addEventListener('mouseout', () => {
                if (item.classList.contains('cm-disabled')) return;
                item.style.background = 'transparent';
                if (item.classList.contains('danger')) {
                    item.style.color = 'var(--error)';
                } else {
                    item.style.color = 'var(--text-main)';
                }
            });

            if (item.classList.contains('cm-has-submenu')) {
                item.addEventListener('mouseenter', () => {
                    if (item.classList.contains('cm-disabled')) return; 
                    clearTimeout(this.submenuTimer);
                    if (this.activeSubmenu && this.activeSubmenu !== item) {
                        const oldSub = this.activeSubmenu.querySelector('.context-submenu');
                        if (oldSub) oldSub.classList.remove('visible');
                    }
                    this.activeSubmenu = item;
                    this.submenuTimer = setTimeout(() => {
                        const sub = item.querySelector('.context-submenu');
                        if(sub) {
                            sub.classList.add('visible');
                            this.positionSubmenu(sub, item);
                        }
                    }, 200); 
                });
                
                item.addEventListener('mouseleave', () => {
                    clearTimeout(this.submenuTimer);
                    this.submenuTimer = setTimeout(() => {
                        const sub = item.querySelector('.context-submenu');
                        if(sub) sub.classList.remove('visible');
                    }, 300);
                });
            } else {
                if (!item.closest('.context-submenu')) {
                    item.addEventListener('mouseenter', () => {
                        clearTimeout(this.submenuTimer);
                        if (this.activeSubmenu) {
                            this.submenuTimer = setTimeout(() => {
                                if(this.activeSubmenu) {
                                    const sub = this.activeSubmenu.querySelector('.context-submenu');
                                    if(sub) sub.classList.remove('visible');
                                    this.activeSubmenu = null;
                                }
                            }, 250);
                        }
                    });
                }
            }

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.classList.contains('cm-has-submenu')) return; 
                
                if (item.classList.contains('cm-disabled')) {
                    if (window.EventBus) window.EventBus.emit('notify:warning', 'Actie geblokkeerd: Je hebt alleen leesrechten.');
                    return;
                }
                
                const action = item.dataset.action;
                const val = item.dataset.value;
                if (action) {
                    this.executeAction(action, val);
                    this.close();
                }
            });
        });
    }

    positionSubmenu(submenuEl, parentEl) {
        submenuEl.style.left = '100%';
        submenuEl.style.right = 'auto';
        
        const subRect = submenuEl.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();
        const winW = window.innerWidth;

        if (parentRect.right + subRect.width > winW - 10) {
            submenuEl.style.left = 'auto';
            submenuEl.style.right = '100%';
        }
    }

    showAtPosition(x, y) {
        this.menu.classList.remove('visible', 'flip-x', 'flip-y');
        this.menu.style.display = 'block';
        
        const rect = this.menu.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let posX = x;
        let posY = y;

        if (x + rect.width > winW) {
            posX = x - rect.width;
            this.menu.classList.add('flip-x'); 
        }
        
        if (y + rect.height > winH) {
            posY = winH - rect.height - 10;
            this.menu.classList.add('flip-y');
        }

        if (posX < 0) posX = 10;
        if (posY < 0) posY = 10;

        this.menu.style.left = `${posX}px`;
        this.menu.style.top = `${posY}px`;
        
        requestAnimationFrame(() => {
            this.menu.classList.add('visible');
        });
    }

    close() {
        this.menu.classList.remove('visible');
        clearTimeout(this.submenuTimer);
        if (this.activeSubmenu) {
            const sub = this.activeSubmenu.querySelector('.context-submenu');
            if (sub) sub.classList.remove('visible');
        }
        this.activeSubmenu = null;
    }

    getMatrixOptions(isFavorite, currentFileTags, ext, itemIsReadonly) {
        const iFolder = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        const iUpload = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;
        const iSelect = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
        const iOpen = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
        const iEye = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const iTag = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
        const iAlbum = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        const iDownload = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        const iEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const iCopy = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        const iMove = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>`;
        const iTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        const iUnlink = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const iInfo = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        const iImage = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        const iZip = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
        const iLock = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        const iFilter = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
        const iShare = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
        const iCrop = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>`;
        const iConvert = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>`;
        const iStar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

        let tagsSubmenu = [
            { label: 'Beheren / Toewijzen...', action: 'tag_assign_modal', icon: iEdit },
            'divider'
        ];
        if (window.App && window.App.tagManager && window.App.tagManager.availableTags) {
            window.App.tagManager.availableTags.forEach(t => {
                const isLinked = currentFileTags.includes(t.name);
                const checkIcon = isLinked ? '✓ ' : '';
                const visual = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${t.color}; margin-right:8px; box-shadow:0 1px 2px rgba(0,0,0,0.2);"></span>`;
                tagsSubmenu.push({ label: `${visual} <strong style="color:var(--text-main);">${checkIcon}</strong> ${t.name}`, action: 'tag_toggle', value: t.name });
            });
        }

        let albumsSubmenu = [
            { label: 'Beheren / Toewijzen...', action: 'album_assign_modal', icon: iEdit },
            'divider'
        ];
        if (window.App && window.App.albumManager && window.App.albumManager.albums) {
            window.App.albumManager.albums.forEach(a => {
                const visual = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${a.color || 'var(--primary)'}; margin-right:8px; box-shadow:0 1px 2px rgba(0,0,0,0.2);"></span>`;
                albumsSubmenu.push({ label: `${visual} ${a.name}`, action: 'album_quick_assign', value: a.id });
            });
        }

        const isMulti = this.activeIds.length > 1;
        const isImage = ['jpg','jpeg','png','webp','avif','heic','bmp'].includes(ext);
        const isMedia = ['mp4','mov','avi','mkv','webm','wav','ogg','flac','m4a','aac'].includes(ext) || isImage;

        let folderIsReadonly = false;
        if (window.App && window.App.renderEngine && window.App.renderEngine.currentData) {
            folderIsReadonly = (window.App.renderEngine.currentData.current_role === 'viewer');
        }

        switch (this.activeType) {
            case 'sidebar_root':
            case 'whitespace':
                return [
                    { label: 'Nieuwe Map', icon: iFolder, action: 'new_folder', show: this.hasPerm('folder_create'), disabled: folderIsReadonly },
                    { label: 'Nieuw Tekstbestand', icon: iEdit, action: 'new_text', show: this.hasPerm('file_upload'), disabled: folderIsReadonly },
                    'divider',
                    { label: 'Bestand Uploaden', icon: iUpload, action: 'upload_file', show: this.hasPerm('file_upload'), disabled: folderIsReadonly },
                    { label: 'Map Uploaden', icon: iFolder, action: 'upload_folder', show: this.hasPerm('file_upload'), disabled: folderIsReadonly },
                    { label: 'Vernieuwen', icon: iOpen, action: 'refresh', show: true },
                    'divider',
                    { label: 'Selecteer Alles', icon: iSelect, action: 'select_all', show: true }
                ];
                
            case 'whitespace_trash':
                return [
                    { label: 'Prullenbak Legen', icon: iTrash, action: 'empty_trash', danger: true, show: this.hasPerm('trash_empty') },
                    'divider',
                    { label: 'Vernieuwen', icon: iOpen, action: 'refresh', show: true }
                ];

            case 'sidebar_recent':
            case 'sidebar_favorites':
            case 'sidebar_slideshows':
            case 'whitespace_readonly':
                return [
                    { label: 'Vernieuwen', icon: iOpen, action: 'refresh', show: true }
                ];

            case 'file':
                return [
                    { label: 'Voorbeeld (Quick Look)', icon: iEye, action: 'preview', show: true },
                    ...(!isMulti && isImage ? [{ label: 'Bewerken (Editor)', icon: iCrop, action: 'edit_image', show: this.hasPerm('file_upload'), disabled: itemIsReadonly || folderIsReadonly }] : []),
                    ...(!isMulti && isMedia ? [{ label: 'Converteer Formaat', icon: iConvert, action: 'convert_file', show: this.hasPerm('file_upload'), disabled: itemIsReadonly || folderIsReadonly }] : []),
                    'divider',
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') }, 
                    'divider',
                    ...(!isMulti ? [{ label: isFavorite ? 'Favoriet verwijderen' : 'Favoriet toevoegen', icon: iStar, action: 'favorite', show: true }] : []),
                    { label: 'Tags', icon: iTag, submenu: tagsSubmenu, show: this.hasPerm('tag_assign'), disabled: itemIsReadonly },
                    { label: 'Album', icon: iAlbum, submenu: albumsSubmenu, show: this.hasPerm('album_edit'), disabled: itemIsReadonly },
                    'divider',
                    { label: isMulti ? 'Downloaden als ZIP' : 'Download', icon: isMulti ? iZip : iDownload, action: isMulti ? 'zip' : 'download', show: this.hasPerm('file_download') },
                    ...(!isMulti ? [{ label: 'Hernoemen', icon: iEdit, action: 'rename', show: this.hasPerm('item_rename'), disabled: itemIsReadonly }] : []),
                    { label: 'Dupliceren', icon: iCopy, action: 'copy', show: this.hasPerm('item_move'), disabled: folderIsReadonly },
                    { label: 'Verplaatsen', icon: iMove, action: 'move', show: this.hasPerm('item_move'), disabled: itemIsReadonly },
                    'divider',
                    ...(!isMulti ? [{ label: 'Eigenschappen', icon: iInfo, action: 'properties', show: true }] : []),
                    { label: 'Verwijderen', icon: iTrash, action: 'delete', danger: true, show: this.hasPerm('file_delete'), disabled: itemIsReadonly }
                ];
                
            case 'album_file':
                return [
                    { label: 'Voorbeeld (Quick Look)', icon: iEye, action: 'preview', show: true },
                    ...(!isMulti && isImage ? [{ label: 'Bewerken (Editor)', icon: iCrop, action: 'edit_image', show: this.hasPerm('file_upload'), disabled: itemIsReadonly || folderIsReadonly }] : []),
                    ...(!isMulti ? [{ label: 'Stel in als cover', icon: iImage, action: 'set_cover', show: this.hasPerm('album_edit'), disabled: itemIsReadonly }] : []),
                    'divider',
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') },
                    'divider',
                    ...(!isMulti ? [{ label: isFavorite ? 'Favoriet verwijderen' : 'Favoriet toevoegen', icon: iStar, action: 'favorite', show: true }] : []),
                    { label: 'Tags', icon: iTag, submenu: tagsSubmenu, show: this.hasPerm('tag_assign'), disabled: itemIsReadonly },
                    'divider',
                    { label: isMulti ? 'Downloaden als ZIP' : 'Download', icon: isMulti ? iZip : iDownload, action: isMulti ? 'zip' : 'download', show: this.hasPerm('file_download') },
                    ...(!isMulti ? [{ label: 'Eigenschappen', icon: iInfo, action: 'properties', show: true }] : []),
                    'divider',
                    { label: 'Verwijder uit album', icon: iUnlink, action: 'remove_from_album', danger: true, show: this.hasPerm('album_edit'), disabled: itemIsReadonly },
                    { label: 'Verplaats naar prullenbak', icon: iTrash, action: 'delete', danger: true, show: this.hasPerm('file_delete'), disabled: itemIsReadonly }
                ];

            case 'tag_file':
                return [
                    { label: 'Voorbeeld (Quick Look)', icon: iEye, action: 'preview', show: true },
                    ...(!isMulti && isImage ? [{ label: 'Bewerken (Editor)', icon: iCrop, action: 'edit_image', show: this.hasPerm('file_upload'), disabled: itemIsReadonly || folderIsReadonly }] : []),
                    'divider',
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') }, 
                    'divider',
                    ...(!isMulti ? [{ label: isFavorite ? 'Favoriet verwijderen' : 'Favoriet toevoegen', icon: iStar, action: 'favorite', show: true }] : []),
                    { label: 'Album', icon: iAlbum, submenu: albumsSubmenu, show: this.hasPerm('album_edit'), disabled: itemIsReadonly },
                    'divider',
                    { label: isMulti ? 'Downloaden als ZIP' : 'Download', icon: isMulti ? iZip : iDownload, action: isMulti ? 'zip' : 'download', show: this.hasPerm('file_download') },
                    ...(!isMulti ? [{ label: 'Eigenschappen', icon: iInfo, action: 'properties', show: true }] : []),
                    'divider',
                    { label: 'Verwijder dit label', icon: iUnlink, action: 'remove_from_tag', danger: true, show: this.hasPerm('tag_assign'), disabled: itemIsReadonly },
                    { label: 'Verplaats naar prullenbak', icon: iTrash, action: 'delete', danger: true, show: this.hasPerm('file_delete'), disabled: itemIsReadonly }
                ];

            case 'slideshow_card':
            case 'sidebar_slideshow_item':
                // FASE 4 FIX: Slideshow Menu Toegevoegd
                return [
                    { label: 'Afspelen', icon: iOpen, action: 'slideshow_play', show: true },
                    { label: 'Bewerken', icon: iEdit, action: 'edit_slideshow_modal', show: this.hasPerm('album_edit') },
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') },
                    'divider',
                    { label: 'Slideshow Verwijderen', icon: iTrash, action: 'slideshow_delete', danger: true, show: this.hasPerm('album_edit') }
                ];

            case 'album_card':
            case 'sidebar_album_item':
                return [
                    { label: 'Album Openen', icon: iOpen, action: 'album_open', show: true },
                    { label: 'Bewerken (Naam/Kleur)', icon: iEdit, action: 'edit_album_modal', show: this.hasPerm('album_edit') },
                    { label: 'Cover Instellen', icon: iImage, action: 'set_cover_album', show: this.hasPerm('album_edit') },
                    { label: 'Wachtwoord Instellen', icon: iLock, action: 'set_password_album', show: this.hasPerm('album_edit') },
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') }, 
                    'divider',
                    { label: 'Album Verwijderen', icon: iTrash, action: 'album_delete', danger: true, show: this.hasPerm('album_edit') }
                ];
                
            case 'tag_card':
            case 'sidebar_tag_item':
                return [
                    { label: 'Bestanden Bekijken', icon: iOpen, action: 'tag_open', show: true },
                    { label: 'Filteren / Uitsluiten', icon: iFilter, action: 'tag_filter', show: true },
                    { label: 'Bewerken (Kleur/Icoon)', icon: iEdit, action: 'tag_edit', show: this.hasPerm('tag_manage') },
                    'divider',
                    { label: 'Label Verwijderen', icon: iTrash, action: 'tag_delete', danger: true, show: this.hasPerm('tag_manage') }
                ];

            case 'folder':
            case 'sidebar_folder':
                return [
                    { label: 'Map Openen', icon: iOpen, action: 'open_folder', show: true },
                    'divider',
                    { label: 'Deel via Link', icon: iShare, action: 'share', show: this.hasPerm('share_create') }, 
                    'divider',
                    { label: 'Inpakken als ZIP', icon: iZip, action: 'zip', show: this.hasPerm('file_download') },
                    'divider',
                    ...(!isMulti ? [{ label: 'Hernoemen', icon: iEdit, action: 'rename', show: this.hasPerm('item_rename'), disabled: itemIsReadonly }] : []),
                    { label: 'Verplaatsen', icon: iMove, action: 'move', show: this.hasPerm('item_move'), disabled: itemIsReadonly },
                    'divider',
                    ...(!isMulti ? [{ label: 'Eigenschappen', icon: iInfo, action: 'properties', show: true }] : []),
                    { label: 'Verwijderen', icon: iTrash, action: 'delete', danger: true, show: this.hasPerm('file_delete'), disabled: itemIsReadonly }
                ];

            case 'sidebar_trash':
                return [
                    { label: 'Prullenbak Bekijken', icon: iEye, action: 'open_trash', show: this.hasPerm('trash_view') },
                    'divider',
                    { label: 'Prullenbak Legen', icon: iTrash, action: 'empty_trash', danger: true, show: this.hasPerm('trash_empty') }
                ];

            case 'trash_item':
                return [
                    { label: 'Herstellen', icon: iMove, action: 'restore', show: this.hasPerm('trash_restore') },
                    'divider',
                    { label: 'Definitief Verwijderen', icon: iTrash, action: 'force_delete', danger: true, show: this.hasPerm('trash_empty') }
                ];

            default:
                return [
                    { label: 'Vernieuwen', icon: iOpen, action: 'refresh', show: true }
                ];
        }
    }

    async executeAction(action, value) {
        const getCsrf = async () => {
            const res = await fetch('/api/csrf');
            const data = await res.json();
            return data.csrf_token;
        };

        const currentFolderId = window.App.renderEngine ? window.App.renderEngine.currentFolderId : null;
        const currentAlbumId = window.App.renderEngine ? window.App.renderEngine.currentAlbumId : null;
        const currentTagName = window.App.renderEngine ? window.App.renderEngine.currentTagName : null;
        
        const resolveType = (id) => {
            if (!id) return 'file';
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el && el.dataset && el.dataset.type) {
                return el.dataset.type === 'folder' ? 'folder' : 'file';
            }
            if (this.activeTrashItemType) return this.activeTrashItemType;
            if (this.activeType === 'sidebar_folder') return 'folder';
            if (this.activeType === 'folder' || this.activeType === 'file') return this.activeType;
            return 'file';
        };

        try {
            switch (action) {
                
                case 'zip': {
                    let url = '';
                    if (this.activeIds.length > 1) {
                        url = `/api/files?action=zip&ids=${this.activeIds.join(',')}`;
                    } else {
                        url = `/api/files?action=zip&id=${this.activeId}`;
                    }
                    if (window.EventBus) window.EventBus.emit('notify:info', 'Bezig met inpakken (ZIP), een moment geduld...');
                    window.location.href = url;
                    if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                    break;
                }

                case 'favorite': {
                    if (window.App && window.App.itemActions) {
                        window.App.itemActions.toggleFavorite(this.activeId, this.activeType);
                    } else {
                        if (window.EventBus) window.EventBus.emit('notify:warning', 'Systeemfout: ItemActions niet geladen.');
                    }
                    break;
                }

                case 'preview':
                    if (window.App && window.App.lightbox && window.App.renderEngine) {
                        const files = window.App.renderEngine.currentData.files || [];
                        const index = files.findIndex(f => String(f.id) === String(this.activeId));
                        if (index > -1) window.App.lightbox.open(files, index);
                    }
                    break;

                case 'edit_image':
                    if (window.App && window.App.editor && window.App.renderEngine) {
                        const fileToEdit = window.App.renderEngine.currentData.files.find(f => String(f.id) === String(this.activeId));
                        if (fileToEdit) window.App.editor.open(fileToEdit);
                    }
                    break;

                case 'convert_file':
                    if (window.App && window.App.converter && window.App.renderEngine) {
                        const fileToConvert = window.App.renderEngine.currentData.files.find(f => String(f.id) === String(this.activeId));
                        if (fileToConvert) window.App.converter.open(fileToConvert);
                    }
                    break;

                case 'download':
                    for (const id of this.activeIds) {
                        window.open(`/api/files?action=download&id=${id}&download=1`, '_blank');
                    }
                    if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                    break;
                    
                case 'share':
                    let name = 'Geselecteerd item';
                    if (this.activeTarget) {
                        const el = this.activeTarget.closest('.grid-tile, .list-row, .album-card, .nav-item, .album-item, .slideshow-card, .slideshow-item');
                        if (el) {
                            const nameEl = el.querySelector('.tile-name, .name-cell, .label, .album-name, .slideshow-title');
                            if (nameEl) name = nameEl.textContent.trim();
                        }
                    }
                    
                    let targetType = resolveType(this.activeId);
                    if (this.activeType === 'album_card' || this.activeType === 'sidebar_album_item') {
                        targetType = 'album';
                    } else if (this.activeType === 'sidebar_folder' || targetType === 'folder') {
                        targetType = 'folder';
                    // FASE 4 FIX: Deel Slideshow
                    } else if (this.activeType === 'slideshow_card' || this.activeType === 'sidebar_slideshow_item') {
                        targetType = 'slideshow';
                    } else {
                        targetType = 'file';
                    }

                    if (!window.App.shareModal && typeof window.ShareModal !== 'undefined') {
                        window.App.shareModal = new window.ShareModal(window.App.api || fetch, window.ModalService || window.App.modalService);
                    }

                    if (window.App && window.App.shareModal) {
                        window.App.shareModal.open(targetType, this.activeId, name);
                    } else {
                        if (window.EventBus) window.EventBus.emit('notify:info', 'Deellink module ophalen...');
                        const script = document.createElement('script');
                        script.src = 'public/js/modules/share/ShareModal.js?v=' + new Date().getTime(); 
                        script.onload = () => {
                            if (typeof window.ShareModal !== 'undefined') {
                                window.App.shareModal = new window.ShareModal(window.App.api || fetch, window.ModalService || window.App.modalService);
                                window.App.shareModal.open(targetType, this.activeId, name);
                            }
                        };
                        script.onerror = () => {
                            if (window.EventBus) window.EventBus.emit('notify:error', 'Bestand ShareModal.js ontbreekt (404). Controleer de map en hoofdletters!');
                        };
                        document.head.appendChild(script);
                    }
                    break;

                case 'edit_album_modal':
                    if (window.App && window.App.albumManager) window.App.albumManager.showEditModal(this.activeId);
                    break;
                case 'set_cover_album':
                    if (window.App && window.App.albumManager) window.App.albumManager.showCoverModal(this.activeId, null);
                    break;
                case 'set_password_album':
                    if (window.App && window.App.albumManager) window.App.albumManager.showPincodeModal(this.activeId, null);
                    break;
                case 'tag_edit':
                    if (window.App && window.App.tagManager) window.App.tagManager.showEditModal(this.activeId);
                    break;
                case 'tag_filter':
                    if (window.App && window.App.filterEngine) {
                        window.App.filterEngine.setCategory('alles'); 
                        if (window.EventBus) window.EventBus.emit('notify:info', 'Filter actief op label: ' + this.activeId);
                    }
                    break;

                case 'tag_assign_modal':
                    if (window.App && window.App.tagManager) window.App.tagManager.show(this.activeIds);
                    break;

                case 'tag_toggle': {
                    const token = await getCsrf();
                    let successCount = 0;
                    
                    const fileObj = window.App.renderEngine.currentData.files.find(f => String(f.id) === String(this.activeId));
                    const hasTag = fileObj && fileObj.tags && fileObj.tags.some(t => t.name === value);

                    if (hasTag) {
                        for (const id of this.activeIds) {
                            const res = await fetch('/api/tags/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: parseInt(id, 10), tag_name: value, csrf_token: token }) });
                            if (res.ok) successCount++;
                        }
                        if(successCount > 0 && window.EventBus) window.EventBus.emit('notify:success', `Label ontkoppeld van ${successCount} item(s)!`);
                    } else {
                        const tagObj = window.App.tagManager.availableTags.find(t => t.name === value) || {name: value, color: '#3b82f6'};
                        for (const id of this.activeIds) {
                            const res = await fetch('/api/tags/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: parseInt(id, 10), tag_id: tagObj.id, tag: tagObj, csrf_token: token }) });
                            if (res.ok) successCount++;
                        }
                        if(successCount > 0 && window.EventBus) window.EventBus.emit('notify:success', `Label gekoppeld aan ${successCount} item(s)!`);
                    }
                    
                    if (successCount > 0 && window.EventBus) {
                        const scrollPos = window.scrollY || document.documentElement.scrollTop;
                        window.EventBus.emit('view:refresh');
                        setTimeout(() => window.scrollTo(0, scrollPos), 50);
                    }
                    break;
                }
                
                case 'remove_from_tag': {
                    const token = await getCsrf();
                    let successCount = 0;
                    for (const id of this.activeIds) {
                        const res = await fetch('/api/tags/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: parseInt(id, 10), tag_name: currentTagName, csrf_token: token }) });
                        if(res.ok) successCount++;
                    }
                    if(successCount > 0 && window.EventBus) { 
                        window.EventBus.emit('notify:success', `Label verwijderd uit ${successCount} item(s).`); 
                        const scrollPos = window.scrollY || document.documentElement.scrollTop;
                        window.EventBus.emit('view:refresh');
                        setTimeout(() => window.scrollTo(0, scrollPos), 50);
                    }
                    break;
                }

                case 'album_assign_modal':
                    if (window.EventBus) window.EventBus.emit('album:assign', this.activeIds);
                    break;

                case 'album_quick_assign': {
                    const token = await getCsrf();
                    let successCount = 0;
                    for (const id of this.activeIds) {
                        const res = await fetch('/api/albums/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: parseInt(id, 10), album_id: parseInt(value, 10), csrf_token: token }) });
                        if(res.ok) successCount++;
                    }
                    if(successCount > 0 && window.EventBus) { 
                        window.EventBus.emit('notify:success', `${successCount} item(s) aan album gekoppeld!`); 
                        const scrollPos = window.scrollY || document.documentElement.scrollTop;
                        window.EventBus.emit('view:refresh');
                        setTimeout(() => window.scrollTo(0, scrollPos), 50);
                    }
                    break;
                }
                
                case 'remove_from_album': {
                    const token = await getCsrf();
                    let successCount = 0;
                    for (const id of this.activeIds) {
                        const res = await fetch('/api/albums/remove-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: parseInt(id, 10), album_id: parseInt(currentAlbumId, 10), csrf_token: token }) });
                        if(res.ok) successCount++;
                    }
                    if(successCount > 0 && window.EventBus) { 
                        window.EventBus.emit('notify:success', `${successCount} item(s) uit album verwijderd.`); 
                        const scrollPos = window.scrollY || document.documentElement.scrollTop;
                        window.EventBus.emit('view:refresh');
                        setTimeout(() => window.scrollTo(0, scrollPos), 50);
                    }
                    break;
                }

                case 'set_cover': {
                    const token = await getCsrf();
                    const res = await fetch('/api/albums/cover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ album_id: parseInt(currentAlbumId, 10), file_id: parseInt(this.activeId, 10), csrf_token: token }) });
                    const data = await res.json();
                    if(data.status === 'success') { if (window.EventBus) window.EventBus.emit('notify:success', 'Cover succesvol ingesteld!'); if (window.EventBus) window.EventBus.emit('view:refresh'); } else { if (window.ModalService) window.ModalService.alert('Fout', data.message); }
                    break;
                }

                case 'album_delete': {
                    if (window.ModalService) {
                        window.ModalService.confirm('Album Verwijderen', 'Weet je zeker dat je dit album wilt wissen? De bestanden blijven behouden.', { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => {
                            if (agreed) { const token = await getCsrf(); await fetch('/api/albums/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ album_id: parseInt(this.activeId, 10), csrf_token: token }) }); if (window.EventBus) window.EventBus.emit('view:refresh'); }
                        });
                    }
                    break;
                }

                case 'tag_delete': {
                    const tagObj = window.App.tagManager.availableTags.find(t => t.name === this.activeId);
                    if (tagObj && window.ModalService) {
                        window.ModalService.confirm('Label Verwijderen', `Weet je zeker dat je het label '${this.activeId}' wilt wissen?`, { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => { if (agreed) { await window.App.tagManager.deleteTag(tagObj.id); } });
                    }
                    break;
                }
                    
                case 'album_open':
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', 'album_' + this.activeId);
                    break;
                    
                case 'tag_open':
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', 'tag_detail_' + this.activeId);
                    break;

                // FASE 4 FIX: Slideshow Event Afhandeling
                case 'slideshow_play':
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', 'slideshow_' + this.activeId);
                    break;

                case 'edit_slideshow_modal':
                    if (window.App && window.App.slideshowManager) window.App.slideshowManager.showEditModal(this.activeId);
                    break;

                case 'slideshow_delete':
                    if (window.ModalService) {
                        window.ModalService.confirm('Slideshow Verwijderen', 'Weet je zeker dat je deze slideshow wilt wissen? De originele bestanden blijven behouden.', { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => {
                            if (agreed) { 
                                const token = await getCsrf(); 
                                await fetch('/api/slideshows/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slideshow_id: parseInt(this.activeId, 10), csrf_token: token }) }); 
                                if (window.EventBus) window.EventBus.emit('view:refresh'); 
                            }
                        });
                    }
                    break;

                case 'empty_trash':
                    if (window.ModalService) {
                        window.ModalService.confirm('Prullenbak Legen', 'Weet je zeker dat je de prullenbak volledig wilt legen?', { danger: true, yesText: 'Alles wissen' })
                        .then(async agreed => {
                            if(agreed) { const token = await getCsrf(); await fetch('/api/trash/empty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf_token: token }) }); if (window.EventBus) window.EventBus.emit('view:refresh'); }
                        });
                    }
                    break;

                case 'open_trash':
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', 'trash');
                    break;

                case 'new_folder': {
                    if (window.ModalService) {
                        const newName = await window.ModalService.prompt('Nieuwe Map', 'Geef de nieuwe map een naam:', 'Nieuwe Map');
                        if (newName) { const token = await getCsrf(); await fetch('/api/folders/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: currentFolderId, name: newName, csrf_token: token }) }); if (window.EventBus) window.EventBus.emit('view:refresh'); }
                    }
                    break;
                }

                case 'new_text': {
                    if (window.ModalService) {
                        const newName = await window.ModalService.prompt('Nieuw Tekstbestand', 'Geef het bestand een naam:', 'Nieuw document.txt');
                        if (newName) { const token = await getCsrf(); await fetch('/api/files/create-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_id: currentFolderId, name: newName, csrf_token: token }) }); if (window.EventBus) window.EventBus.emit('view:refresh'); }
                    }
                    break;
                }

                case 'rename': {
                    if (window.ModalService) {
                        let currentName = '';
                        if (this.activeTarget) {
                            const el = this.activeTarget.closest('.grid-tile, .list-row');
                            if (el) { const nameEl = el.querySelector('.tile-name, .name-cell'); if (nameEl) currentName = nameEl.textContent.trim(); }
                        }
                        const newName = await window.ModalService.prompt('Hernoemen', 'Voer de nieuwe naam in:', currentName);
                        if (newName && newName !== currentName) { 
                            const token = await getCsrf(); 
                            const tForId = resolveType(this.activeId);
                            await fetch('/api/files/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: tForId, id: this.activeId, name: newName, csrf_token: token }) }); 
                            if (window.EventBus) window.EventBus.emit('view:refresh'); 
                        }
                    }
                    break;
                }

                case 'properties':
                    if (window.App && window.App.propertiesPanel) {
                        window.App.propertiesPanel.currentItem = { id: this.activeId };
                        const tForId = resolveType(this.activeId);
                        window.App.propertiesPanel.currentType = tForId;
                        window.App.propertiesPanel.loadProperties(tForId, this.activeId);
                    }
                    break;

                // FASE 4 FIX: Verwijs uploads veilig door naar de EventBus i.p.v. het klikken op ongekoppelde DOM elementen
                case 'upload_file':
                    if (window.EventBus) window.EventBus.emit('upload:file');
                    break;
                    
                case 'upload_folder':
                    if (window.EventBus) window.EventBus.emit('upload:folder');
                    break;
                    
                case 'select_all':
                    if (window.App && window.App.selectionManager) {
                        const view = document.getElementById('file-view');
                        if(view) view.querySelectorAll('.grid-tile:not(.is-back-tile), .list-row:not(.is-back-tile)').forEach(el => window.App.selectionManager.selectItemByElement(el, false));
                    }
                    break;
                    
                case 'refresh':
                    if (window.EventBus) window.EventBus.emit('view:refresh');
                    break;

                case 'open_folder':
                    if (this.activeIds.length > 0 && window.App.renderEngine) window.App.renderEngine.loadFolder(this.activeIds[0]);
                    break;

                case 'set_color': {
                    const token = await getCsrf();
                    let success = 0;
                    for (const id of this.activeIds) {
                        const tForId = resolveType(id);
                        const res = await fetch('/api/style/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: tForId, id: id, color: value, csrf_token: token }) });
                        if (res.ok) success++;
                    }
                    if (success > 0 && window.EventBus) { window.EventBus.emit('notify:success', 'Kleur markering opgeslagen!'); window.EventBus.emit('view:refresh'); }
                    break;
                }

                case 'delete':
                    if (window.ModalService) {
                        window.ModalService.confirm('Naar Prullenbak', `Weet je zeker dat je ${this.activeIds.length} item(s) naar de prullenbak wilt verplaatsen?`, { danger: true, yesText: 'Ja, verplaatsen' })
                        .then(async agreed => {
                            if(agreed) {
                                const token = await getCsrf();
                                let success = 0;
                                for (const id of this.activeIds) {
                                    const tForId = resolveType(id);
                                    const res = await fetch('/api/files/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: tForId, id: id, csrf_token: token }) });
                                    if (res.ok) success++;
                                }
                                if (window.EventBus) { window.EventBus.emit('notify:warning', `${success} item(s) naar prullenbak.`); window.EventBus.emit('view:refresh'); }
                                if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                            }
                        });
                    }
                    break;

                case 'restore': {
                    const tokenRestore = await getCsrf();
                    let restored = 0;
                    for (const id of this.activeIds) {
                        const tForId = resolveType(id);
                        const res = await fetch('/api/trash/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: tForId, id: id, csrf_token: tokenRestore }) });
                        if (res.ok) restored++;
                    }
                    if (restored > 0 && window.EventBus) { window.EventBus.emit('notify:success', `${restored} item(s) hersteld.`); window.EventBus.emit('view:refresh'); }
                    if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                    break;
                }

                case 'force_delete':
                    if (window.ModalService) {
                        window.ModalService.confirm('Definitief Verwijderen', `Weet je zeker dat je ${this.activeIds.length} item(s) permanent wilt verwijderen?`, { danger: true, yesText: 'Definitief wissen' })
                        .then(async agreed => {
                            if(agreed) {
                                const token = await getCsrf();
                                let killed = 0;
                                for (const id of this.activeIds) {
                                    const tForId = resolveType(id);
                                    const res = await fetch('/api/trash/force-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: tForId, id: id, csrf_token: token }) });
                                    if (res.ok) killed++;
                                }
                                if (window.EventBus) { window.EventBus.emit('notify:success', `${killed} item(s) definitief verwijderd.`); window.EventBus.emit('view:refresh'); }
                                if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                            }
                        });
                    }
                    break;

                case 'copy': {
                    const token = await getCsrf();
                    let copied = 0;
                    for (const id of this.activeIds) {
                        const res = await fetch('/api/files/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, new_folder_id: currentFolderId, csrf_token: token }) });
                        if (res.ok) copied++;
                    }
                    if (copied > 0 && window.EventBus) { window.EventBus.emit('notify:success', `${copied} item(s) gedupliceerd.`); window.EventBus.emit('view:refresh'); }
                    if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                    break;
                }

                case 'move':
                    this.openMoveModal(this.activeIds);
                    break;

                default:
                    if (window.EventBus) window.EventBus.emit('notify:info', `Functie '${action}' volgt in de volgende iteratie.`);
            }
        } catch (err) {
            console.error('ContextMenu Actie Fout:', err);
        }
    }

    async openMoveModal(itemIds) {
        let itemName = itemIds.length === 1 ? '1 item' : `${itemIds.length} items`;
        if (itemIds.length === 1 && this.activeTarget) {
            const nameEl = this.activeTarget.closest('.grid-tile, .list-row')?.querySelector('.tile-name, .name-cell');
            if (nameEl) itemName = nameEl.textContent.trim();
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.style.zIndex = '11000';
        
        overlay.innerHTML = `
            <div class="modal-box" style="width: 650px; max-width: 95vw; background: var(--bg-dropdown); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; height: 75vh; overflow:hidden;">
                
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">Verplaatsen naar...</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Je verplaatst: <strong style="color:var(--primary); background:rgba(37,99,235,0.1); padding:2px 6px; border-radius:4px;">${itemName}</strong></div>
                    </div>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                
                <div id="move-breadcrumbs" style="padding:12px 24px; background:rgba(37, 99, 235, 0.03); border-bottom:1px solid var(--border-dropdown); font-size:0.85rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px; overflow-x:auto; scrollbar-width:none;">
                </div>

                <div id="move-folder-list" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:4px; background: var(--bg-main);">
                    <div style="text-align:center; padding: 40px; color:var(--text-muted);">
                        <div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div>
                    </div>
                </div>

                <div style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:flex-end; align-items:center; gap:12px;">
                    <span id="move-target-name" style="font-size:0.85rem; color:var(--text-muted); margin-right:auto; display:flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        Mijn Bestanden
                    </span>
                    <button class="btn-modal btn-secondary cancel-btn">Annuleren</button>
                    <button class="btn-modal btn-primary confirm-btn">Hierheen verplaatsen</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        let currentFolder = null;

        overlay.querySelector('.close-btn').onclick = () => overlay.remove();
        overlay.querySelector('.cancel-btn').onclick = () => overlay.remove();
        
        overlay.querySelector('.confirm-btn').onclick = async () => {
            try {
                const btn = overlay.querySelector('.confirm-btn');
                btn.disabled = true;
                btn.innerHTML = '<div class="btn-loader" style="width:14px;height:14px;border-width:2px;border-top-color:white;"></div> Verplaatsen...';

                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                
                let moved = 0;
                for (const id of itemIds) {
                    let typeForId = 'file';
                    const el = document.querySelector(`[data-id="${id}"]`);
                    if (el && el.dataset && el.dataset.type) {
                        typeForId = el.dataset.type === 'folder' ? 'folder' : 'file';
                    }

                    const res = await fetch('/api/files/move', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            type: typeForId,
                            id: id,
                            new_folder_id: currentFolder,
                            csrf_token: tokenData.csrf_token
                        })
                    });
                    if (res.ok) moved++;
                }
                
                if (moved > 0) {
                    if (window.EventBus) {
                        window.EventBus.emit('notify:success', `${moved} item(s) succesvol verplaatst!`);
                        window.EventBus.emit('view:refresh');
                    }
                    if (window.App.selectionManager) window.App.selectionManager.clearSelection();
                    overlay.remove();
                } else {
                    if (window.ModalService) window.ModalService.alert('Fout', 'Verplaatsen mislukt.');
                    btn.disabled = false;
                    btn.textContent = 'Hierheen verplaatsen';
                }
            } catch(e) { console.error(e); }
        };

        const loadContent = async (folderId) => {
            try {
                const list = overlay.querySelector('#move-folder-list');
                const breadContainer = overlay.querySelector('#move-breadcrumbs');
                const targetName = overlay.querySelector('#move-target-name');
                
                list.innerHTML = `<div style="text-align:center; padding: 40px; color:var(--text-muted);"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>`;

                const res = await fetch(`/api/files${folderId ? '?folder='+folderId : ''}`);
                const data = await res.json();
                
                list.innerHTML = '';

                let crumbsHtml = `<span class="crumb-nav" data-id="root" style="cursor:pointer; display:flex; align-items:center; gap:4px; transition:color 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> Mijn Bestanden</span>`;
                let currentFolderName = "Mijn Bestanden";

                if (data.data.breadcrumbs && data.data.breadcrumbs.length > 0) {
                    data.data.breadcrumbs.forEach((crumb, idx) => {
                        crumbsHtml += `<span style="opacity:0.5;">/</span>`;
                        if (idx === data.data.breadcrumbs.length - 1) {
                            crumbsHtml += `<span style="color:var(--primary); cursor:default;">${crumb.name}</span>`;
                            currentFolderName = crumb.name;
                        } else {
                            crumbsHtml += `<span class="crumb-nav" data-id="${crumb.id}" style="cursor:pointer; transition:color 0.2s;">${crumb.name}</span>`;
                        }
                    });
                }
                breadContainer.innerHTML = crumbsHtml;
                targetName.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> <strong>${currentFolderName}</strong>`;

                breadContainer.querySelectorAll('.crumb-nav').forEach(c => {
                    c.onmouseover = () => c.style.color = 'var(--primary)';
                    c.onmouseout = () => c.style.color = 'var(--text-main)';
                    c.onclick = () => {
                        currentFolder = c.dataset.id === 'root' ? null : c.dataset.id;
                        loadContent(currentFolder);
                    };
                });

                if (folderId) {
                    const parentId = data.data.breadcrumbs.length > 1 ? data.data.breadcrumbs[data.data.breadcrumbs.length - 2].id : null;
                    const backEl = document.createElement('div');
                    backEl.style.cssText = `padding: 10px 16px; border-radius: 8px; cursor:pointer; display:flex; align-items:center; gap: 14px; transition: all 0.2s; background: rgba(128,128,128,0.03); color: var(--text-muted); font-weight: 600; font-size:0.9rem; margin-bottom: 8px;`;
                    backEl.onmouseover = () => { backEl.style.background = 'rgba(128,128,128,0.08)'; backEl.style.color = 'var(--text-main)'; };
                    backEl.onmouseout = () => { backEl.style.background = 'rgba(128,128,128,0.03)'; backEl.style.color = 'var(--text-muted)'; };
                    backEl.innerHTML = `
                        <div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></div>
                        <span>.. (Terug naar bovenliggende map)</span>
                    `;
                    backEl.onclick = () => { currentFolder = parentId; loadContent(parentId); };
                    list.appendChild(backEl);
                }

                data.data.folders.forEach(f => {
                    if (itemIds.includes(String(f.id))) return;

                    const fEl = document.createElement('div');
                    fEl.style.cssText = `padding: 8px 16px; border-radius: 8px; cursor:pointer; display:flex; align-items:center; gap: 14px; transition: all 0.2s; background: transparent; border: 1px solid transparent;`;
                    fEl.onmouseover = () => { fEl.style.background = 'rgba(37,99,235,0.05)'; fEl.style.borderColor = 'var(--primary)'; };
                    fEl.onmouseout = () => { fEl.style.background = 'transparent'; fEl.style.borderColor = 'transparent'; };
                    
                    const folderColor = f.color && f.color !== 'none' ? f.color : '#f59e0b';
                    const folderVisual = `<div style="width:32px; height:32px; background:${folderColor}20; color:${folderColor}; border-radius:6px; display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>`;
                    
                    fEl.innerHTML = `
                        ${folderVisual}
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight: 600; color:var(--text-main); font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Map</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); opacity:0.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    `;
                    fEl.onclick = () => {
                        currentFolder = f.id;
                        loadContent(f.id); 
                    };
                    list.appendChild(fEl);
                });

                data.data.files.forEach(f => {
                    const fEl = document.createElement('div');
                    fEl.style.cssText = `padding: 8px 16px; border-radius: 8px; display:flex; align-items:center; gap: 14px; background: transparent; opacity: 0.5; filter: grayscale(100%); cursor: not-allowed;`;
                    
                    const isImg = ['jpg','jpeg','png','gif','webp'].includes(f.extension?.toLowerCase());
                    let visual = `<div style="width:32px; height:32px; background:rgba(128,128,128,0.1); color:var(--text-muted); border-radius:6px; display:flex; align-items:center; justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>`;
                    
                    if (isImg) {
                        const t = new Date(f.updated_at || f.created_at || Date.now()).getTime();
                        visual = `
                            <img src="/api/files?action=thumb&id=${f.id}&t=${t}" style="width:32px; height:32px; object-fit:cover; border-radius:6px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display:none; width:32px; height:32px; background:rgba(128,128,128,0.1); color:var(--text-muted); border-radius:6px; align-items:center; justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
                        `;
                    }

                    fEl.innerHTML = `
                        ${visual}
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight: 500; color:var(--text-main); font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name || f.original_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${f.formatted_size} • ${f.extension?.toUpperCase() || 'FILE'}</div>
                        </div>
                    `;
                    list.appendChild(fEl);
                });

            } catch (err) {
                console.error(err);
            }
        };

        loadContent(null);
    }
}

window.App = window.App || {};
window.App.contextMenu = new ContextMenu();