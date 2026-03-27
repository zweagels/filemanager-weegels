/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Views | FILE: public/js/views/ListBuilder.js */

(function() {
    const folder3DIcon = '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fold-back" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#EAB308" /><stop offset="100%" stop-color="#D97706" /></linearGradient><linearGradient id="fold-front" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FDE047" /><stop offset="100%" stop-color="#F59E0B" /></linearGradient><filter id="fold-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="-2" stdDeviation="3" flood-color="#78350F" flood-opacity="0.3"/></filter><filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.2"/></filter></defs><path d="M10 80V25C10 22 12 20 15 20H38C40.5 20 42.5 21.5 43.5 23.8L46 30H85C88 30 90 32 90 35V80C90 83 88 85 85 85H15C12 85 10 83 10 80Z" fill="url(#fold-back)"/><path d="M20 32H80V80H20V32Z" fill="#F1F5F9" filter="url(#paper-shadow)"/><path d="M15 36H85V80H15V36Z" fill="#FFFFFF" filter="url(#paper-shadow)"/><path d="M10 80V45C10 42 12 40 15 40H85C88 40 90 42 90 45V80C90 83 88 85 85 85H15C12 85 10 83 10 80Z" fill="url(#fold-front)" filter="url(#fold-shadow)"/><path d="M10 45C10 42 12 40 15 40H85C88 40 90 42 90 45V47C90 44 88 42 85 42H15C12 42 10 44 10 47V45Z" fill="#FFFFFF" opacity="0.6"/></svg>';

    class ListBuilder {
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

        render(container, data, currentMode) {
            const fragment = document.createDocumentFragment();
            const listWrapper = document.createElement('div'); 
            listWrapper.className = 'view-list';
            
            let hiddenCols = [];
            try { hiddenCols = JSON.parse(localStorage.getItem('fm_hidden_cols')) || []; } catch(e) {}
            if (!Array.isArray(hiddenCols)) hiddenCols = [];

            let colWidths = {};
            try { colWidths = JSON.parse(localStorage.getItem('fm_col_widths')) || {}; } catch(e) {}
            
            const defaultOrder = ['name', 'date', 'modified', 'size', 'type', 'color'];
            let savedOrder = [];
            try { savedOrder = JSON.parse(localStorage.getItem('fm_col_order')) || []; } catch(e) {}
            if (!Array.isArray(savedOrder)) savedOrder = [];
            
            const validCols = defaultOrder.filter(c => savedOrder.includes(c));
            const missingCols = defaultOrder.filter(c => !savedOrder.includes(c));
            const activeOrder = [...validCols, ...missingCols];
            const visibleOrder = activeOrder.filter(c => !hiddenCols.includes(c));

            if (colWidths.name) listWrapper.style.setProperty('--col-name', colWidths.name);
            if (colWidths.date) listWrapper.style.setProperty('--col-date', colWidths.date);
            if (colWidths.modified) listWrapper.style.setProperty('--col-modified', colWidths.modified);
            if (colWidths.size) listWrapper.style.setProperty('--col-size', colWidths.size);
            if (colWidths.type) listWrapper.style.setProperty('--col-type', colWidths.type);
            if (colWidths.color) listWrapper.style.setProperty('--col-color', colWidths.color);

            let template = ['var(--col-check, 40px)', 'var(--col-icon, 50px)']; 
            
            visibleOrder.forEach(c => {
                if (c === 'name') template.push('var(--col-name, 2.5fr)');
                if (c === 'date') template.push('var(--col-date, 1fr)');
                if (c === 'modified') template.push('var(--col-modified, 1fr)');
                if (c === 'size') template.push('var(--col-size, 1fr)');
                if (c === 'type') template.push('var(--col-type, 1fr)');
                if (c === 'color') template.push('var(--col-color, 60px)');
            });
            
            template.push('60px'); 
            const gridStyle = 'grid-template-columns: ' + template.join(' ') + ';';

            let headerHtml = '<div class="list-header" style="' + gridStyle + '">';
            headerHtml += '<div class="list-cell check-cell" style="padding:0;"></div>';
            headerHtml += '<div class="list-cell icon-cell" style="padding:0;"></div>';
            
            visibleOrder.forEach(c => {
                if (c === 'name') headerHtml += '<div class="list-cell">Naam <div class="col-resizer" data-col="name"></div></div>';
                if (c === 'date') headerHtml += '<div class="list-cell">Aangemaakt <div class="col-resizer" data-col="date"></div></div>';
                if (c === 'modified') headerHtml += '<div class="list-cell">Gewijzigd <div class="col-resizer" data-col="modified"></div></div>';
                if (c === 'size') headerHtml += '<div class="list-cell">Grootte <div class="col-resizer" data-col="size"></div></div>';
                if (c === 'type') headerHtml += '<div class="list-cell">Type <div class="col-resizer" data-col="type"></div></div>';
                if (c === 'color') headerHtml += '<div class="list-cell">Kleur <div class="col-resizer" data-col="color"></div></div>';
            });
            headerHtml += '<div class="list-cell" style="padding:0;"></div></div>';
            
            listWrapper.innerHTML = headerHtml;

            const buildRow = (item) => {
                const row = document.createElement('div'); 
                row.dataset.id = item.id;
                row.dataset.type = item.itemType;
                
                row.className = 'list-row type-' + item.itemType + (currentMode === 'trash' ? ' type-trash-item' : ''); 
                
                if (item.isBackTile) {
                    row.classList.add('is-back-tile');
                } else if (window.App && window.App.selectionManager && window.App.selectionManager.selectedItems && window.App.selectionManager.selectedItems.has(String(item.id))) {
                    row.classList.add('selected');
                }

                row.style.cssText = gridStyle;

                let checkboxHtml = '<div class="list-cell check-cell" style="padding:0;">';
                if (!item.isBackTile) {
                    checkboxHtml += '<div class="multi-select-checkbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
                }
                checkboxHtml += '</div>';
                
                const visualHtml = this.getVisualHtml(item, item.itemType, true);
                
                let rowHtml = checkboxHtml + '<div class="list-cell icon-cell" style="padding: 0; display:flex; justify-content:center; align-items:center;"><div style="width:36px; height:36px; display:flex; justify-content:center; align-items:center;">' + visualHtml + '</div></div>';
                
                visibleOrder.forEach(c => {
                    if (c === 'name') {
                        const tagsHtml = this.getTagsHtml(item, true);
                        const displayName = this.escapeHTML(item.name || item.original_name); // FASE 4 FIX
                        rowHtml += '<div class="list-cell name-cell" style="' + (item.isBackTile ? 'font-weight:bold; color:var(--primary); cursor:pointer;' : '') + '" title="' + displayName + '">' + displayName + tagsHtml + '</div>';
                    }
                    if (c === 'date') rowHtml += '<div class="list-cell meta-cell">' + (item.isBackTile ? '--' : new Date(item.created_at).toLocaleDateString()) + '</div>';
                    if (c === 'modified') rowHtml += '<div class="list-cell meta-cell">' + (item.isBackTile ? '--' : new Date(item.updated_at || item.created_at).toLocaleDateString()) + '</div>';
                    if (c === 'size') rowHtml += '<div class="list-cell meta-cell">' + (item.formatted_size || '--') + '</div>';
                    
                    if (c === 'type') {
                        let typeHtml = '--';
                        if (!item.isBackTile && item.itemType !== 'folder' && item.itemType !== 'album') {
                            const colorVal = (item.badge_color && item.badge_color !== 'none') ? item.badge_color : ((item.color && item.color !== 'none') ? item.color : '#94a3b8');
                            typeHtml = '<span class="badge" style="background:' + colorVal + '20; color:' + colorVal + '; border: 1px solid ' + colorVal + '40;">' + (item.extension || 'FILE').toUpperCase() + '</span>';
                        } else if (item.itemType === 'folder' && !item.isBackTile) {
                            typeHtml = '<span class="badge" style="background:rgba(245,158,11,0.1); color:#f59e0b; border: 1px solid rgba(245,158,11,0.2);">MAP</span>';
                        } else if (item.itemType === 'album' && !item.isBackTile) {
                            typeHtml = '<span class="badge" style="background:rgba(236,72,153,0.1); color:#ec4899; border: 1px solid rgba(236,72,153,0.2);">ALBUM</span>';
                        }
                        rowHtml += '<div class="list-cell meta-cell">' + typeHtml + '</div>';
                    }

                    if (c === 'color') {
                        const colorVal = (item.color && item.color !== 'none') ? item.color : 'transparent';
                        rowHtml += '<div class="list-cell">' + (item.isBackTile ? '' : '<span class="color-cell-indicator" style="background-color: ' + colorVal + '; ' + (colorVal === 'transparent' ? 'border:none;' : '') + '"></span>') + '</div>';
                    }
                });
                
                let favHtml = '<div class="list-cell" style="padding:0; justify-content: flex-end; padding-right: 16px;">';
                if (!item.isBackTile) {
                    favHtml += this.getFavButtonHtml(item, item.itemType, currentMode, true);
                }
                favHtml += '</div>';
                
                rowHtml += favHtml;

                row.innerHTML = rowHtml;

                if (window.App && window.App.virtualScroll && !item.isBackTile) {
                    window.App.virtualScroll.observe(row);
                }
                
                if (item.isBackTile) {
                    row.style.background = 'rgba(128,128,128,0.02)';
                    row.addEventListener('click', (e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        if (item.id === 'albums_overview') {
                            if(window.EventBus) window.EventBus.emit('navigation:action', 'albums_overview');
                        } else if (item.id === 'tags_overview') {
                            if(window.EventBus) window.EventBus.emit('navigation:action', 'tags_overview');
                        } else {
                            if(window.App.renderEngine) window.App.renderEngine.loadFolder(item.id); 
                        }
                    });
                } else {
                    if (window.App.renderEngine) {
                        window.App.renderEngine.attachInteractionEvents(row, item, item.itemType);
                    }
                }
                
                return row;
            };

            if (data.groupedFiles && Object.keys(data.groupedFiles).length > 0) {
                if (data.folders && data.folders.length > 0) {
                    const groupHeader = document.createElement('div');
                    groupHeader.style.cssText = 'grid-column: 1 / -1; padding: 12px 20px 8px 20px; font-weight: 700; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.02);';
                    groupHeader.textContent = 'Mappen';
                    listWrapper.appendChild(groupHeader);
                    
                    data.folders.forEach(f => listWrapper.appendChild(buildRow({ ...f, itemType: 'folder' })));
                }

                for (const [groupName, files] of Object.entries(data.groupedFiles)) {
                    if (files.length === 0) continue;
                    
                    const groupHeader = document.createElement('div');
                    groupHeader.style.cssText = 'grid-column: 1 / -1; padding: 16px 20px 8px 20px; font-weight: 700; font-size: 0.85rem; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); margin-top: 4px;';
                    // textContent is veilig, dus geen escapeHTML nodig hier
                    groupHeader.textContent = groupName;
                    listWrapper.appendChild(groupHeader);
                    
                    files.forEach(f => listWrapper.appendChild(buildRow({ ...f, itemType: 'file' })));
                }
            } else {
                const items = [
                    ...(data.folders || []).map(f => ({...f, itemType: 'folder'})), 
                    ...(data.files || []).map(f => ({...f, itemType: 'file'}))
                ];
                items.forEach((item) => {
                    listWrapper.appendChild(buildRow(item));
                });
            }

            fragment.appendChild(listWrapper);
            container.appendChild(fragment);

            this.initColumnResizers(listWrapper);
            this.initColumnContextMenu(listWrapper);
        }

        initColumnResizers(listWrapper) {
            const resizers = listWrapper.querySelectorAll('.col-resizer');
            let startX, startWidth, colName, activeResizer;
            
            const onMouseMove = (e) => {
                const diff = e.clientX - startX;
                const newWidth = Math.max(60, startWidth + diff);
                listWrapper.style.setProperty(`--col-${colName}`, `${newWidth}px`);
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = 'default';
                if(activeResizer) activeResizer.classList.remove('resizing');
                
                let colWidths = {};
                try { colWidths = JSON.parse(localStorage.getItem('fm_col_widths')) || {}; } catch(e) {}
                colWidths[colName] = listWrapper.style.getPropertyValue(`--col-${colName}`);
                localStorage.setItem('fm_col_widths', JSON.stringify(colWidths));
            };

            resizers.forEach(resizer => {
                resizer.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startX = e.clientX;
                    colName = resizer.dataset.col;
                    activeResizer = resizer;
                    activeResizer.classList.add('resizing');
                    startWidth = resizer.parentElement.offsetWidth;
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                    document.body.style.cursor = 'col-resize';
                });
            });
        }

        initColumnContextMenu(listWrapper) {
            let menu = document.getElementById('column-context-menu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'column-context-menu';
                menu.className = 'column-context-menu';
                document.body.appendChild(menu);
            }
            
            const header = listWrapper.querySelector('.list-header');
            if(header) {
                header.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); 
                    this.showColumnContextMenu(e.pageX, e.pageY);
                });
            }
            
            document.addEventListener('click', (e) => {
                if (menu && menu.classList.contains('visible') && !menu.contains(e.target)) {
                    menu.classList.remove('visible');
                }
            });
        }

        showColumnContextMenu(x, y) {
            const menu = document.getElementById('column-context-menu');
            
            let hiddenCols = [];
            try { hiddenCols = JSON.parse(localStorage.getItem('fm_hidden_cols')) || []; } catch(e) {}
            if (!Array.isArray(hiddenCols)) hiddenCols = [];

            let savedOrder = [];
            try { savedOrder = JSON.parse(localStorage.getItem('fm_col_order')) || []; } catch(e) {}
            if (!Array.isArray(savedOrder)) savedOrder = [];
            
            const defaultOrder = ['name', 'date', 'modified', 'size', 'type', 'color'];
            const validCols = defaultOrder.filter(c => savedOrder.includes(c));
            const missingCols = defaultOrder.filter(c => !savedOrder.includes(c));
            const activeOrder = [...validCols, ...missingCols];

            const labels = {
                'name': 'Naam', 'date': 'Aangemaakt', 'modified': 'Gewijzigd',
                'size': 'Grootte', 'type': 'Type', 'color': 'Kleur'
            };
            
            let html = '<div class="column-menu-title" style="margin-bottom: 8px;">Kolommen Aanpassen</div>';
            
            activeOrder.forEach((col, index) => {
                const isChecked = !hiddenCols.includes(col);
                html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; padding:2px 8px;">' +
                        '<label class="column-toggle-label" style="margin:0; padding:0; display:flex; gap:8px; cursor:pointer;">' +
                        '<input type="checkbox" value="' + col + '" ' + (isChecked ? 'checked' : '') + '>' + labels[col] + '</label>' +
                        '<div style="display:flex; gap:4px; margin-left:15px;">' +
                        '<button class="btn-order-up btn-icon-tiny" data-index="' + index + '" style="padding:0; width:20px; height:20px; background:rgba(0,0,0,0.05); border-radius:4px; border:none; cursor:pointer;">▲</button>' +
                        '<button class="btn-order-down btn-icon-tiny" data-index="' + index + '" style="padding:0; width:20px; height:20px; background:rgba(0,0,0,0.05); border-radius:4px; border:none; cursor:pointer;">▼</button>' +
                        '</div></div>';
            });

            menu.innerHTML = html;
            
            const menuWidth = 240;
            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
            
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.classList.add('visible');
            
            menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    let cols = [];
                    try { cols = JSON.parse(localStorage.getItem('fm_hidden_cols')) || []; } catch(e) {}
                    if (!Array.isArray(cols)) cols = [];

                    if (e.target.checked) {
                        cols = cols.filter(c => c !== e.target.value);
                    } else {
                        if (cols.length >= 5) {
                            e.target.checked = true; 
                            if (window.ModalService) window.ModalService.alert('Fout', 'Er moet minimaal 1 kolom zichtbaar blijven.');
                            return;
                        }
                        if (!cols.includes(e.target.value)) cols.push(e.target.value);
                    }
                    localStorage.setItem('fm_hidden_cols', JSON.stringify(cols));
                    if(window.App.renderEngine) window.App.renderEngine.render(); 
                });
            });

            menu.querySelectorAll('.btn-order-up').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(e.target.dataset.index);
                    if (idx > 0) {
                        const temp = activeOrder[idx];
                        activeOrder[idx] = activeOrder[idx - 1];
                        activeOrder[idx - 1] = temp;
                        localStorage.setItem('fm_col_order', JSON.stringify(activeOrder));
                        if(window.App.renderEngine) window.App.renderEngine.render();
                        this.showColumnContextMenu(x, y);
                    }
                });
            });

            menu.querySelectorAll('.btn-order-down').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(e.target.dataset.index);
                    if (idx < activeOrder.length - 1) {
                        const temp = activeOrder[idx];
                        activeOrder[idx] = activeOrder[idx + 1];
                        activeOrder[idx + 1] = temp;
                        localStorage.setItem('fm_col_order', JSON.stringify(activeOrder));
                        if(window.App.renderEngine) window.App.renderEngine.render();
                        this.showColumnContextMenu(x, y);
                    }
                });
            });
        }

        getFavButtonHtml(item, type, currentMode, isList = true) {
            if (type === 'folder' || item.isBackTile || currentMode === 'trash') return ''; 
            
            const isFav = parseInt(item.is_favorite || 0) === 1;
            const starColor = isFav ? '#f59e0b' : '#cbd5e1';
            const starFill = isFav ? '#f59e0b' : 'none';
            const activeClass = isFav ? 'active' : '';
            
            return '<button class="btn-favorite ' + activeClass + '" data-id="' + item.id + '" data-type="' + type + '" title="Favoriet (Sneltoets: S)" style="background:rgba(0,0,0,0.1); border:none; cursor:pointer; color:' + starColor + '; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; padding:0; transition:all 0.2s; position:relative; z-index:50;"><svg width="14" height="14" viewBox="0 0 24 24" fill="' + starFill + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 21.78 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2.22 9.27 8.91 8.26 12 2"></polygon></svg></button>';
        }

        getTagsHtml(item, isList = true) {
            if (item.isBackTile || !item.tags || !Array.isArray(item.tags) || item.tags.length === 0) return '';
            
            let html = '<div class="list-tag-dots">';
            item.tags.slice(0, 3).forEach(tag => {
                html += '<div class="list-tag-dot" style="background-color:' + (tag.color || '#ccc') + ';" title="' + this.escapeHTML(tag.name) + '"></div>';
            });
            html += '</div>';
            return html;
        }

        getVisualHtml(item, type, isList = true) {
            if (item.isBackTile) {
                return '<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-main); margin-right: 4px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>';
            }

            if (type === 'folder') return this.folder3DIcon;

            if (type === 'album') {
                return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
            }
            
            const ext = item.extension ? item.extension.toLowerCase() : '';
            const t = new Date(item.updated_at || item.created_at || Date.now()).getTime();

            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic'].includes(ext);
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

            if (isImage || isVideo) {
                const playOverlay = isVideo ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.6); border-radius:50%; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center; pointer-events:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" style="margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>' : '';

                return '<div style="width:100%; height:100%; position:relative; overflow:hidden; border-radius:4px;">' +
                       '<div class="thumb-loader-spinner" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:14px; height:14px; border:2px solid rgba(37,99,235,0.2); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite;"></div>' +
                       '<img data-thumb-src="/api/files?action=thumb&id=' + item.id + '&t=' + t + '" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1 1\'%3E%3C/svg%3E" class="strato-lazy-thumb" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.3s ease-in-out;">' +
                       playOverlay +
                       '<div class="thumb-fallback" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; justify-content:center; align-items:center; background:rgba(128,128,128,0.1);">' +
                       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted);"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>' +
                       '</div></div>';
            } 
            
            const colorVal = (item.badge_color && item.badge_color !== 'none') ? item.badge_color : ((item.color && item.color !== 'none') ? item.color : 'var(--text-muted)');
            
            let iconContent = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
            
            if (item.icon && item.icon !== 'none') {
                iconContent = '<div style="width:20px; height:20px; display:flex; align-items:center; justify-content:center;">' + item.icon + '</div>';
            }

            return '<div style="width:28px; height:28px; display:flex; justify-content:center; align-items:center; color: ' + colorVal + '; background:' + colorVal + '15; border-radius:4px; border:1px solid ' + colorVal + '30;">' + iconContent + '</div>';
        }
    }

    window.App = window.App || {};
    window.App.listBuilder = new ListBuilder();
})();