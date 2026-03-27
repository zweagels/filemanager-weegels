// Pad: public/js/modules/slideshow/EditorUI.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorUI.js */

(function() {
    if (!window.EditorCore) return;

    Object.assign(window.EditorCore.prototype, {
        
        injectFase3Styles() {
            if (document.getElementById('ss-fase3-ui-styles')) return;
            const style = document.createElement('style');
            style.id = 'ss-fase3-ui-styles';
            style.innerHTML = `
                .ss-chapter-group { margin-bottom: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; border: 1px solid rgba(128,128,128,0.15); overflow: hidden; }
                .theme-dark .ss-chapter-group { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); }
                
                .ss-chapter-header { padding: 10px 16px; background: rgba(0,0,0,0.03); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.85rem; user-select: none; border-left: 4px solid transparent; transition: 0.2s; }
                .theme-dark .ss-chapter-header { background: rgba(255,255,255,0.05); }
                .ss-chapter-header:hover { background: rgba(0,0,0,0.06); }
                .theme-dark .ss-chapter-header:hover { background: rgba(255,255,255,0.08); }
                
                .ss-chapter-content { display: grid; gap: 12px; padding: 12px; transition: max-height 0.3s ease-in-out; }
                .view-list .ss-chapter-content { grid-template-columns: 1fr; }
                .view-grid .ss-chapter-content { grid-template-columns: repeat(2, 1fr); }
                .view-compact .ss-chapter-content { grid-template-columns: repeat(3, 1fr); }
                
                .ss-chapter-group.closed .ss-chapter-content { display: none !important; }
                .ss-chapter-group.closed .ss-chevron { transform: rotate(-90deg); }
                .ss-chevron { transition: 0.3s; opacity: 0.5; }

                .ss-3dot-btn { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); color: white; border-radius: 4px; padding: 4px; z-index: 15; opacity: 0; transition: 0.2s; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .ss-slide-item:hover .ss-3dot-btn { opacity: 1; }
                .ss-3dot-btn.active { opacity: 1; background: var(--primary); }

                .ss-fixed-ctx-menu { position: fixed; width: 180px; border-radius: 8px; padding: 4px; z-index: 2147483647; display: flex; flex-direction: column; gap: 2px; font-family: 'Inter', sans-serif; }
                .ss-fixed-ctx-menu-btn { background: transparent; border: none; padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; white-space: nowrap; font-family: inherit; }
                
                .ss-fixed-ctx-menu.theme-light { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .ss-fixed-ctx-menu.theme-light .ss-fixed-ctx-menu-btn { color: #334155; }
                .ss-fixed-ctx-menu.theme-light .ss-fixed-ctx-menu-btn:hover { background: #eff6ff; color: #2563eb; }
                .ss-fixed-ctx-menu.theme-light .ss-fixed-ctx-menu-btn.danger:hover { background: #fef2f2; color: #ef4444; }
                .ss-fixed-ctx-menu.theme-light .ss-ctx-divider { background: #e2e8f0; }

                .ss-fixed-ctx-menu.theme-dark { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                .ss-fixed-ctx-menu.theme-dark .ss-fixed-ctx-menu-btn { color: #f8fafc; }
                .ss-fixed-ctx-menu.theme-dark .ss-fixed-ctx-menu-btn:hover { background: rgba(37,99,235,0.2); color: #60a5fa; }
                .ss-fixed-ctx-menu.theme-dark .ss-fixed-ctx-menu-btn.danger:hover { background: rgba(239,68,68,0.2); color: #f87171; }
                .ss-fixed-ctx-menu.theme-dark .ss-ctx-divider { background: rgba(255,255,255,0.1); }
                
                .ss-video-indicator { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px; z-index: 4; backdrop-filter: blur(4px); pointer-events: none; border: 1px solid rgba(255,255,255,0.1); }
                
                .ss-skeleton-img { background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%); background-size: 200% 100%; animation: skeletonPulse 1.5s infinite; border-radius: 10px; }
                @keyframes skeletonPulse { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
                .ss-skeleton-loader { display: flex; flex-direction: column; gap: 12px; width: 100%; height: 100%; padding: 20px; box-sizing: border-box; }
                .ss-skeleton-row { height: 20px; background: rgba(128,128,128,0.1); border-radius: 4px; animation: skeletonPulse 1.5s infinite; }
                
                .ss-smart-scroll-btn { position: absolute; bottom: 20px; right: 20px; background: var(--primary); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 50; transition: transform 0.3s ease, opacity 0.2s; border: none; opacity: 0; pointer-events: none; }
                .ss-smart-scroll-btn.visible { opacity: 0.5; pointer-events: all; }
                .ss-smart-scroll-btn.visible:hover { opacity: 1; transform: scale(1.1); }
                .ss-smart-scroll-btn.up svg { transform: rotate(180deg); }
                .ss-smart-scroll-btn svg { transition: transform 0.3s ease; }
                
                .ss-stat-badge { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; z-index: 10; display: flex; align-items: center; gap: 4px; pointer-events: none; border: 1px solid rgba(255,255,255,0.1); }
                
                .ss-slide-item { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .ss-slide-item.active .ss-slide-thumb { box-shadow: 0 0 0 2px var(--bg-main, #fff), 0 0 12px 2px var(--primary) !important; border-color: var(--primary) !important; transform: translateY(-2px); z-index: 5; position: relative; }

                .ss-slide-item.linked-top .ss-slide-thumb { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: 2px dashed rgba(255,255,255,0.3) !important; }
                .ss-slide-item.linked-bottom { margin-top: -8px; }
                .ss-slide-item.linked-bottom .ss-slide-thumb { border-top-left-radius: 0; border-top-right-radius: 0; border-top: none !important; }

                .ss-canvas-radio { position: absolute; z-index: 50; background: rgba(255,255,255,0.95); color: #111; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; backdrop-filter: blur(8px); }
                .ss-canvas-radio svg { color: var(--primary, #2563eb); }
                
                .ss-anim-layer { display: flex; align-items: center; justify-content: center; overflow: hidden; width: 100%; height: 100%; }
                .ss-bg-layer { position: absolute; inset: 0; transition: background 0.8s ease-in-out; overflow: hidden; z-index: 1; }

                #ss-preview-box { aspect-ratio: 16/9; width: 100%; max-height: 100%; position: relative; overflow: hidden; background: #000; margin: auto; display: flex; box-shadow: var(--ss-box-shadow); border-radius: var(--ss-box-radius); }
                
                .ss-preview-play-btn { position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.8); background:rgba(37,99,235,0.8); color:#fff; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:all 0.3s ease; z-index:100; box-shadow:0 10px 30px rgba(0,0,0,0.5); backdrop-filter:blur(8px); pointer-events: none; }
                #ss-preview-box:hover .ss-preview-play-btn { opacity:1; transform:translate(-50%, -50%) scale(1); pointer-events: all; }
                .ss-preview-play-btn:hover { background:rgba(37,99,235,1); transform:translate(-50%, -50%) scale(1.1) !important; }
            `;
            document.head.appendChild(style);
        },

        injectDynamicKeyframes() {
            if (document.getElementById('ss-dynamic-keyframes')) return;
            const style = document.createElement('style');
            style.id = 'ss-dynamic-keyframes';
            let css = '';
            if (this.data && this.data.dictionaries && this.data.dictionaries.backgrounds) {
                this.data.dictionaries.backgrounds.forEach(bg => {
                    if (bg.css_animation_keyframes && bg.css_animation_keyframes !== 'none') {
                        css += bg.css_animation_keyframes + '\n';
                    }
                });
            }
            css += `
                @keyframes ssBgCinematicPulse {
                    0% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1.35); opacity: 1; }
                }
            `;
            style.innerHTML = css;
            document.head.appendChild(style);
        },

        getItemUrl(item) {
            if (!item) return '';
            
            if (item.file_url && item.file_url !== 'undefined' && item.file_url !== 'null') {
                return item.file_url;
            }
            
            if (item.file_id && item.file_id !== 'undefined' && item.file_id !== 'null') {
                return '/api/files?action=download&id=' + item.file_id;
            }
            
            return item.url_large || item.url || item.path || '';
        },

        buildWatermarkHTML(globalSettings, itemSettings = null) {
            if (itemSettings && itemSettings.override_watermark === 0) return '';
            
            const s = globalSettings;
            const rawText = s.settings?.watermark_text || '';
            const text = String(rawText);
            const logoId = s.settings?.watermark_image_id; 
            
            if (!text && !logoId) return '';

            const sets = s.settings || {};
            const opacity = (sets.watermark_opacity !== undefined ? sets.watermark_opacity : 100) / 100;
            const font = sets.watermark_font || 'Inter';
            
            const sizeMap = { 'small': '32px', 'normal': '48px', 'large': '72px', 'xlarge': '100px' };
            const fontSize = sizeMap[sets.watermark_size] || '48px';
            const color = sets.watermark_color || '#ffffff';
            const bg = sets.watermark_bg || 'transparent';
            const shadow = sets.watermark_shadow == 1 ? '0 8px 24px rgba(0,0,0,0.5)' : 'none';
            const textShadow = (bg === 'transparent' && sets.watermark_shadow == 1) ? '0 4px 12px rgba(0,0,0,0.8)' : 'none';

            let contentHtml = '';
            if (logoId) {
                contentHtml = `<img src="/api/files?action=download&id=${logoId}" style="max-height: 150px; width: auto; display: block;" onerror="this.style.display='none'">`;
            } else {
                // FIX: {titel} correct vervangen door de opgeslagen titel
                const titleStr = s.title || (this.data && this.data.slideshow ? this.data.slideshow.title : '');
                contentHtml = text.replace(/{datum}/gi, new Date().toLocaleDateString('nl-NL'))
                                  .replace(/{tijd}/gi, new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}))
                                  .replace(/{titel}/gi, titleStr);
            }

            const wmX = sets.watermark_x !== undefined ? sets.watermark_x : 80;
            const wmY = sets.watermark_y !== undefined ? sets.watermark_y : 85;

            const style = `position: absolute; left: ${wmX}%; top: ${wmY}%; transform: translate(-50%, -50%); opacity: ${opacity}; font-family: '${font}', sans-serif; font-size: ${fontSize}; color: ${color}; background: ${bg}; box-shadow: ${bg !== 'transparent' ? shadow : 'none'}; text-shadow: ${textShadow}; padding: ${bg !== 'transparent' ? '16px 32px' : '0'}; border-radius: 16px; z-index: 50; pointer-events: none; word-wrap: break-word; overflow-wrap: break-word; max-width: 80%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; white-space: nowrap;`;
            return `<div class="ss-canvas-watermark" style="${style}">${contentHtml}</div>`;
        },

        buildClockHTML(globalSettings, itemSettings = null) {
            const s = globalSettings;
            const clockId = (itemSettings && itemSettings.override_clock_id !== null && itemSettings.override_clock_id !== undefined) ? itemSettings.override_clock_id : s.clock_id;
                            
            if (!clockId || clockId == 0) {
                if (this.isReadOnly) return '';
                return `<div class="ss-canvas-clock placeholder" style="position:absolute; left:95%; top:5%; width:150px; height:150px; border:6px dashed rgba(255,255,255,0.2); border-radius:24px; display:flex; align-items:center; justify-content:center; transform: translate(-100%, 0%); z-index:50;" title="Geen klok geselecteerd"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>`;
            }
            
            const clockObj = this.data.dictionaries.clocks.find(c => c.id == clockId);
            if (!clockObj) return '';

            const sets = s.settings || {};
            const clkX = sets.clock_x !== undefined ? sets.clock_x : 5;
            const clkY = sets.clock_y !== undefined ? sets.clock_y : 5;
            const scale = sets.clock_scale !== undefined ? sets.clock_scale : 1.0;
            
            const rawOpacity = sets.clock_bg_opacity !== undefined ? sets.clock_bg_opacity : 60;
            const bgOpacity = parseFloat(rawOpacity) / 100;

            const outerStyle = `position: absolute; left: ${clkX}%; top: ${clkY}%; transform: translate(-50%, -50%) scale(${scale}); transform-origin: center center; z-index: 50; pointer-events: none; display: flex; align-items: center; justify-content: center;`;

            let isAnalog = clockObj.type === 'analog' || (clockObj.svg_code && clockObj.svg_code.includes('<svg'));
            let content = isAnalog ? clockObj.svg_code : new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'});
            const clockStyle = clockObj.css_code ? clockObj.css_code.replace(/"/g, "'") : '';
            
            const borderThickness = sets.clock_border_size !== undefined ? parseFloat(sets.clock_border_size) : 0; 
            const borderColor = sets.clock_border_color || '#ffffff';
            
            let bgCss = `background: rgba(0,0,0,${bgOpacity});`;
            let borderCss = borderThickness > 0 ? `border: ${borderThickness}px solid ${borderColor};` : `border: none;`;
            let paddingCss = isAnalog ? 'padding: 16px;' : 'padding: 24px 48px;';
            let radiusCss = isAnalog ? 'border-radius: 50%;' : 'border-radius: 24px;';
            let shadowCss = bgOpacity > 0 ? 'box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(16px);' : 'box-shadow: none; backdrop-filter: none;';
            let textShadowCss = 'text-shadow: 0 4px 16px rgba(0,0,0,0.9); color: #fff;';
            
            if (bgOpacity === 0) {
                bgCss = 'background: transparent !important;';
                shadowCss = 'box-shadow: none !important; backdrop-filter: none !important;';
                
                if (isAnalog) {
                    borderCss = borderThickness > 0 ? `border: ${borderThickness}px solid ${borderColor} !important;` : 'border: none !important;'; 
                } else {
                    borderCss = borderThickness > 0 ? `border: ${borderThickness}px solid transparent !important;` : 'border: none !important;'; 
                    if (borderThickness > 0) {
                        textShadowCss = `-webkit-text-stroke: ${borderThickness}px ${borderColor}; text-shadow: 0 0 10px ${borderColor}, 0 0 20px ${borderColor}; color: #ffffff;`;
                    }
                }
            }

            const innerStyle = `display:flex; align-items:center; justify-content:center; white-space:nowrap; box-sizing:border-box; font-family: 'Space Mono', 'Courier New', monospace; font-weight: 700; font-size: 64px; letter-spacing: 2px; ${radiusCss} ${paddingCss} ${bgCss} ${borderCss} ${shadowCss} ${textShadowCss} ${clockStyle}`;
            return `<div class="ss-canvas-clock" style="${outerStyle}"><div style="${innerStyle}">${content}</div></div>`;
        },

        getCropStyles(item, isKenBurns = false) {
            let filterStr = '';
            
            const b = item.filter_brightness ?? 100;
            const c = item.filter_contrast ?? 100;
            const s = item.filter_saturate ?? 100;
            const rotate = item.transform_rotate ?? 0;
            const flipX = item.transform_flip_x ?? 1;
            const flipY = item.transform_flip_y ?? 1;

            filterStr += `brightness(${b}%) contrast(${c}%) saturate(${s}%) `;

            if (item.image_filter && item.image_filter !== 'none') {
                const f = item.image_filter;
                if (f === 'grayscale') filterStr += 'grayscale(100%) ';
                else if (f === 'sepia') filterStr += 'sepia(100%) ';
                else if (f === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                else filterStr += `${f} `;
            } else if (item.settings && item.settings.filter) {
                const sf = item.settings.filter;
                if (sf === 'grayscale') filterStr += 'grayscale(100%) ';
                else if (sf === 'sepia') filterStr += 'sepia(100%) ';
                else if (sf === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
            }
            filterStr = filterStr.trim();

            let crop_x = item.crop_x !== null && item.crop_x !== undefined ? parseFloat(item.crop_x) : 0;
            let crop_y = item.crop_y !== null && item.crop_y !== undefined ? parseFloat(item.crop_y) : 0;
            let crop_w = item.crop_w !== null && item.crop_w !== undefined ? parseFloat(item.crop_w) : 100;
            let crop_h = item.crop_h !== null && item.crop_h !== undefined ? parseFloat(item.crop_h) : 100;

            let transformStr = '';
            if (isKenBurns && isKenBurns !== 'none' && isKenBurns !== '') {
                if (isKenBurns === 'fast') transformStr += 'scale(1.2) ';
                else if (isKenBurns === 'slow') transformStr += 'scale(1.05) ';
                else transformStr += 'scale(1.1) '; 
            } else if (isKenBurns === true) {
                transformStr += 'scale(1.1) ';
            }

            if (rotate || flipX !== 1 || flipY !== 1) {
                transformStr += `rotate(${rotate}deg) scaleX(${flipX}) scaleY(${flipY})`;
            }
            transformStr = transformStr.trim() || 'none';

            return { filterStr, transformStr, top: crop_y, left: crop_x, crop_w, crop_h };
        },

        toggleTheme() {
            this.isDarkTheme = !this.isDarkTheme;
            const modal = document.getElementById('ss-editor-modal');
            const toggleBtn = document.getElementById('ss-theme-toggle');
            
            if (this.isDarkTheme) {
                modal.classList.replace('theme-light', 'theme-dark');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
                toggleBtn.style.color = '#facc15'; 
            } else {
                modal.classList.replace('theme-dark', 'theme-light');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
                toggleBtn.style.color = '#64748b'; 
            }
            
            if (this.data) {
                this.data.slideshow.theme_mode = this.isDarkTheme ? 'dark' : 'light';
                if (this.triggerAutoSave) this.triggerAutoSave();
            }
            this.renderSidebar(); 
        },

        render() {
            if (!this.data) return;

            this.injectFase3Styles();
            this.injectDynamicKeyframes();

            document.getElementById('ss-title-input').value = this.data.slideshow.title;
            document.getElementById('ss-title-input').disabled = this.isReadOnly;
            
            const lockBanner = document.getElementById('ss-lock-banner');
            if (this.isReadOnly) {
                lockBanner.classList.add('visible');
                const saveStatus = document.getElementById('ss-save-status');
                if (saveStatus) saveStatus.innerHTML = '<span style="color:var(--error);">Alleen-Lezen</span>';
            } else {
                lockBanner.classList.remove('visible');
            }

            const modal = document.getElementById('ss-editor-modal');
            const toggleBtn = document.getElementById('ss-theme-toggle');
            if (this.isDarkTheme) {
                modal.classList.replace('theme-light', 'theme-dark');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
                toggleBtn.style.color = '#facc15';
            } else {
                modal.classList.replace('theme-dark', 'theme-light');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
                toggleBtn.style.color = '#64748b';
            }

            let usedTransIds = [];
            if (this.data.items) {
                usedTransIds = [...new Set(this.data.items.filter(i => i.transition_id).map(i => parseInt(i.transition_id)))];
            }
            let transFilterOpts = '';
            if (this.data && this.data.dictionaries && this.data.dictionaries.transitions) {
                this.data.dictionaries.transitions.forEach(t => {
                    if (usedTransIds.includes(parseInt(t.id))) {
                        transFilterOpts += `<option value="trans_${t.id}">Effect: ${t.name}</option>`;
                    }
                });
            }

            const workspace = document.getElementById('ss-editor-workspace');
            workspace.innerHTML = `
                <div class="ss-sidebar ss-panel size-${this.sidebarSize}" id="ss-sidebar-container" style="position:relative;">
                    <div class="ss-sidebar-header">
                        <button id="btn-add-slides" class="ss-btn-primary" style="width:100%;" ${this.isReadOnly ? 'disabled' : ''}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Media Toevoegen
                        </button>
                        <div class="ss-sidebar-toolbar">
                            <select id="ss-filter-select" class="ss-filter-select">
                                <option value="all">Alle Dias</option>
                                <option value="active">Alleen Actief</option>
                                <option value="inactive">Alleen Inactief</option>
                                <option value="image">Alleen Fotos</option>
                                <option value="video">Alleen Videos</option>
                                ${transFilterOpts ? `<optgroup label="Gefilterd op Effect">${transFilterOpts}</optgroup>` : ''}
                            </select>
                            <div class="ss-size-toggle">
                                <button class="ss-size-btn ${this.sidebarSize === 'list' ? 'active' : ''}" data-size="list" title="Lijst"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="6"></rect><rect x="3" y="11" width="18" height="6"></rect><rect x="3" y="19" width="18" height="6"></rect></svg></button>
                                <button class="ss-size-btn ${this.sidebarSize === 'grid' ? 'active' : ''}" data-size="grid" title="Grid"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                                <button class="ss-size-btn ${this.sidebarSize === 'compact' ? 'active' : ''}" data-size="compact" title="Compact"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="4" height="4"></rect><rect x="10" y="3" width="4" height="4"></rect><rect x="17" y="3" width="4" height="4"></rect><rect x="3" y="10" width="4" height="4"></rect><rect x="10" y="10" width="4" height="4"></rect><rect x="17" y="10" width="4" height="4"></rect><rect x="3" y="17" width="4" height="4"></rect><rect x="10" y="17" width="4" height="4"></rect><rect x="17" y="17" width="4" height="4"></rect></svg></button>
                            </div>
                        </div>
                    </div>
                    <div class="ss-slide-list custom-scrollbar view-${this.sidebarSize}" id="ss-slide-list" style="display:block;"></div>
                </div>
                
                <div class="ss-canvas">
                    <div class="ss-preview-box" id="ss-preview-box">
                        <div class="ss-skeleton-loader">
                            <div class="ss-skeleton-row" style="width: 30%;"></div>
                            <div class="ss-skeleton-row" style="width: 70%;"></div>
                            <div class="ss-skeleton-row" style="width: 50%;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="ss-rightbar ss-panel">
                    <div class="ss-tabs-wrapper">
                        <div class="ss-tabs">
                            <div class="ss-tab active" data-tab="properties" title="Dia Eigenschappen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>Dia <div class="ss-tab-indicator" id="ind-prop" style="display:none; width:6px; height:6px; background:var(--primary); border-radius:50%; margin-left:4px;"></div></div>
                            <div class="ss-tab" data-tab="settings" title="TV Instellingen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>Scherm <div class="ss-tab-indicator" id="ind-set" style="display:none; width:6px; height:6px; background:var(--primary); border-radius:50%; margin-left:4px;"></div></div>
                            <div class="ss-tab" data-tab="logs" title="Time Machine"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>Historie</div>
                        </div>
                    </div>
                    <div class="ss-prop-content custom-scrollbar" id="ss-prop-content"></div>
                </div>
            `;

            document.getElementById('btn-add-slides').onclick = () => {
                if (window.EventBus) window.EventBus.emit('slideshow:open_link_modal', this.slideshowId);
            };

            const filterSelect = document.getElementById('ss-filter-select');
            if (filterSelect) {
                filterSelect.value = this.currentFilter;
                filterSelect.onchange = (e) => {
                    this.currentFilter = e.target.value;
                    this.renderSidebar();
                };
            }

            workspace.querySelectorAll('.ss-size-btn').forEach(btn => {
                btn.onclick = () => {
                    workspace.querySelectorAll('.ss-size-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.sidebarSize = btn.dataset.size;
                    if (this.setSetting) this.setSetting('sidebar_size', this.sidebarSize);
                    
                    const container = document.getElementById('ss-sidebar-container');
                    container.className = `ss-sidebar ss-panel size-${this.sidebarSize}`;
                    
                    const list = document.getElementById('ss-slide-list');
                    list.className = `ss-slide-list custom-scrollbar view-${this.sidebarSize}`;
                    
                    this.renderSidebar(); 
                };
            });

            workspace.querySelectorAll('.ss-tab').forEach(tab => {
                tab.onclick = () => {
                    workspace.querySelectorAll('.ss-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.activeTab = tab.dataset.tab;
                    if (this.renderProperties) this.renderProperties();
                };
            });

            this.renderSidebar();
            this.renderPreview();
            if (this.renderProperties) this.renderProperties();
            
            if (!this.isReadOnly && window.EventBus) {
                window.EventBus.emit('slideshow:init_dragdrop', { containerId: 'ss-slide-list', slideshowId: this.slideshowId });
            }
        },

        showNewChapterModal() {
            let overlay = document.getElementById('ss-chapter-modal-overlay');
            if (overlay) overlay.remove();
            
            const isDark = this.isDarkTheme;
            const bg = isDark ? '#1e293b' : '#ffffff';
            const text = isDark ? '#f8fafc' : '#0f172a';
            const textMuted = isDark ? '#94a3b8' : '#64748b';
            const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
            const inputBg = isDark ? '#0f172a' : '#f8fafc';
            
            overlay = document.createElement('div');
            overlay.id = 'ss-chapter-modal-overlay';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:2147483647;';
            document.body.appendChild(overlay);

            overlay.innerHTML = `
                <div style="background:${bg}; padding:24px; border-radius:12px; width:90%; max-width:360px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); font-family:inherit; color:${text}; border:1px solid ${border}; transform: translateY(-20px); animation: ssModalIn 0.2s forwards ease-out;">
                    <style>@keyframes ssModalIn { to { transform: translateY(0); opacity: 1; } }</style>
                    <h3 style="margin:0 0 16px 0; font-size:1.1rem; color:${text}; font-weight:800;">Nieuwe map maken</h3>
                    <p style="font-size:0.85rem; color:${textMuted}; margin-bottom:16px;">De geselecteerde dia's worden direct in deze nieuwe map geplaatst.</p>
                    
                    <div style="margin-bottom:24px;">
                        <label style="font-size:0.75rem; color:${textMuted}; font-weight:600; margin-bottom:6px; display:block;">Mapnaam</label>
                        <input type="text" id="new-chap-input" placeholder="Bijv. Introductie..." style="width:100%; padding:10px 12px; border-radius:6px; border:1px solid ${border}; background:${inputBg}; color:${text}; font-size:0.9rem; outline:none; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button id="btn-new-chap-close" style="background:transparent; color:${textMuted}; border:none; cursor:pointer; padding:8px 12px; font-weight:600; font-size:0.85rem;">Annuleren</button>
                        <button id="btn-new-chap-save" style="background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer; padding:8px 16px; font-weight:600; font-size:0.85rem; box-shadow:0 1px 2px rgba(37,99,235,0.3);">Map Aanmaken</button>
                    </div>
                </div>
            `;

            document.getElementById('btn-new-chap-close').onclick = () => overlay.remove();
            
            const input = document.getElementById('new-chap-input');
            input.focus();

            const saveAction = () => {
                const name = input.value.trim();
                if (name && name !== "") {
                    let changed = 0;
                    this.selectedIndices.forEach(idx => {
                        const item = this.data.items[idx];
                        if (item) {
                            item.chapter_name = name;
                            this.pendingDeltaItems.set(item.id, item);
                            changed++;
                        }
                    });
                    if (changed > 0) {
                        if (this.triggerAutoSave) this.triggerAutoSave(`Verplaatst naar ${name}`);
                        this.renderSidebar();
                    }
                    overlay.remove();
                }
            };

            document.getElementById('btn-new-chap-save').onclick = saveAction;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveAction();
            });
        },

        showSlideMenu(x, y, idx) {
            document.querySelectorAll('.ss-fixed-ctx-menu').forEach(e => e.remove());
            const item = this.data.items[idx];
            if (!item) return;

            const isActive = item.is_active == 1;
            const menu = document.createElement('div');
            
            const themeClass = this.isDarkTheme ? 'theme-dark' : 'theme-light';
            menu.className = `ss-fixed-ctx-menu ${themeClass}`;
            
            let mX = x - 180;
            if (mX < 10) mX = 10;
            
            menu.style.top = `${y}px`;
            menu.style.left = `${mX}px`;

            menu.innerHTML = `
                <button class="ss-fixed-ctx-menu-btn" id="ctx-toggle">
                    ${isActive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> Uitschakelen' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Inschakelen'}
                </button>
                <button class="ss-fixed-ctx-menu-btn" id="ctx-cover">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Als cover instellen
                </button>
                <button class="ss-fixed-ctx-menu-btn" id="ctx-copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopiëren
                </button>
                ${this.clipboardItem ? `
                <button class="ss-fixed-ctx-menu-btn" id="ctx-paste">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2-2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Plakken (Hierna)
                </button>
                ` : ''}
                <div class="ss-ctx-divider" style="height:1px; margin:4px 0;"></div>
                <button class="ss-fixed-ctx-menu-btn danger" id="ctx-delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Verwijderen
                </button>
            `;

            document.body.appendChild(menu);

            document.getElementById('ctx-toggle').onclick = () => {
                this.selectedIndices.forEach(i => {
                    const t = this.data.items[i];
                    t.is_active = t.is_active == 1 ? 0 : 1;
                    this.pendingDeltaItems.set(t.id, t);
                });
                if (this.triggerAutoSave) this.triggerAutoSave(`Zichtbaarheid gewijzigd.`);
                this.renderSidebar();
                menu.remove();
            };

            document.getElementById('ctx-cover').onclick = () => {
                this.data.slideshow.cover_file_id = item.file_id;
                if (this.triggerAutoSave) this.triggerAutoSave("Nieuwe cover ingesteld.");
                this.renderSidebar();
                menu.remove();
            };

            document.getElementById('ctx-copy').onclick = () => {
                this.clipboardItem = JSON.parse(JSON.stringify(item)); 
                this.clipboardItem.id = null; 
                if (window.EventBus) window.EventBus.emit('notify:success', 'Dia gekopieerd.');
                this.renderSidebar(); 
                menu.remove();
            };

            if (document.getElementById('ctx-paste')) {
                document.getElementById('ctx-paste').onclick = () => {
                    if (!this.clipboardItem) return;
                    this.data.items.splice(idx + 1, 0, this.clipboardItem);
                    this.data.items.forEach((it, i) => {
                        it.sort_order = i;
                        this.pendingDeltaItems.set(it.id || 'new_' + i, it);
                    });
                    if (this.triggerAutoSave) this.triggerAutoSave("Dia geplakt.");
                    this.renderSidebar();
                    menu.remove();
                };
            }

            document.getElementById('ctx-delete').onclick = async () => {
                menu.remove();
                if (!item.id || isNaN(item.id)) {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Sla eerst op voordat je deze verwijdert!');
                    return;
                }
                if (window.ModalService) {
                    const conf = await window.ModalService.confirm('Dia Verwijderen', `Wil je deze ${this.selectedIndices.length > 1 ? this.selectedIndices.length + ' bestanden' : 'dia'} uit de presentatie verwijderen?`, { danger: true, yesText: 'Verwijderen' });
                    if (conf) {
                        const idsToRemove = this.selectedIndices.map(i => this.data.items[i].id);
                        if (this.removeMultipleSlides) this.removeMultipleSlides(idsToRemove);
                        else if (this.removeSlide) this.removeSlide(item.id, idx);
                    }
                }
            };

            setTimeout(() => {
                document.addEventListener('click', () => {
                    const m = document.querySelector('.ss-fixed-ctx-menu');
                    if(m) m.remove();
                }, { once: true });
            }, 10);
        },

        renderSidebar() {
            const list = document.getElementById('ss-slide-list');
            const sidebarContainer = document.getElementById('ss-sidebar-container');
            if (!list || !sidebarContainer) return;

            if (!this.data.items || this.data.items.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:40px 20px; opacity:0.5; font-size:0.85rem; grid-column: 1 / -1;">Geen dias gekoppeld.</div>`;
                return;
            }

            let scrollBtn = document.getElementById('ss-smart-scroll-btn');
            if (!scrollBtn) {
                scrollBtn = document.createElement('button');
                scrollBtn.id = 'ss-smart-scroll-btn';
                scrollBtn.className = 'ss-smart-scroll-btn';
                scrollBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
                sidebarContainer.appendChild(scrollBtn);
            }

            let isPointingUp = false;
            scrollBtn.onclick = () => {
                if (isPointingUp) {
                    list.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
                }
            };

            list.onscroll = () => {
                const maxScroll = list.scrollHeight - list.clientHeight;
                if (maxScroll <= 0) {
                    scrollBtn.classList.remove('visible');
                    return;
                } else {
                    scrollBtn.classList.add('visible');
                }

                if (list.scrollTop > maxScroll / 2) {
                    isPointingUp = true;
                    scrollBtn.classList.add('up');
                } else {
                    isPointingUp = false;
                    scrollBtn.classList.remove('up');
                }
            };

            const chapters = {};
            this.data.items.forEach((item, idx) => {
                const cName = item.chapter_name || 'Standaard';
                if (!chapters[cName]) chapters[cName] = [];
                item._realIndex = idx; 
                chapters[cName].push(item);
            });

            const chapterColors = (this.data.slideshow.settings && this.data.slideshow.settings.chapter_colors) ? this.data.slideshow.settings.chapter_colors : {};

            const getThumbBg = (tItem) => {
                let tFit = tItem.fit_mode || 'contain';
                if (tFit === 'contain' || tFit === 'blur' || tFit === 'cover' || tFit === 'fill' || tFit === 'tile') {
                    return '#1e293b'; 
                }
                if (tFit === 'contain_color') {
                    return tItem.background_color || '#000000';
                }
                if (tFit === 'contain_anim') {
                    const bgId = (tItem.override_background_id !== null && tItem.override_background_id !== undefined) ? tItem.override_background_id : (this.data.slideshow.background_id);
                    if (bgId && bgId != 0 && this.data.dictionaries && this.data.dictionaries.backgrounds) {
                        const bgObj = this.data.dictionaries.backgrounds.find(b => b.id == bgId);
                        if (bgObj) return bgObj.css_gradient || bgObj.fallback_color || '#000000';
                    }
                }
                return '#000000';
            };
            
            const isColorLight = (colorString) => {
                if (!colorString || typeof colorString !== 'string') return false;
                if (colorString.startsWith('linear-gradient') || colorString.startsWith('radial-gradient')) return false; 
                
                let hex = colorString.replace("#", "");
                if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
                if (hex.length !== 6) return false;
                
                let r = parseInt(hex.substr(0,2),16);
                let g = parseInt(hex.substr(2,2),16);
                let b = parseInt(hex.substr(4,2),16);
                let yiq = ((r*299)+(g*587)+(b*114))/1000;
                return (yiq >= 140); 
            };

            let html = '';
            let visibleCount = 0;

            if (!this.isReadOnly) {
                html += `
                    <div style="padding: 12px; border-bottom: 1px solid rgba(128,128,128,0.15); margin-bottom: 12px;">
                        <button id="btn-new-chapter" class="ss-btn-secondary" style="width: 100%; padding: 8px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; background: rgba(128,128,128,0.05); color: inherit; border: 1px solid rgba(128,128,128,0.2); display: flex; align-items: center; justify-content: center; gap: 6px; transition:0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                            Geselecteerde items in nieuwe map
                        </button>
                    </div>
                `;
            }

            Object.keys(chapters).forEach(chapterName => {
                let chapterHtml = '';
                const cColor = chapterColors[chapterName] || 'transparent';

                chapters[chapterName].forEach((item, innerLoopIdx) => {
                    const isVideo = item.mime_type && item.mime_type.startsWith('video');
                    const idx = item._realIndex;
                    
                    if (this.currentFilter === 'active' && item.is_active == 0) return;
                    if (this.currentFilter === 'inactive' && item.is_active == 1) return;
                    if (this.currentFilter === 'video' && !isVideo) return;
                    if (this.currentFilter === 'image' && isVideo) return;
                    if (this.currentFilter.startsWith('trans_')) {
                        const reqTransId = parseInt(this.currentFilter.replace('trans_', ''));
                        if (item.transition_id != reqTransId) return;
                    }

                    visibleCount++;

                    const isActive = this.selectedIndices.includes(idx) ? 'active' : '';
                    const isInactiveState = item.is_active == 0 ? 'inactive' : '';
                    const isCover = this.data.slideshow.cover_file_id == item.file_id;
                    
                    const isDualLinked = item.settings && item.settings.dual_link;
                    const prevWasLinked = innerLoopIdx > 0 && chapters[chapterName][innerLoopIdx - 1].settings && chapters[chapterName][innerLoopIdx - 1].settings.dual_link;
                    
                    let linkClasses = '';
                    if (isDualLinked) linkClasses += ' linked-top';
                    if (prevWasLinked) linkClasses += ' linked-bottom';
                    
                    let thumbUrl = this.getItemUrl(item);
                    if (item.file_id && !isVideo) thumbUrl = `/api/files?action=thumb&id=${item.file_id}&t=${new Date().getTime()}`;
                    
                    const views = item.views || 0;
                    const statBadge = `<div class="ss-stat-badge" title="${views} weergaven (Volgens Server)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${views}</div>`;
                    
                    const durBadge = `<div class="ss-badge-dur">${item.duration === 'auto' || !item.duration ? 'Auto' : item.duration + 's'}</div>`;
                    
                    const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%231e293b'/%3E%3Cpath d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' transform='translate(6,6) scale(0.5)'/%3E%3C/svg%3E";

                    let transBadge = '';
                    if (item.transition_id) {
                        const tObj = this.data.dictionaries.transitions.find(x => x.id == item.transition_id);
                        transBadge = `<div class="ss-badge-trans" title="Overgang">${this.getTransitionIcon ? this.getTransitionIcon(tObj ? tObj.css_class : '') : ''}</div>`;
                    }

                    let mediaIndicator = '';
                    if (isVideo) {
                        const dur = item.settings && item.settings.trim_end ? Math.round(item.settings.trim_end - (item.settings.trim_start || 0)) + 's' : (item.duration || 'Video');
                        mediaIndicator = `<div class="ss-video-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${dur}</div>`;
                    }
                    
                    const thumbBg = getThumbBg(item);
                    
                    let isLight = isColorLight(thumbBg);
                    let infoStyles = isLight ? `color: #0f172a; text-shadow: none;` : `color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);`;
                    let numStyles = isLight ? `color: rgba(15,23,42,0.6);` : `color: rgba(255,255,255,0.6);`;

                    let dualLinkHtml = '';
                    if (isDualLinked) {
                        dualLinkHtml = `<div class="ss-dual-link-icon" title="Gekoppeld aan volgende dia"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.5 10.5L21 3"></path><path d="M16 3h5v5"></path><path d="M10.5 13.5L3 21"></path><path d="M8 21H3v-5"></path></svg></div>`;
                    }

                    let crop = this.getCropStyles(item);
                    let imgW = (100 / crop.crop_w) * 100;
                    let imgH = (100 / crop.crop_h) * 100;
                    let imgL = -(crop.left / crop.crop_w) * 100;
                    let imgT = -(crop.top / crop.crop_h) * 100;
                    
                    let frameStyleObj = item.settings?.frame_style || window.App?.slideshowEditor?.data?.slideshow?.settings?.frame_style || 'none';
                    let thumbFrameStyle = '';
                    
                    if (frameStyleObj === 'classic') {
                        thumbFrameStyle = 'background: #fff; padding: 4%; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); width: 80%; height: 80%;';
                        isLight = true; 
                        infoStyles = `color: #0f172a; text-shadow: none;`;
                    } else if (frameStyleObj === 'polaroid') {
                        thumbFrameStyle = 'background: #fff; padding: 4% 4% 15% 4%; border-radius: 2px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); width: 80%; height: 80%;';
                        isLight = true;
                        infoStyles = `color: #0f172a; text-shadow: none;`;
                    } else if (frameStyleObj === 'rounded') {
                        thumbFrameStyle = 'border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); overflow: hidden; width: 90%; height: 90%;';
                    } else {
                        thumbFrameStyle = 'width: 100%; height: 100%;';
                    }

                    let tFitMode = item.fit_mode || 'contain';
                    let hasCrop = crop.crop_w !== 100 || crop.crop_h !== 100 || crop.left !== 0 || crop.top !== 0;
                    if (hasCrop) tFitMode = 'contain';

                    let thumbMediaHtml = '';

                    if (tFitMode === 'cover' || tFitMode === 'fill') {
                        let objF = tFitMode === 'fill' ? 'fill' : 'cover';
                        thumbMediaHtml = `<img src="${fallbackImg}" data-src="${thumbUrl}" class="ss-lazy-image" style="width:100%; height:100%; object-fit:${objF}; filter:${crop.filterStr}; transition:opacity 0.3s; opacity:0.2;" onerror="this.onerror=null; this.src='${fallbackImg}';">`;
                    } else if (tFitMode === 'tile') {
                        thumbMediaHtml = `<div class="ss-lazy-image" style="width:100%; height:100%; background-image:url('${thumbUrl}'); background-size:30px; filter:${crop.filterStr}; transition:opacity 0.3s; opacity:0.2;"></div>`;
                    } else {
                        thumbMediaHtml = `
                            <div style="position:relative; width:100%; height:100%; overflow:hidden; border-radius:inherit;">
                                <img src="${fallbackImg}" data-src="${thumbUrl}" class="ss-slide-image ss-lazy-image" style="position:absolute; width:${imgW}%; height:${imgH}%; left:${imgL}%; top:${imgT}%; opacity:0.2; filter:${crop.filterStr}; transition:opacity 0.3s;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                            </div>
                        `;
                    }

                    chapterHtml += `
                        <div class="ss-slide-wrapper">
                            <div class="ss-slide-number" style="${numStyles}">${idx + 1}</div>
                            <div class="ss-slide-item ${isActive} ${isInactiveState} ${linkClasses}" data-index="${idx}" data-id="${item.id}">
                                <div class="ss-slide-thumb" style="background: ${thumbBg}; display: flex; align-items: center; justify-content: center;">
                                    <div class="ss-anim-layer" style="position:relative; z-index:2; ${thumbFrameStyle}">
                                        <div style="width:100%; height:100%; transform: ${crop.transformStr}; transform-origin: center center;">
                                            ${thumbMediaHtml}
                                        </div>
                                    </div>
                                    ${statBadge}
                                    ${transBadge}
                                    ${durBadge}
                                    ${mediaIndicator}
                                    ${dualLinkHtml}
                                    ${isCover ? `<div class="ss-badge-cover" style="top:auto; bottom:6px; right:40px; left:auto;">Cover</div>` : ''}
                                    ${!this.isReadOnly ? `
                                    <div class="ss-3dot-btn ${isActive ? 'active' : ''}" data-idx="${idx}" title="Acties">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                    </div>
                                    ` : ''}
                                </div>
                                <div class="ss-slide-info" style="${infoStyles}">
                                    <div class="ss-slide-title" title="${item.original_name}">${item.original_name || 'Bestand'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                if (chapterHtml !== '') {
                    html += `
                        <div class="ss-chapter-group">
                            <div class="ss-chapter-header" data-chapter="${chapterName}" style="border-left-color: ${cColor};">
                                <span style="display:flex; align-items:center; gap:8px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    ${chapterName}
                                    ${!this.isReadOnly ? `<span class="btn-edit-chapter" style="display:flex; align-items:center; justify-content:center; padding:4px; margin-left:4px; opacity:0.4; transition:0.2s; border-radius:4px; cursor:pointer;" title="Map aanpassen/verwijderen"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span>` : ''}
                                </span>
                                <svg class="ss-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                            <div class="ss-chapter-content ss-chapter-dropzone" style="display:${this.sidebarSize === 'list' ? 'flex' : 'grid'}; flex-direction:column;">
                                ${chapterHtml}
                            </div>
                        </div>
                    `;
                }
            });

            if (visibleCount === 0) {
                 list.innerHTML = `<div style="text-align:center; padding:40px 20px; opacity:0.5; grid-column: 1 / -1;">Geen resultaten voor dit filter.</div>`;
                 return;
            }

            list.innerHTML = html;
            
            if (this.lazyObserver) {
                this.lazyObserver.disconnect();
            }
            this.lazyObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.onload = () => { img.style.opacity = 1; };
                            if(img.tagName === 'DIV') {
                                setTimeout(() => { img.style.opacity = 1; }, 50);
                            } else {
                                img.src = src;
                            }
                            img.removeAttribute('data-src');
                        }
                        observer.unobserve(img);
                    }
                });
            }, { root: list, rootMargin: '300px 0px', threshold: 0.01 });

            list.querySelectorAll('.ss-lazy-image').forEach(img => {
                this.lazyObserver.observe(img);
            });

            list.dispatchEvent(new Event('scroll'));
            
            const newChapBtn = document.getElementById('btn-new-chapter');
            if (newChapBtn) {
                newChapBtn.onclick = () => {
                    if (this.selectedIndices.length === 0) {
                        if (window.EventBus) window.EventBus.emit('notify:warning', 'Selecteer eerst dia\'s (met Ctrl+Klik) om ze in een map te plaatsen.');
                        return;
                    }
                    this.showNewChapterModal();
                };
            }
            
            list.querySelectorAll('.ss-chapter-header').forEach(header => {
                header.onclick = (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.closest('.btn-edit-chapter')) return;
                    header.parentElement.classList.toggle('closed');
                };

                const editBtn = header.querySelector('.btn-edit-chapter');
                if (editBtn) {
                    editBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const chapName = header.dataset.chapter;
                        
                        const liveSettings = this.data.slideshow.settings || {};
                        const liveColors = liveSettings.chapter_colors || {};
                        const liveColor = liveColors[chapName] || '#3b82f6';
                        
                        let moveOptions = '<option value="">Standaard (Geen map)</option>';
                        Object.keys(chapters).forEach(c => {
                            if (c !== chapName && c !== 'Standaard') {
                                moveOptions += `<option value="${c}">Map: ${c}</option>`;
                            }
                        });
                        
                        let overlay = document.getElementById('ss-chapter-modal-overlay');
                        if (overlay) overlay.remove();
                        
                        const isDark = this.isDarkTheme;
                        const bg = isDark ? '#1e293b' : '#ffffff';
                        const text = isDark ? '#f8fafc' : '#0f172a';
                        const textMuted = isDark ? '#94a3b8' : '#64748b';
                        const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
                        const inputBg = isDark ? '#0f172a' : '#f8fafc';
                        
                        overlay = document.createElement('div');
                        overlay.id = 'ss-chapter-modal-overlay';
                        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:2147483647;';
                        
                        document.body.appendChild(overlay);

                        overlay.innerHTML = `
                            <div style="background:${bg}; padding:24px; border-radius:12px; width:90%; max-width:400px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); font-family:inherit; color:${text}; border:1px solid ${border}; transform: translateY(-20px); animation: ssModalIn 0.2s forwards ease-out;">
                                <style>@keyframes ssModalIn { to { transform: translateY(0); opacity: 1; } }</style>
                                <h3 style="margin:0 0 16px 0; font-size:1.1rem; color:${text}; font-weight:800;">Map: ${chapName}</h3>
                                
                                <div style="margin-bottom:16px;">
                                    <label style="font-size:0.75rem; color:${textMuted}; font-weight:600; margin-bottom:6px; display:block;">Hernoemen</label>
                                    <div style="display:flex; gap:8px;">
                                        <input type="text" id="chap-rename-input" value="${chapName}" style="flex:1; padding:8px 12px; border-radius:6px; border:1px solid ${border}; background:${inputBg}; color:${text}; font-size:0.9rem; outline:none; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                                        <button id="btn-chap-rename" style="padding:0 16px; border-radius:6px; cursor:pointer; background:#2563eb; color:#fff; border:none; font-weight:600; box-shadow:0 1px 2px rgba(37,99,235,0.3);">Opslaan</button>
                                    </div>
                                </div>

                                <div style="margin-bottom:24px;">
                                    <label style="font-size:0.75rem; color:${textMuted}; font-weight:600; margin-bottom:6px; display:block;">Kleur Label</label>
                                    <div style="display:flex; gap:8px;">
                                        <input type="color" id="chap-color-input" value="${liveColor !== 'transparent' ? liveColor : '#3b82f6'}" style="width:44px; padding:0; height:38px; cursor:pointer; border-radius:6px; border:1px solid ${border}; background:${inputBg};">
                                        <button id="btn-chap-color" style="flex:1; border-radius:6px; cursor:pointer; border:1px solid ${border}; background:${bg}; color:${text}; font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,0.05);">Kleur Toepassen</button>
                                    </div>
                                </div>

                                <div style="margin-bottom:24px; border-top:1px solid ${border}; padding-top:16px;">
                                    <label style="font-size:0.75rem; color:${textMuted}; font-weight:600; margin-bottom:6px; display:block;">Dia's in deze map verplaatsen</label>
                                    <div style="display:flex; gap:8px;">
                                        <select id="chap-move-select" style="flex:1; padding:8px 12px; border-radius:6px; border:1px solid ${border}; background:${inputBg}; color:${text}; font-size:0.9rem; outline:none;">
                                            ${moveOptions}
                                        </select>
                                        <button id="btn-chap-move" style="padding:0 16px; border-radius:6px; cursor:pointer; background:#10b981; color:#fff; border:none; font-weight:600; box-shadow:0 1px 2px rgba(16,185,129,0.3);">Verplaatsen</button>
                                    </div>
                                </div>

                                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid ${border}; padding-top:16px;">
                                    <button id="btn-chap-delete" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem; transition:0.2s;">Wissen: Map + Dia's</button>
                                    <button id="btn-chap-close" style="background:transparent; color:${textMuted}; border:none; cursor:pointer; padding:8px 12px; font-weight:600; font-size:0.85rem;">Sluiten</button>
                                </div>
                            </div>
                        `;

                        const closeModal = () => overlay.remove();

                        document.getElementById('btn-chap-close').onclick = closeModal;

                        document.getElementById('btn-chap-rename').onclick = () => {
                            const newName = document.getElementById('chap-rename-input').value.trim();
                            if (newName && newName !== chapName) {
                                let changed = 0;
                                this.data.items.forEach(i => {
                                    if ((i.chapter_name || 'Standaard') === chapName) {
                                        i.chapter_name = newName;
                                        this.pendingDeltaItems.set(i.id, i);
                                        changed++;
                                    }
                                });
                                if (this.triggerAutoSave) this.triggerAutoSave(`Hoofdstuk hernoemd.`);
                                this.renderSidebar();
                            }
                            closeModal();
                        };

                        document.getElementById('btn-chap-color').onclick = () => {
                            const color = document.getElementById('chap-color-input').value;
                            this.data.slideshow.settings = this.data.slideshow.settings || {};
                            this.data.slideshow.settings.chapter_colors = this.data.slideshow.settings.chapter_colors || {};
                            this.data.slideshow.settings.chapter_colors[chapName] = color;
                            if (this.triggerAutoSave) this.triggerAutoSave(`Hoofdstukkleur ingesteld.`);
                            this.renderSidebar();
                            closeModal();
                        };

                        document.getElementById('btn-chap-move').onclick = () => {
                            const targetChapter = document.getElementById('chap-move-select').value;
                            let changed = 0;
                            this.data.items.forEach(i => {
                                if ((i.chapter_name || 'Standaard') === chapName) {
                                    i.chapter_name = targetChapter;
                                    this.pendingDeltaItems.set(i.id, i);
                                    changed++;
                                }
                            });
                            if (changed > 0) {
                                if (this.triggerAutoSave) this.triggerAutoSave(`Alle dia's verplaatst naar ${targetChapter === '' ? 'Standaard' : targetChapter}.`);
                                this.renderSidebar();
                            }
                            closeModal();
                        };

                        document.getElementById('btn-chap-delete').onclick = async () => {
                            closeModal();
                            if (window.ModalService) {
                                const conf = await window.ModalService.confirm('Hoofdstuk Verwijderen', `Weet je zeker dat je de map '${chapName}' én alle onderliggende bestanden definitief wilt verwijderen?`, { danger: true, yesText: 'Ja, Verwijder Alles' });
                                if (conf) {
                                    const idsToRemove = this.data.items.filter(i => (i.chapter_name || 'Standaard') === chapName).map(i => i.id);
                                    if(this.removeMultipleSlides) this.removeMultipleSlides(idsToRemove);
                                }
                            } else {
                                if (confirm(`LET OP: Weet je zeker dat je map '${chapName}' én alle dia's wilt verwijderen?`)) {
                                    const idsToRemove = this.data.items.filter(i => (i.chapter_name || 'Standaard') === chapName).map(i => i.id);
                                    if(this.removeMultipleSlides) this.removeMultipleSlides(idsToRemove);
                                }
                            }
                        };
                    };
                }
            });

            list.querySelectorAll('.ss-slide-item').forEach(el => {
                el.onclick = (e) => {
                    if (e.target.closest('.ss-3dot-btn')) return;

                    const idx = parseInt(el.dataset.index);
                    if (e.shiftKey && this.lastClickedIndex !== -1) {
                        const start = Math.min(this.lastClickedIndex, idx);
                        const end = Math.max(this.lastClickedIndex, idx);
                        this.selectedIndices = [];
                        for (let i = start; i <= end; i++) this.selectedIndices.push(i);
                    } else if (e.ctrlKey || e.metaKey) {
                        if (this.selectedIndices.includes(idx)) {
                            this.selectedIndices = this.selectedIndices.filter(i => i !== idx);
                        } else {
                            this.selectedIndices.push(idx);
                        }
                    } else {
                        this.selectedIndices = [idx];
                    }
                    
                    this.lastClickedIndex = idx;
                    if (this.renderSidebar) this.renderSidebar(); 
                    
                    const box = document.getElementById('ss-preview-box');
                    if (box) {
                        box.innerHTML = `
                            <div class="ss-skeleton-loader">
                                <div class="ss-skeleton-row" style="width: 30%;"></div>
                                <div class="ss-skeleton-row" style="width: 70%;"></div>
                                <div class="ss-skeleton-row" style="width: 50%;"></div>
                            </div>
                        `;
                    }
                    
                    setTimeout(() => {
                        if (this.renderPreview) this.renderPreview();
                        if (this.activeTab === 'properties' && this.renderProperties) this.renderProperties();
                    }, 50); 
                };
            });

            if (!this.isReadOnly) {
                list.querySelectorAll('.ss-3dot-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.idx);
                        
                        if (!this.selectedIndices.includes(idx)) {
                            this.selectedIndices = [idx];
                            this.lastClickedIndex = idx;
                            this.renderSidebar();
                            if (this.renderProperties) this.renderProperties();
                        }

                        this.showSlideMenu(e.clientX, e.clientY, idx);
                    };
                });
            }
        },

        triggerPreviewAnimation(cssClass) {
            const previewImages = document.querySelectorAll('.ss-preview-image, .ss-layer-media');
            previewImages.forEach(img => {
                let animClass = '';
                if (cssClass.includes('glitch')) animClass = 'preview-anim-glitch';
                else if (cssClass.includes('zoom')) animClass = 'preview-anim-zoom-in';
                else if (cssClass.includes('flip')) animClass = 'preview-anim-flip-3d';
                
                if (animClass) {
                    img.classList.remove(animClass);
                    void img.offsetWidth; 
                    img.classList.add(animClass);
                }
            });
        },

        renderPreview() {
            const box = document.getElementById('ss-preview-box');
            if (!box) return;

            if (this.selectedIndices.length === 0) {
                box.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; gap:16px; opacity:0.3;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg><span style="font-size:1.1rem; font-weight:600;">Selecteer een dia om te bewerken</span></div>`;
                box.style.backgroundColor = '#000000';
                return;
            }

            const item = this.data.items[this.selectedIndices[0]];
            if (!item) return;

            const s = this.data.slideshow;
            const layout = s.settings?.layout || 'full';
            
            const globalScale = s.settings?.media_scale !== undefined ? s.settings.media_scale : 0.85;
            const rawScale = (item.media_scale !== null && item.media_scale !== undefined) ? item.media_scale : globalScale;
            const renderScale = rawScale * 0.75;

            const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%230f172a'/%3E%3Cpath d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' transform='translate(6,6) scale(0.5)'/%3E%3Ctext x='50%25' y='60%25' fill='%23334155' text-anchor='middle' font-family='sans-serif' font-size='12px'%3EMedia Niet Gevonden%3C/text%3E%3C/svg%3E";
            const errHndl = `onerror="this.onerror=null; this.src='${fallbackSvg}';"`;

            const buildMedia = (targetItem, customStyle = '', next = false) => {
                if (!targetItem) return '';
                let targetUrl = this.getItemUrl(targetItem);
                let isVideo = targetItem.mime_type && targetItem.mime_type.startsWith('video');
                let tFitMode = targetItem.fit_mode || 'contain';

                let crop = this.getCropStyles(targetItem, targetItem.settings?.kenburns);
                let watermarkHtml = this.buildWatermarkHTML(s, targetItem);

                let forceCover = (layout === 'grid' || (layout === 'pip' && next)); 
                
                if (forceCover || tFitMode === 'cover' || tFitMode === 'fill' || tFitMode === 'tile') {
                    let objF = (tFitMode === 'fill' && !forceCover) ? 'fill' : 'cover';
                    let objPos = forceCover ? `${crop.cx}% ${crop.cy}%` : 'center center';
                    
                    let imgStyle = `position:absolute; inset:0; width:100%; height:100%; object-fit:${objF}; object-position:${objPos}; filter:${crop.filterStr}; transform:${crop.transformStr};`;
                    let mHtml = '';
                    if (tFitMode === 'tile' && !next) {
                        let size = targetItem.settings?.tile_size === 'sm' ? '100px' : (targetItem.settings?.tile_size === 'lg' ? '500px' : '250px');
                        imgStyle = `position:absolute; inset:0; width:100%; height:100%; background-image:url('${targetUrl}'); background-repeat:repeat; background-size:${size}; background-position:center; filter:${crop.filterStr};`;
                        mHtml = `<div style="${imgStyle}"></div>`;
                    } else {
                        mHtml = isVideo ? `<video src="${targetUrl}" style="${imgStyle}" autoplay muted loop playsinline></video>` : `<img src="${targetUrl}" style="${imgStyle}" ${errHndl}>`;
                    }
                    return `<div class="ss-anim-layer" style="position:relative; width:100%; height:100%; overflow:hidden; ${customStyle}">${mHtml}${watermarkHtml}</div>`;
                }

                let imgW = (100 / crop.crop_w) * 100;
                let imgH = (100 / crop.crop_h) * 100;
                let imgL = -(crop.left / crop.crop_w) * 100;
                let imgT = -(crop.top / crop.crop_h) * 100;

                let frameStyleObj = targetItem.settings?.frame_style || window.App?.slideshowEditor?.data?.slideshow?.settings?.frame_style || 'none';
                let frameBgStyle = '';
                let cropboxInset = 'inset: 0;';
                
                if (frameStyleObj === 'classic') {
                    frameBgStyle = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 8px; padding: 16px;';
                    cropboxInset = 'top: 16px; left: 16px; right: 16px; bottom: 16px;';
                } else if (frameStyleObj === 'polaroid') {
                    frameBgStyle = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 4px; padding: 24px 24px 100px 24px;';
                    cropboxInset = 'top: 24px; left: 24px; right: 24px; bottom: 100px;';
                } else if (frameStyleObj === 'rounded') {
                    frameBgStyle = 'box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 24px; border: 2px solid rgba(255,255,255,0.1);';
                } else {
                    frameBgStyle = 'border-radius: 0px;';
                }

                let mediaTag = isVideo 
                    ? `<video src="${targetUrl}" class="ss-phantom-measure" data-cropw="${crop.crop_w}" data-croph="${crop.crop_h}" style="position:absolute; left:${imgL}%; top:${imgT}%; width:${imgW}%; height:${imgH}%; filter:${crop.filterStr}; max-width:none; max-height:none;" autoplay muted loop playsinline></video>`
                    : `<img src="${targetUrl}" class="ss-phantom-measure" data-cropw="${crop.crop_w}" data-croph="${crop.crop_h}" style="position:absolute; left:${imgL}%; top:${imgT}%; width:${imgW}%; height:${imgH}%; filter:${crop.filterStr}; max-width:none; max-height:none;" ${errHndl}>`;

                return `
                    <div class="ss-anim-layer" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; ${customStyle}">
                        <div class="ss-layer-wrapper" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; transform: ${crop.transformStr}; transform-origin: center;">
                            <div class="ss-layer-frame" style="position:relative; display:inline-flex; min-width:0; min-height:0; max-width:100%; max-height:100%; box-sizing:border-box; ${frameBgStyle}">
                                
                                <svg class="ss-dummy-svg" width="1920" height="1080" viewBox="0 0 1920 1080" style="opacity:0; display:block; max-width:100%; max-height:100%; pointer-events:none;"></svg>
                                
                                <div class="ss-layer-cropbox" style="position:absolute; ${cropboxInset} overflow:hidden; border-radius:inherit;">
                                    ${mediaTag}
                                </div>
                                
                                ${watermarkHtml}
                            </div>
                        </div>
                    </div>
                `;
            };

            const rootFitMode = item.fit_mode || 'contain';
            let bgHtml = '';
            
            const getBgColor = (itemBg) => {
                if (!itemBg) return '#000000';
                if (itemBg.includes('gradient')) return `background: ${itemBg};`;
                return `background-color: ${itemBg};`;
            };
            
            if (rootFitMode === 'contain' || rootFitMode === 'cover' || rootFitMode === 'fill' || rootFitMode === 'tile' || rootFitMode === 'blur') {
                const url = this.getItemUrl(item);
                let filterStr = '';
                const b = item.filter_brightness ?? 100;
                const c = item.filter_contrast ?? 100;
                const sat = item.filter_saturate ?? 100;
                filterStr = `brightness(${b}%) contrast(${c}%) saturate(${sat}%) `;
                if (item.image_filter && item.image_filter !== 'none') {
                    const f = item.image_filter;
                    if (f === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (f === 'sepia') filterStr += 'sepia(100%) ';
                    else if (f === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                    else filterStr += `${f} `;
                }
                
                bgHtml = `
                <div class="ss-bg-layer ss-layer-2" style="background:#000; z-index:1;">
                    <img src="${url}" style="width:100%; height:100%; object-fit:cover; transform:scale(1.2); filter: blur(40px) saturate(2) brightness(0.6) ${filterStr.trim()};" ${errHndl}>
                </div>`;
            } else if (rootFitMode === 'contain_color') {
                const styleBg = getBgColor(item.background_color);
                bgHtml = `<div class="ss-bg-layer ss-layer-2" style="${styleBg} width:100%; height:100%; z-index:1;"></div>`;
            } else if (rootFitMode === 'contain_anim') {
                const bgId = (item.override_background_id !== null && item.override_background_id !== undefined) ? item.override_background_id : s.background_id;
                if (bgId && bgId != 0 && this.data.dictionaries.backgrounds) {
                    const bgObj = this.data.dictionaries.backgrounds.find(b => b.id == bgId);
                    if (bgObj) {
                        if (bgObj.css_animation === 'bg-cinematic') {
                            const url = this.getItemUrl(item);
                            bgHtml = `
                            <div class="ss-bg-layer ss-layer-2" style="background:#000; z-index:1;">
                                <img src="${url}" style="width:100%; height:100%; object-fit:cover; filter: blur(40px) saturate(2) brightness(0.6); animation: ssBgCinematicPulse 10s infinite alternate ease-in-out;" ${errHndl}>
                            </div>`;
                        } else {
                            bgHtml = `
                            <div class="ss-bg-layer ss-layer-2" style="background: ${bgObj.fallback_color}; z-index:1;">
                                <div style="position:absolute; inset:-10%; background: ${bgObj.css_gradient}; animation: ${bgObj.css_animation_keyframes && bgObj.css_animation_keyframes !== 'none' ? bgObj.css_animation + ' 15s infinite alternate ease-in-out' : 'none'};"></div>
                            </div>`;
                        }
                    }
                }
            } else {
                bgHtml = `<div class="ss-bg-layer ss-layer-2" style="background-color:#000000; z-index:1;"></div>`;
            }

            const stageInnerStyle = `position:absolute; inset:0; display:flex; align-items:center; justify-content:center; width:100%; height:100%;`;
            let stageHtml = '';
            
            const numItems = this.data.items.length;
            const safeIdx = this.selectedIndices[0];

            if (layout === 'split' || item.settings?.dual_link) {
                const nextItemSplit = this.data.items[(safeIdx + 1) % numItems];
                stageHtml = `<div style="${stageInnerStyle}"><div style="display:flex; align-items:center; justify-content:center; gap: 4%; width:100%; height:100%; padding: 0 2%; box-sizing:border-box;">
                    <div style="flex:1; height:100%; position:relative; overflow:hidden;">${buildMedia(item, '', false)}</div>
                    <div style="flex:1; height:100%; position:relative; overflow:hidden;">${buildMedia(nextItemSplit, '', true)}</div>
                </div></div>`;
            } else if (layout === 'pip') {
                const nextItemPip = this.data.items[(safeIdx + 1) % numItems];
                stageHtml = `<div style="${stageInnerStyle}"><div style="position:relative; width:100%; height:100%;">
                    <div style="position:absolute; inset:0; overflow:hidden;">${buildMedia(item, 'width:100%; height:100%;', false)}</div>
                    <div style="position:absolute; bottom: 5%; right: 5%; width: 25%; aspect-ratio: 16/9; z-index:20; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                        ${buildMedia(nextItemPip, '', true)}
                    </div>
                </div></div>`;
            } else if (layout === 'grid') {
                const item2 = this.data.items[(safeIdx + 1) % numItems];
                const item3 = this.data.items[(safeIdx + 2) % numItems];
                const item4 = this.data.items[(safeIdx + 3) % numItems];
                stageHtml = `<div style="${stageInnerStyle}"><div style="display:grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2%; width:100%; height:100%; padding: 2%; box-sizing:border-box;">
                    <div style="position:relative; width:100%; height:100%; overflow:hidden;">${buildMedia(item, '', false)}</div>
                    <div style="position:relative; width:100%; height:100%; overflow:hidden;">${buildMedia(item2, '', false)}</div>
                    <div style="position:relative; width:100%; height:100%; overflow:hidden;">${buildMedia(item3, '', false)}</div>
                    <div style="position:relative; width:100%; height:100%; overflow:hidden;">${buildMedia(item4, '', false)}</div>
                </div></div>`;
            } else if (layout === 'carousel') {
                const prevIdx = (safeIdx - 1 + numItems) % numItems;
                const nextIdx = (safeIdx + 1) % numItems;
                const prevItemCar = this.data.items[prevIdx];
                const nextItemCar = this.data.items[nextIdx];

                stageHtml = `<div style="${stageInnerStyle} perspective: 1200px; transform-style: preserve-3d; overflow:hidden;">
                    <div style="position:absolute; left:-15%; width:50%; height:70%; opacity:0.4; transform: translateZ(-200px) rotateY(35deg); z-index:5; overflow:hidden;">${buildMedia(prevItemCar, '', true)}</div>
                    <div style="z-index:15; width:60%; height:80%; transform: translateZ(50px); overflow:hidden;">${buildMedia(item, '', false)}</div>
                    <div style="position:absolute; right:-15%; width:50%; height:70%; opacity:0.4; transform: translateZ(-200px) rotateY(-35deg); z-index:5; overflow:hidden;">${buildMedia(nextItemCar, '', true)}</div>
                </div>`;
            } else {
                stageHtml = `<div style="${stageInnerStyle}"><div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">${buildMedia(item, '', false)}</div></div>`;
            }

            let overlayHtml = '';
            overlayHtml += this.buildClockHTML(s, item);
            
            if (s.radio_station_id) {
                const isBottomLeft = s.settings?.watermark_pos === 'bottom-left';
                overlayHtml += `<div class="ss-canvas-radio" style="bottom:${isBottomLeft ? '120px' : '30px'}; left:30px; position:absolute; font-size:36px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="margin-right:8px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Audio is Actief</div>`;
            }

            box.innerHTML = `
                <div id="ss-preview-virtual-canvas" style="width:1920px; height:1080px; position:absolute; top:0; left:0; transform-origin: 0 0; display:block; overflow:hidden; background:#000;">
                    ${bgHtml}
                    <div class="ss-layer-media-scale ss-layer-3" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:10; transform: scale(${renderScale}); transform-origin: center center; transition: transform 0.3s ease;">
                        ${stageHtml}
                    </div>
                    <div class="ss-layer-overlays ss-layer-9" style="position:absolute; inset:0; z-index:20; pointer-events:none;">
                        ${overlayHtml}
                    </div>
                </div>
                <div class="ss-preview-play-btn" onclick="if(window.EventBus) window.EventBus.emit('slideshow:preview_start')">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
            `;

            const measureImgs = box.querySelectorAll('.ss-phantom-measure');
            measureImgs.forEach(img => {
                const applyFix = () => {
                    const frame = img.closest('.ss-layer-frame');
                    if (!frame) return;
                    const svg = frame.querySelector('svg.ss-dummy-svg');
                    if (!svg) return;
                    
                    const w = img.naturalWidth || img.videoWidth || 1920;
                    const h = img.naturalHeight || img.videoHeight || 1080;
                    
                    const cW = parseFloat(img.dataset.cropw) || 100;
                    const cH = parseFloat(img.dataset.croph) || 100;
                    
                    const actueleW = Math.max(1, w * (cW / 100));
                    const actueleH = Math.max(1, h * (cH / 100));
                    
                    svg.setAttribute('viewBox', `0 0 ${actueleW} ${actueleH}`);
                    
                    const canvasRatio = 1920 / 1080;
                    const cropRatio = actueleW / actueleH;
                    
                    let finalW, finalH;
                    if (cropRatio >= canvasRatio) {
                        finalW = 1920;
                        finalH = 1920 / cropRatio;
                    } else {
                        finalH = 1080;
                        finalW = 1080 * cropRatio;
                    }
                    
                    svg.setAttribute('width', finalW);
                    svg.setAttribute('height', finalH);
                };

                if (img.tagName === 'VIDEO') {
                    img.addEventListener('error', () => { img.style.display = 'none'; }, true);
                }

                if (img.tagName === 'IMG') {
                    if (img.complete && img.naturalWidth > 0) applyFix();
                    else img.addEventListener('load', applyFix);
                } else {
                    if (img.readyState >= 1) applyFix();
                    else img.addEventListener('loadedmetadata', applyFix);
                }
            });

            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        const w = entry.contentRect.width;
                        const vCanvas = document.getElementById('ss-preview-virtual-canvas');
                        if (vCanvas) {
                            const scale = w / 1920;
                            vCanvas.style.transform = `scale(${scale})`;
                        }
                    }
                });
                this.resizeObserver.observe(box);
            }
            
            const initialW = box.clientWidth || 800;
            const vCanvas = document.getElementById('ss-preview-virtual-canvas');
            if (vCanvas) vCanvas.style.transform = `scale(${initialW / 1920})`;
        },

        renderUI() {
            if (this.renderSidebar) this.renderSidebar();
            if (this.renderPreview) this.renderPreview();
            if (this.renderProperties) this.renderProperties();
            
            const indProp = document.getElementById('ind-prop');
            const indSet = document.getElementById('ind-set');
            if (indProp && indSet) {
                if (this.isDirty || this.pendingDeltaItems.size > 0) {
                    if (this.activeTab === 'properties') indProp.style.display = 'block';
                    else if (this.activeTab === 'settings') indSet.style.display = 'block';
                } else {
                    indProp.style.display = 'none';
                    indSet.style.display = 'none';
                }
            }
        }
    });
})();