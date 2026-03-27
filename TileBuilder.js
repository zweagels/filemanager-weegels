/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Views | FILE: public/js/views/TileBuilder.js */

(function() {
    const folder3DIcon = '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fold-back" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#EAB308" /><stop offset="100%" stop-color="#D97706" /></linearGradient><linearGradient id="fold-front" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FDE047" /><stop offset="100%" stop-color="#F59E0B" /></linearGradient><filter id="fold-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="-2" stdDeviation="3" flood-color="#78350F" flood-opacity="0.3"/></filter><filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.2"/></filter></defs><path d="M10 80V25C10 22 12 20 15 20H38C40.5 20 42.5 21.5 43.5 23.8L46 30H85C88 30 90 32 90 35V80C90 83 88 85 85 85H15C12 85 10 83 10 80Z" fill="url(#fold-back)"/><path d="M20 32H80V80H20V32Z" fill="#F1F5F9" filter="url(#paper-shadow)"/><path d="M15 36H85V80H15V36Z" fill="#FFFFFF" filter="url(#paper-shadow)"/><path d="M10 80V45C10 42 12 40 15 40H85C88 40 90 42 90 45V80C90 83 88 85 85 85H15C12 85 10 83 10 80Z" fill="url(#fold-front)" filter="url(#fold-shadow)"/><path d="M10 45C10 42 12 40 15 40H85C88 40 90 42 90 45V47C90 44 88 42 85 42H15C12 42 10 44 10 47V45Z" fill="#FFFFFF" opacity="0.6"/></svg>';

    class TileBuilder {
        constructor() {
            this.folder3DIcon = folder3DIcon;
        }

        // FASE 4 FIX: Kruisbesmetting / XSS Beveiliging. 
        // Zorgt ervoor dat bestandsnamen met '<' of '>' niet als code worden uitgevoerd!
        escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        build(item, type, index, currentMode) {
            const tile = document.createElement('div'); 
            
            item.itemType = type; 
            tile.dataset.id = item.id;
            tile.dataset.type = type;
            
            tile.className = 'grid-tile type-' + type + (currentMode === 'trash' ? ' type-trash-item' : ''); 
            
            if (item.isBackTile) {
                tile.classList.add('is-back-tile');
            } else if (window.App && window.App.selectionManager && window.App.selectionManager.selectedItems && window.App.selectionManager.selectedItems.has(String(item.id))) {
                tile.classList.add('selected');
            }

            tile.style.animationDelay = (index * 0.03).toFixed(2) + 's';
            
            let badgeHtml = ''; 
            if (type !== 'folder' && item.extension) { 
                const colorVal = (item.badge_color && item.badge_color !== 'none') ? item.badge_color : ((item.color && item.color !== 'none') ? item.color : '#94a3b8');
                badgeHtml = '<div class="tile-badge" style="background:' + colorVal + '20; color:' + colorVal + '; border: 1px solid ' + colorVal + '40;">' + item.extension.toUpperCase() + '</div>'; 
            }

            let checkboxHtml = '';
            if (!item.isBackTile) {
                checkboxHtml = '<div class="multi-select-checkbox" title="Selecteer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
            }
            
            const visualHtml = this.getVisualHtml(item, type, false);
            const tagsHtml = this.getTagsHtml(item, false);
            const favHtml = this.getFavButtonHtml(item, type, currentMode, false);

            const displayName = this.escapeHTML(item.name || item.original_name); // FASE 4 FIX

            const innerHtml = checkboxHtml + badgeHtml + favHtml +
                '<div class="tile-visual" style="padding: ' + (type === 'folder' && !item.isBackTile ? '0' : '8px') + '; position: relative;">' +
                    visualHtml + tagsHtml +
                '</div>' +
                '<div class="tile-info">' +
                    '<div class="tile-name" title="' + displayName + '">' + displayName + '</div>' +
                    '<div class="tile-meta">' + (item.formatted_size || '') + '</div>' +
                '</div>';
            
            tile.innerHTML = innerHtml;

            if (window.App && window.App.virtualScroll && !item.isBackTile) {
                window.App.virtualScroll.observe(tile);
            }

            this.attach3DEffect(tile);
            
            if (item.isBackTile) {
                tile.style.background = 'rgba(128,128,128,0.03)';
                tile.style.border = '1px dashed var(--border-dropdown)';
                tile.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    if (item.id === 'albums_overview') {
                        if(window.EventBus) window.EventBus.emit('navigation:action', 'albums_overview');
                    } else if (item.id === 'tags_overview') {
                        if(window.EventBus) window.EventBus.emit('navigation:action', 'tags_overview');
                    } else {
                        if (window.App.renderEngine) window.App.renderEngine.loadFolder(item.id);
                    }
                });
            } else {
                if (window.App.renderEngine) {
                    window.App.renderEngine.attachInteractionEvents(tile, item, type);
                }
            }

            return tile;
        }

        attach3DEffect(element) {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect(); 
                const x = e.clientX - rect.left; 
                const y = e.clientY - rect.top;  
                const rotateX = ((y - rect.height/2) / (rect.height/2)) * -15;
                const rotateY = ((x - rect.width/2) / (rect.width/2)) * 15;
                element.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.05, 1.05, 1.05)'; 
                element.style.transition = 'none'; 
            });
            
            element.addEventListener('mouseleave', () => { 
                element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'; 
                element.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'; 
            });
        }

        getFavButtonHtml(item, type, currentMode, isList = false) {
            if (type === 'folder' || item.isBackTile || currentMode === 'trash') return ''; 
            
            const isFav = parseInt(item.is_favorite || 0) === 1;
            const starColor = isFav ? '#f59e0b' : '#ffffff';
            const starFill = isFav ? '#f59e0b' : 'none';
            const activeClass = isFav ? 'active' : '';
            
            if (isList) {
                return '<button class="btn-favorite ' + activeClass + '" data-id="' + item.id + '" data-type="' + type + '" title="Favoriet (Sneltoets: S)" style="background:rgba(0,0,0,0.1); border:none; cursor:pointer; color:' + starColor + '; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; padding:0; transition:all 0.2s; position:relative; z-index:50;"><svg width="14" height="14" viewBox="0 0 24 24" fill="' + starFill + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 21.78 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2.22 9.27 8.91 8.26 12 2"></polygon></svg></button>';
            } else {
                return '<button class="btn-favorite ' + activeClass + '" data-id="' + item.id + '" data-type="' + type + '" title="Favoriet (Sneltoets: S)" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.4); border:none; cursor:pointer; color:' + starColor + '; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:50; transition:all 0.2s; padding:0; backdrop-filter:blur(4px); pointer-events:auto;"><svg width="14" height="14" viewBox="0 0 24 24" fill="' + starFill + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 21.78 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2.22 9.27 8.91 8.26 12 2"></polygon></svg></button>';
            }
        }

        getTagsHtml(item, isList = false) {
            if (item.isBackTile || !item.tags || !Array.isArray(item.tags) || item.tags.length === 0) return '';
            
            if (isList) {
                let html = '<div class="list-tag-dots">';
                item.tags.slice(0, 3).forEach(tag => {
                    html += '<div class="list-tag-dot" style="background-color:' + (tag.color || '#ccc') + ';" title="' + this.escapeHTML(tag.name) + '"></div>';
                });
                html += '</div>';
                return html;
            } else {
                let html = '<div class="tag-dot-container">';
                item.tags.slice(0, 3).forEach(tag => {
                    html += '<div class="tag-dot" style="background-color:' + (tag.color || '#ccc') + ';" title="' + this.escapeHTML(tag.name) + '"></div>';
                });
                if (item.tags.length > 3) {
                    html += '<div style="font-size:10px; color:white; background:rgba(0,0,0,0.6); border-radius:10px; padding:0 4px; line-height:14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">+' + (item.tags.length - 3) + '</div>';
                }
                html += '</div>';
                return html;
            }
        }

        getVisualHtml(item, type, isList = false) {
            if (item.isBackTile) {
                return '<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"><svg width="' + (isList ? '20' : '40') + '" height="' + (isList ? '20' : '40') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-main); margin-right: 4px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>';
            }

            if (type === 'folder') {
                if (item.icon && item.icon !== 'none') {
                    const colorVal = (item.color && item.color !== 'none') ? item.color : '#f59e0b';
                    const size = isList ? '20px' : '60px';
                    return '<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; color:' + colorVal + ';"><div style="width:' + size + '; height:' + size + '; display:flex; align-items:center; justify-content:center;">' + item.icon + '</div></div>';
                }
                return this.folder3DIcon;
            }
            
            const ext = item.extension ? item.extension.toLowerCase() : '';
            const t = new Date(item.updated_at || item.created_at || Date.now()).getTime();

            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic'].includes(ext);
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

            if (isImage || isVideo) {
                const playOverlay = isVideo ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.6); border-radius:50%; width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); pointer-events:none;"><svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" style="margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>' : '';
                const videoLabel = isVideo ? '<span style="position:absolute; bottom: 8px; font-size: 0.7rem; font-weight: bold; color: var(--text-muted);">VIDEO</span>' : '';
                
                return '<div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:' + (isList ? '4px' : '6px') + ';">' +
                       '<div class="thumb-loader-spinner" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:20px; height:20px; border:3px solid rgba(37,99,235,0.2); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite;"></div>' +
                       '<img data-thumb-src="/api/files?action=thumb&id=' + item.id + '&t=' + t + '" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1 1\'%3E%3C/svg%3E" class="strato-lazy-thumb" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.3s ease-in-out;">' +
                       playOverlay +
                       '<div class="thumb-fallback" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; justify-content:center; align-items:center; background:rgba(128,128,128,0.1);">' +
                       '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted);"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>' +
                       videoLabel +
                       '</div></div>';
            } 

            const colorVal = (item.badge_color && item.badge_color !== 'none') ? item.badge_color : ((item.color && item.color !== 'none') ? item.color : 'var(--text-muted)');
            const size = isList ? '20px' : '60px';
            
            let iconContent = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
            
            if (item.icon && item.icon !== 'none') {
                iconContent = '<div style="width:' + size + '; height:' + size + '; display:flex; align-items:center; justify-content:center;">' + item.icon + '</div>';
            }

            return '<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; color: ' + colorVal + ';">' + iconContent + '</div>';
        }
    }

    window.App = window.App || {};
    window.App.tileBuilder = new TileBuilder();
})();