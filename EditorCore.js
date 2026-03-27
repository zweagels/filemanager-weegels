/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorCore.js */

(function() {
    class EditorCore {
        constructor() {
            console.log("=== V1.6: EditorCore (Fase 3 - Syntax Vrij) geladen! ===");
            
            this.slideshowId = null;
            this.data = null;
            this.isReadOnly = false;
            this.saveTimeout = null;
            this.activeTab = 'properties'; 
            this.selectedIndices = []; 
            this.lastClickedIndex = -1;
            this.pendingDeltaItems = new Map();
            this.clipboardItem = null;
            
            this.sidebarSize = this.getSetting('sidebar_size', 'grid'); 
            this.currentFilter = 'all';  

            this.history = [];
            this.historyStep = -1;
            this.isUndoRedoAction = false;
            this.isDirty = false;

            this.mouse = { x: 0, y: 0 };
            this.heartbeatInterval = null;
            this.snackTimer = null;

            this.injectStyles();
            this.initListeners();
        }

        getSetting(key, defaultVal) {
            const val = localStorage.getItem('ss_editor_' + key);
            return val !== null ? val : defaultVal;
        }

        setSetting(key, val) {
            localStorage.setItem('ss_editor_' + key, val);
        }

        getAccordionState(id, defaultState = false) {
            const val = localStorage.getItem('ss_acc_' + id);
            if (val === null) return defaultState;
            return val === 'true';
        }

        setAccordionState(id, isOpen) {
            localStorage.setItem('ss_acc_' + id, isOpen);
        }

        getTransitionIcon(cssClass) {
            if (!cssClass) return '';
            if (cssClass.includes('glitch')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            if (cssClass.includes('zoom')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
            if (cssClass.includes('flip')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.32-9.26l-3.2 2.1"></path></svg>`;
            if (cssClass.includes('slide')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>`;
            if (cssClass.includes('fade') || cssClass.includes('dissolve')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`;
            if (cssClass.includes('iris')) return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }

        injectStyles() {
            if (document.getElementById('slideshow-editor-styles')) return;
            const style = document.createElement('style');
            style.id = 'slideshow-editor-styles';
            style.innerHTML = `
                @keyframes ssFadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes ssSlideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                
                @keyframes transGlitch { 0% { transform: translate(0) skew(0); } 20% { transform: translate(-5px, 5px) skew(10deg); filter: hue-rotate(90deg); } 40% { transform: translate(5px, -5px) skew(-10deg); filter: hue-rotate(-90deg); } 60% { transform: translate(-2px, 2px) skew(5deg); } 80% { transform: translate(2px, -2px) skew(-5deg); } 100% { transform: translate(0) skew(0); filter: hue-rotate(0); } }
                @keyframes transZoomIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes transFlip { 0% { transform: perspective(400px) rotateY(90deg); opacity: 0; } 100% { transform: perspective(400px) rotateY(0deg); opacity: 1; } }
                .preview-anim-glitch { animation: transGlitch 0.5s ease; }
                .preview-anim-zoom-in { animation: transZoomIn 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
                .preview-anim-flip-3d { animation: transFlip 0.6s ease-out; }

                @keyframes ssSpin { 100% { transform: rotate(360deg); } }
                .ss-spin { animation: ssSpin 1s linear infinite; }
                .ss-cloud-sync { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; opacity: 0.8; transition: all 0.3s; width: 105px; white-space: nowrap; overflow: hidden; }

                .ss-editor-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); z-index: 100000; display:flex; align-items:center; justify-content:center; opacity:0; visibility:hidden; transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
                .ss-editor-overlay.visible { opacity:1; visibility:visible; }
                .ss-editor-modal { width: 96vw; height: 94vh; border-radius: 20px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.6); transition: background 0.3s, color 0.3s; animation: ssFadeIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; position: relative; }
                
                .ss-editor-modal.theme-light { background: #ffffff; color: #1e293b; border: 1px solid rgba(0,0,0,0.05); }
                .ss-editor-modal.theme-light .ss-canvas { background: #f1f5f9; }
                .ss-editor-modal.theme-light .ss-panel { background: #ffffff; }
                .ss-editor-modal.theme-light .ss-tab.active { background: #ffffff; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
                .ss-editor-modal.theme-light .ss-visual-card { background: rgba(0,0,0,0.03); border: 2px solid transparent; }
                .ss-editor-modal.theme-light .ss-card-preview { background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05); }
                .ss-editor-modal.theme-light .ss-focal-cell { background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5); }
                
                .ss-editor-modal.theme-dark { background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.1); }
                .ss-editor-modal.theme-dark .ss-canvas { background: #020617; }
                .ss-editor-modal.theme-dark .ss-panel { background: #0f172a; }
                .ss-editor-modal.theme-dark .ss-tab.active { background: #1e293b; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                .ss-editor-modal.theme-dark .ss-visual-card { background: rgba(255,255,255,0.03); border: 2px solid transparent; }
                .ss-editor-modal.theme-dark .ss-card-preview { background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .ss-editor-modal.theme-dark .ss-focal-cell { background: rgba(255,255,255,0.1); border: 1px solid rgba(0,0,0,0.5); }
                
                .ss-editor-header { height: 64px; display:flex; align-items:center; justify-content:space-between; padding: 0 24px; border-bottom: 1px solid rgba(128,128,128,0.15); background: inherit; z-index: 10; position:relative; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .ss-title-input { background: transparent; border: 1px solid transparent; color: inherit; font-size: 1.3rem; font-weight: 800; padding: 6px 12px; border-radius: 8px; outline: none; width: 350px; transition: all 0.2s ease; }
                .ss-title-input:focus, .ss-title-input:hover { border-color: var(--primary); background: rgba(128,128,128,0.05); box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
                
                /* FASE 3: Morph transition voor Workspace layout */
                .ss-editor-workspace { display: flex; flex: 1; overflow: hidden; flex-direction: row; transition: flex-direction 0.4s ease; }
                .ss-editor-workspace.layout-ribbon { flex-direction: column-reverse; }
                
                .ss-sidebar { display:flex; flex-direction:column; border-right: 1px solid rgba(128,128,128,0.15); z-index: 5; transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1); flex-shrink:0; }
                .ss-sidebar.size-list { width: 340px; }
                .ss-sidebar.size-grid { width: 380px; }
                .ss-sidebar.size-compact { width: 440px; }
                
                .ss-sidebar-header { padding: 16px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); display:flex; flex-direction:column; gap:12px; background: rgba(128,128,128,0.02); }
                
                .ss-sidebar-toolbar { display:flex; justify-content:space-between; align-items:center; gap: 8px;}
                .ss-filter-select { flex: 1; background:transparent; border:1px solid rgba(128,128,128,0.3); color:inherit; font-size:0.75rem; font-weight:600; padding:6px 8px; border-radius:6px; outline:none; cursor:pointer; }
                .ss-filter-select option, .ss-filter-select optgroup { background: var(--bg-dropdown); color: var(--text-main); }
                
                .ss-size-toggle { display:flex; background:rgba(128,128,128,0.1); border-radius:6px; overflow:hidden; flex-shrink:0; }
                .ss-size-btn { background:transparent; border:none; padding:6px 8px; cursor:pointer; color:inherit; opacity:0.5; transition:0.2s; display:flex; align-items:center; justify-content:center; }
                .ss-size-btn:hover { opacity:0.8; }
                .ss-size-btn.active { opacity:1; background:rgba(128,128,128,0.2); }

                /* FASE 3 FIX: Perfecte CSS voor Lijst Weergave (Brede miniaturen) */
                .ss-slide-wrapper { position: relative; }
                .ss-slide-number { position: absolute; top: -8px; left: -8px; background: var(--bg-surface); color: var(--text-main); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; z-index: 5; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 2px solid var(--primary); transition: 0.2s; }
                
                .ss-slide-list { flex: 1; overflow-y: auto; padding: 16px; display:grid; gap: 12px; grid-template-columns: 1fr; scroll-behavior: smooth; align-content: start; }
                .ss-slide-list.view-grid { grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
                .ss-slide-list.view-compact { grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 10px; }
                
                /* List View Overrides (Full width thumbnails) */
                .ss-slide-list.view-list .ss-slide-info { display: none !important; }

                /* FASE 3: Toetsenbord Focus & Krimp Animatie */
                .ss-slide-item { border-radius: 12px; border: 2px solid transparent; cursor: pointer; transition: transform 0.3s, border 0.2s, opacity 0.3s; position: relative; overflow: visible; display: flex; flex-direction: column; animation: ssFadeIn 0.3s ease forwards; transform-origin: center; }
                .ss-slide-item.removing { transform: scale(0) !important; opacity: 0 !important; }
                
                .ss-slide-item:hover .ss-slide-thumb { border-color: rgba(128,128,128,0.4); transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.15); }
                .ss-slide-item:hover .ss-slide-image { opacity: 1; }
                
                .ss-slide-item.active .ss-slide-thumb { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary), 0 8px 16px rgba(37,99,235,0.3); transform: translateY(-2px); }
                .ss-slide-item.active .ss-slide-image { opacity: 1; }
                .ss-slide-item.keyboard-focus .ss-slide-thumb { box-shadow: 0 0 0 4px var(--warning) !important; border-color: var(--warning) !important; }
                
                .ss-slide-item.inactive .ss-slide-thumb { opacity: 0.4; filter: grayscale(100%); }
                
                .ss-slide-thumb { width: 100%; aspect-ratio: 16/9; background-color: #0f172a; border-radius: 10px; position: relative; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid transparent; transition:0.2s; display:flex; align-items:center; justify-content:center; }
                .ss-slide-image { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition:0.2s; display:block; }
                
                .ss-badge-dur { position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); color:white; padding:2px 6px; border-radius:4px; font-size:0.65rem; font-weight:800; text-transform:uppercase; z-index:2; pointer-events:none; }
                .ss-badge-trans { position:absolute; bottom:6px; left:6px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); color:white; padding:4px; border-radius:4px; display:flex; align-items:center; justify-content:center; z-index:2; pointer-events:none; }
                .ss-badge-cover { position:absolute; top:6px; left:6px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px; font-size:0.6rem; font-weight:800; text-transform:uppercase; z-index:2; pointer-events:none; box-shadow:0 2px 4px rgba(0,0,0,0.3); }
                .ss-badge-type { position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); color:white; padding:4px; border-radius:6px; z-index:2; display:flex; align-items:center; pointer-events:none; }
                
                .ss-slide-info { padding: 6px 4px; display: flex; justify-content: space-between; align-items: center; }
                .ss-slide-title { font-size: 0.75rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color:var(--text-main); }
                .ss-slide-list.view-compact .ss-slide-info, .ss-slide-list.view-grid .ss-slide-info { display: none; }

                .ss-thumb-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; gap:8px; opacity:0; transition:0.2s; z-index:10; border-radius:8px; flex-wrap:wrap; align-content:center; padding:10px; }
                .ss-slide-item:hover .ss-thumb-overlay { opacity: 1; }
                
                .ss-overlay-btn { background:rgba(255,255,255,0.25); backdrop-filter:blur(4px); border:none; color:white; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
                .ss-overlay-btn:hover { background:var(--primary); transform:scale(1.15); box-shadow:0 4px 12px rgba(0,0,0,0.5); }
                .ss-overlay-btn.danger:hover { background:var(--error); }
                .ss-slide-list.view-compact .ss-overlay-btn { width: 28px; height: 28px; }
                .ss-slide-list.view-compact .ss-overlay-btn svg { width: 14px; height: 14px; }
                
                .ss-canvas { flex: 1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px; position: relative; transition: background 0.3s; overflow:hidden; }
                .ss-preview-box { width: 100%; max-width: 1200px; aspect-ratio: 16/9; background: #000; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05); position: relative; overflow: hidden; display:flex; align-items:center; justify-content:center; transition: all 0.3s ease; }
                
                .ss-canvas-watermark { position:absolute; color:rgba(255,255,255,0.9); font-size: clamp(1rem, 3vw, 1.8rem); font-family:'Segoe UI', sans-serif; font-weight:800; z-index:100; text-shadow:0 4px 12px rgba(0,0,0,0.8); pointer-events:none; transition: all 0.3s ease; }
                .ss-canvas-clock { position:absolute; color:white; font-size: clamp(0.9rem, 2vw, 1.5rem); font-weight:700; z-index:100; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); padding:8px 16px; border-radius:12px; pointer-events:none; transition: all 0.3s ease; border:1px solid rgba(255,255,255,0.1); }
                .ss-canvas-radio { position:absolute; color:white; font-size: clamp(0.7rem, 1.5vw, 1rem); font-weight:600; z-index:100; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); padding:6px 12px; border-radius:8px; display:flex; align-items:center; gap:8px; pointer-events:none; transition: all 0.3s ease; border:1px solid rgba(255,255,255,0.1); }

                .ss-rightbar { width: 360px; display:flex; flex-direction:column; border-left: 1px solid rgba(128,128,128,0.15); z-index: 5; background: rgba(128,128,128,0.01); flex-shrink: 0; }
                .ss-tabs-wrapper { padding: 20px 20px 10px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); }
                .ss-tabs { display:flex; background: rgba(128,128,128,0.1); padding: 4px; border-radius: 10px; gap: 2px; }
                .ss-tab { flex:1; display:flex; align-items:center; justify-content:center; gap: 6px; padding: 8px 4px; font-size: 0.75rem; font-weight: 700; cursor:pointer; border-radius: 8px; transition: all 0.25s ease; opacity: 0.6; color: var(--text-main); text-transform: capitalize; letter-spacing: 0.3px; }
                .ss-tab svg { width: 14px; height: 14px; stroke-width: 2.5; }
                .ss-tab:hover { opacity: 0.9; background: rgba(128,128,128,0.05); }
                .ss-tab.active { opacity: 1; background: var(--bg-surface); color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
                
                .ss-prop-content { flex: 1; overflow-y: auto; padding: 20px; }
                
                .ss-form-group { margin-bottom: 20px; }
                .ss-label { display: block; font-size: 0.75rem; font-weight: 800; margin-bottom: 8px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.8px; }
                .ss-select, .ss-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(128,128,128,0.25); background: rgba(128,128,128,0.03); color: inherit; font-size: 0.95rem; font-weight: 500; outline: none; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); appearance: none; }
                .ss-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 40px; }
                .ss-select:focus, .ss-input:focus { border-color: var(--primary); background: transparent; box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }
                .ss-select option, .ss-select optgroup { background: var(--bg-dropdown); color: var(--text-main); }
                
                .ss-visual-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .ss-visual-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
                .ss-visual-card { border-radius: 8px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; overflow: hidden; background: rgba(128,128,128,0.03); border: 2px solid transparent; }
                .ss-visual-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); border-color: rgba(128,128,128,0.3); }
                .ss-visual-card.active { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary), 0 6px 12px rgba(37,99,235,0.2); }
                .ss-card-preview { width: 100%; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; font-weight:800; font-size:1.2rem; }
                .ss-card-label { padding: 6px; width: 100%; text-align: center; font-size: 0.65rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background:rgba(128,128,128,0.02); border-top:1px solid rgba(128,128,128,0.05); }
                
                .ss-focal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; aspect-ratio: 16/9; width: 140px; margin: 12px auto; background: rgba(128,128,128,0.1); padding: 4px; border-radius: 8px; }
                .ss-focal-cell { border-radius: 4px; cursor: pointer; transition: 0.2s; background: rgba(128,128,128,0.1); }
                .ss-focal-cell:hover { background: var(--primary); opacity: 0.7; }
                .ss-focal-cell.active { background: var(--primary); box-shadow: 0 0 0 2px var(--bg-main), 0 0 0 4px var(--primary); }
                
                .ss-accordion { border: 1px solid rgba(128,128,128,0.2); border-radius: 12px; margin-bottom: 12px; overflow: hidden; background: rgba(128,128,128,0.02); transition: all 0.2s; }
                .ss-accordion-header { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: 700; font-size: 0.85rem; user-select: none; transition: background 0.2s; }
                .ss-accordion-header:hover { background: rgba(128,128,128,0.05); }
                .ss-accordion-header svg { transition: transform 0.3s ease; opacity: 0.5; }
                .ss-accordion-content { padding: 0 16px 16px 16px; display: none; animation: ssFadeIn 0.2s ease; }
                .ss-accordion.open .ss-accordion-content { display: block; padding-top: 10px; }
                .ss-accordion.open .ss-accordion-header svg:last-child { transform: rotate(180deg); }
                .ss-accordion.open { border-color: rgba(128,128,128,0.4); background: rgba(128,128,128,0.05); }

                .ss-toggle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .ss-toggle-label { font-size: 0.85rem; font-weight: 600; opacity: 0.9; }
                
                .apple-toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
                .apple-toggle input { opacity: 0; width: 0; height: 0; }
                .apple-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(128,128,128,0.3); transition: .3s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 22px; }
                .apple-toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .apple-toggle input:checked + .apple-toggle-slider { background-color: var(--primary); }
                .apple-toggle input:checked + .apple-toggle-slider:before { transform: translateX(18px); }
                .apple-toggle input:disabled + .apple-toggle-slider { opacity: 0.5; cursor: not-allowed; }

                .ss-btn-primary { background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(37,99,235,0.3); display:flex; align-items:center; justify-content:center; gap:8px; }
                .ss-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,0.4); filter: brightness(1.1); }
                .ss-btn-primary:active { transform: translateY(0); }
                
                .ss-btn-danger { background: transparent; color: var(--error); border: 1px solid var(--error); padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
                .ss-btn-danger:hover { background: rgba(239,68,68,0.1); transform: translateY(-2px); }
                
                .ss-btn-outline { background: transparent; color: var(--text-main); border: 1px solid rgba(128,128,128,0.3); padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
                .ss-btn-outline:hover { background: rgba(128,128,128,0.05); border-color: rgba(128,128,128,0.5); }
                
                .ss-lock-banner { background: linear-gradient(90deg, #f59e0b, #ea580c); color: #fff; padding: 10px; text-align: center; font-size: 0.9rem; font-weight: 700; display: none; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2); letter-spacing: 0.5px; }
                .ss-lock-banner.visible { display: block; animation: ssSlideRight 0.3s ease; }

                /* TIME MACHINE UI */
                .ss-timeline { position: relative; padding-left: 24px; margin-top: 16px; }
                .ss-timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: rgba(128,128,128,0.2); }
                .ss-timeline-node { position: relative; margin-bottom: 24px; animation: ssFadeIn 0.4s ease; }
                .ss-timeline-dot { position: absolute; left: -24px; top: 4px; width: 16px; height: 16px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--primary); z-index: 2; transition: 0.2s; }
                .ss-timeline-dot.pinned { background: var(--warning); border-color: var(--warning); box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
                .ss-timeline-dot.auto { border-color: var(--success); }
                .ss-timeline-content { background: rgba(128,128,128,0.03); border: 1px solid rgba(128,128,128,0.1); border-radius: 12px; padding: 12px; display: flex; gap: 12px; transition: 0.2s; }
                .ss-timeline-content:hover { background: rgba(128,128,128,0.06); border-color: rgba(128,128,128,0.3); transform: translateX(2px); }
                
                .ss-timeline-cover { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; background: #000; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
                .ss-timeline-info { flex: 1; min-width: 0; display:flex; flex-direction:column; justify-content:center; }
                .ss-timeline-title { font-weight: 800; font-size: 0.9rem; color: var(--text-main); display: flex; justify-content: space-between; align-items:center; }
                .ss-timeline-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display:flex; gap:8px; align-items:center; }
                
                .ss-pin-btn { background: none; border: none; cursor: pointer; opacity: 0.3; transition: 0.2s; color: var(--text-main); padding: 0; display:flex; align-items:center; }
                .ss-pin-btn:hover { opacity: 0.8; transform: scale(1.2); }
                .ss-pin-btn.active { opacity: 1; color: var(--warning); }
                
                .ss-btn-hold { position: relative; background: rgba(128,128,128,0.1); border: 1px solid rgba(128,128,128,0.2); color: var(--text-main); padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; cursor: pointer; overflow: hidden; margin-top: 8px; width: 100%; user-select: none; -webkit-user-select: none; transition: 0.2s; }
                .ss-btn-hold-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: rgba(239, 68, 68, 0.2); z-index: 0; transition: width 0.1s linear; }
                .ss-btn-hold span { position: relative; z-index: 1; pointer-events: none; display:flex; align-items:center; justify-content:center; gap:6px; }
                .ss-btn-hold.holding { border-color: var(--error); transform: scale(0.98); }
                .ss-btn-hold.holding .ss-btn-hold-fill { width: 100%; transition: width 2s linear; background: rgba(239, 68, 68, 0.8); }
                .ss-btn-hold.holding span { color: white; }
                
                .ss-scanner-flash { position: fixed; inset: 0; background: rgba(37, 99, 235, 0.1); z-index: 999999; pointer-events: none; opacity: 0; border-top: 2px solid var(--primary); box-shadow: 0 -10px 30px rgba(37,99,235,0.5); }
                @keyframes flashScan { 0% { top: 0; bottom: 100%; opacity: 1; } 50% { opacity: 1; } 100% { top: 100%; bottom: 0; opacity: 0; } }
                .ss-scanner-active { animation: flashScan 1.2s ease-in-out forwards; }
                
                .ss-skeleton { background: linear-gradient(90deg, rgba(128,128,128,0.05) 25%, rgba(128,128,128,0.15) 50%, rgba(128,128,128,0.05) 75%); background-size: 200% 100%; animation: ssSkeletonPulse 1.5s infinite; border-radius: 4px; }
                @keyframes ssSkeletonPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

                .ss-snap-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.8); backdrop-filter:blur(8px); z-index:100050; display:flex; align-items:center; justify-content:center; opacity:0; visibility:hidden; transition:0.3s; }
                .ss-snap-modal-overlay.visible { opacity:1; visibility:visible; }
                .ss-snap-modal { width:400px; background:var(--bg-surface); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; box-shadow:0 20px 40px rgba(0,0,0,0.5); transform:scale(0.95); transition:0.3s; color:var(--text-main); }
                .ss-snap-modal-overlay.visible .ss-snap-modal { transform:scale(1); }

                /* FASE 3: Layout Switcher Tooltip */
                .ss-tooltip-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
                .ss-delay-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%) translateY(10px); background: rgba(15,23,42,0.95); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; pointer-events: none; opacity: 0; visibility: hidden; transition: all 0.2s 0.6s; z-index: 1000; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-weight:600; }
                .ss-tooltip-wrapper:hover .ss-delay-tooltip { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(5px); }
            `;
            document.head.appendChild(style);
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('slideshow:open_editor', (id) => this.open(id));
                window.EventBus.on('slideshow:refresh_data', () => {
                    if(this.loadData) this.loadData(true);
                });

                window.EventBus.on('editor:undo', () => {
                    if(this.undo) this.undo();
                });
                window.EventBus.on('editor:redo', () => {
                    if(this.redo) this.redo();
                });
                window.EventBus.on('editor:force_save', () => {
                    if (this.pendingDeltaItems.size > 0 || this.isDirty) {
                        clearTimeout(this.saveTimeout);
                        if(this.performSave) this.performSave("Handmatig opgeslagen");
                    }
                });
            }

            // FASE 3 FIX: Deselecteren als je in de lege ruimte van de zijbalk klikt
            document.addEventListener('click', (e) => {
                const overlay = document.getElementById('ss-editor-overlay');
                if (!overlay || !overlay.classList.contains('visible')) return;

                const sidebar = document.getElementById('ss-sidebar-container');
                if (sidebar && sidebar.contains(e.target)) {
                    if (!e.target.closest('.ss-slide-item') && !e.target.closest('button') && !e.target.closest('select')) {
                        if (this.selectedIndices.length > 0) {
                            this.selectedIndices = [];
                            this.lastClickedIndex = -1;
                            if (this.renderSidebar) this.renderSidebar();
                            if (this.renderPreview) this.renderPreview();
                            if (this.activeTab === 'properties' && this.renderProperties) this.renderProperties();
                        }
                    }
                }
            });

            // FASE 3 FIX: Globale Toetsenbord Navigatie (Pijltjes, Ctrl+A, Delete)
            document.addEventListener('keydown', (e) => {
                const overlay = document.getElementById('ss-editor-overlay');
                if (!overlay || !overlay.classList.contains('visible')) return;
                
                const ignoreTags = ['INPUT', 'TEXTAREA', 'SELECT'];
                if (ignoreTags.includes(e.target.tagName)) return;

                if (e.key === 'Escape') {
                    const linkOverlay = document.getElementById('ss-link-overlay');
                    const linkModalOverlay = document.getElementById('ss-link-modal-overlay');
                    const snapOverlay = document.getElementById('ss-snap-modal-overlay');
                    const diffOverlay = document.getElementById('ss-diff-modal-overlay');
                    
                    if (diffOverlay && diffOverlay.classList.contains('visible')) {
                        diffOverlay.classList.remove('visible');
                        setTimeout(() => diffOverlay.remove(), 300);
                        return;
                    }
                    if (snapOverlay && snapOverlay.classList.contains('visible')) {
                        snapOverlay.classList.remove('visible');
                        setTimeout(() => snapOverlay.remove(), 300);
                        return;
                    }
                    if (linkModalOverlay && linkModalOverlay.style.opacity === '1') {
                        return;
                    }
                    if (overlay.classList.contains('visible') && (!linkOverlay || !linkOverlay.classList.contains('visible'))) {
                        this.close();
                    }
                    return;
                }

                // Alles Selecteren
                if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (this.data && this.data.items && this.data.items.length > 0) {
                        this.selectedIndices = this.data.items.map((_, i) => i);
                        if (this.renderSidebar) this.renderSidebar();
                        if (this.renderPreview) this.renderPreview();
                        if (this.activeTab === 'properties' && this.renderProperties) this.renderProperties();
                        this.showSnack("Alle dia's geselecteerd");
                    }
                    return;
                }

                // Verwijderen
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    if (this.selectedIndices.length > 0 && !this.isReadOnly) {
                        this.handleKeyboardDelete();
                    }
                    return;
                }

                // Pijltjestoetsen
                if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.navigateSelection(-1, e.shiftKey);
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.navigateSelection(1, e.shiftKey);
                }
            });

            document.addEventListener('mousemove', (e) => {
                this.mouse.x = Math.round((e.clientX / window.innerWidth) * 100);
                this.mouse.y = Math.round((e.clientY / window.innerHeight) * 100);
            });
        }

        async open(id) {
            this.slideshowId = id;
            this.data = null;
            this.isReadOnly = false;
            this.pendingDeltaItems.clear();
            this.selectedIndices = [];
            this.lastClickedIndex = -1;
            this.clipboardItem = null;

            this.history = [];
            this.historyStep = -1;
            this.isDirty = false;

            if(this.createOverlay) this.createOverlay();
            
            const container = document.getElementById('ss-editor-workspace');
            if (container) container.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px;"><div style="width:40px; height:40px; border:4px solid rgba(37,99,235,0.2); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite;"></div><p style="font-weight:600; color:var(--text-muted);">Slideshow gegevens laden...</p></div>`;

            if(this.loadData) await this.loadData();
        }

        // FASE 3: Snack Notificatie Helper (Voor Undo/Redo & Sneltoetsen feedback)
        showSnack(message) {
            let snack = document.getElementById('ss-snack-toast');
            if (!snack) {
                snack = document.createElement('div');
                snack.id = 'ss-snack-toast';
                snack.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(100px); background:var(--primary); color:white; padding:8px 16px; border-radius:20px; font-size:0.85rem; font-weight:700; z-index:1000000; opacity:0; transition:all 0.3s cubic-bezier(0.25, 1, 0.5, 1); box-shadow:0 10px 25px rgba(37,99,235,0.4); pointer-events:none;';
                document.body.appendChild(snack);
            }
            snack.innerText = message;
            snack.style.transform = 'translateX(-50%) translateY(0)';
            snack.style.opacity = '1';
            
            clearTimeout(this.snackTimer);
            this.snackTimer = setTimeout(() => {
                snack.style.transform = 'translateX(-50%) translateY(100px)';
                snack.style.opacity = '0';
            }, 2500);
        }

        // FASE 3: Navigatie Logica via Toetsenbord
        navigateSelection(direction, shiftKey) {
            if (!this.data || !this.data.items || this.data.items.length === 0) return;
            
            let nextIdx = 0;
            if (this.selectedIndices.length > 0) {
                const current = this.lastClickedIndex !== -1 ? this.lastClickedIndex : this.selectedIndices[0];
                nextIdx = current + direction;
                if (nextIdx < 0) nextIdx = 0;
                if (nextIdx >= this.data.items.length) nextIdx = this.data.items.length - 1;
            }
            
            if (shiftKey && this.lastClickedIndex !== -1) {
                const start = Math.min(this.lastClickedIndex, nextIdx);
                const end = Math.max(this.lastClickedIndex, nextIdx);
                this.selectedIndices = [];
                for (let i = start; i <= end; i++) this.selectedIndices.push(i);
            } else {
                this.selectedIndices = [nextIdx];
                this.lastClickedIndex = nextIdx;
            }
            
            if (this.renderSidebar) this.renderSidebar();
            if (this.renderPreview) this.renderPreview();
            if (this.activeTab === 'properties' && this.renderProperties) this.renderProperties();

            // Focus ring & scroll
            const list = document.getElementById('ss-slide-list');
            if (list) {
                list.querySelectorAll('.ss-slide-item').forEach(el => el.classList.remove('keyboard-focus'));
                const el = list.querySelector(`.ss-slide-item[data-index="${nextIdx}"]`);
                if (el) {
                    el.classList.add('keyboard-focus');
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        // FASE 3: Verwijderen via Sneltoets
        async handleKeyboardDelete() {
            if (!window.ModalService || this.selectedIndices.length === 0) return;
            const count = this.selectedIndices.length;
            const conf = await window.ModalService.confirm(
                'Dia(s) Verwijderen', 
                `Weet je zeker dat je ${count} dia('s) uit de presentatie wilt verwijderen?`, 
                { danger: true, yesText: 'Verwijderen' }
            );
            
            if (conf) {
                // Sorteer van hoog naar laag om array shift problemen te voorkomen
                const sortedIndices = [...this.selectedIndices].sort((a,b) => b - a);
                const idsToRemove = [];
                
                // Voeg krimp-animatie toe
                sortedIndices.forEach(idx => {
                    const item = this.data.items[idx];
                    if (item && item.id) idsToRemove.push(item.id);
                    const el = document.querySelector(`.ss-slide-item[data-index="${idx}"]`);
                    if (el) el.classList.add('removing');
                });

                setTimeout(() => {
                    if (idsToRemove.length > 0 && this.removeMultipleSlides) {
                        this.removeMultipleSlides(idsToRemove);
                    } else if (idsToRemove.length === 1 && this.removeSlide) {
                        this.removeSlide(idsToRemove[0], sortedIndices[0]);
                    }
                }, 300); // Wacht op animatie
            }
        }
        
        // Helper voor multi-delete
        async removeMultipleSlides(itemIds) {
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                const res = await fetch('/api/slideshow/editor/removeItems', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slideshow_id: this.slideshowId, item_ids: itemIds, csrf_token: csrfData.csrf_token })
                });
                if (res.ok) {
                    this.data.items = this.data.items.filter(i => !itemIds.includes(i.id));
                    itemIds.forEach(id => this.pendingDeltaItems.delete(id));
                    this.selectedIndices = this.data.items.length > 0 ? [0] : [];
                    if (this.renderSidebar) this.renderSidebar();
                    if (this.renderPreview) this.renderPreview();
                    if (this.renderProperties) this.renderProperties();
                    this.showSnack(`${itemIds.length} dia('s) verwijderd.`);
                }
            } catch(e) {}
        }

        // FASE 3: Layout Toggle Logica
        toggleEditorLayout() {
            const current = (this.data && this.data.slideshow.editor_layout) ? this.data.slideshow.editor_layout : 'classic';
            const next = current === 'classic' ? 'ribbon' : 'classic';
            
            if (this.data) {
                this.data.slideshow.editor_layout = next;
                if (this.triggerAutoSave) this.triggerAutoSave("Werkruimte weergave gewijzigd.");
            }
            
            const toggleIcon = document.getElementById('ss-layout-toggle');
            if (toggleIcon) {
                if (next === 'ribbon') {
                    toggleIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="6" rx="1"></rect><rect x="3" y="11" width="18" height="10" rx="1" opacity="0.4"></rect></svg>`;
                } else {
                    toggleIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="15" y="3" width="6" height="18" rx="1"></rect><rect x="3" y="3" width="10" height="18" rx="1" opacity="0.4"></rect></svg>`;
                }
            }
            
            if (window.App && window.App.layoutManager) {
                window.App.layoutManager.applyLayout(next);
            }
        }

        createOverlay() {
            let overlay = document.getElementById('ss-editor-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'ss-editor-overlay';
                overlay.className = 'ss-editor-overlay';
                document.body.appendChild(overlay);
            }
            
            // FASE 3 FIX: Switcher knop en Layout Setup
            overlay.innerHTML = `
                <div class="ss-editor-modal theme-light ss-panel" id="ss-editor-modal">
                    <div id="ss-lock-banner" class="ss-lock-banner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Let op: Iemand anders bewerkt deze slideshow. Je kunt nu alleen kijken (Alleen-lezen).
                    </div>
                    <div class="ss-editor-header">
                        <div style="display:flex; align-items:center; gap:20px;">
                            <button class="btn-icon-small ss-close-btn" title="Sluiten (Esc)" style="background:rgba(128,128,128,0.1); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='var(--error)'; this.style.color='white';" onmouseout="this.style.background='rgba(128,128,128,0.1)'; this.style.color='inherit';">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <div style="width:1px; height:24px; background:rgba(128,128,128,0.3);"></div>
                            <input type="text" id="ss-title-input" class="ss-title-input" placeholder="Naamloos...">
                        </div>
                        <div style="display:flex; align-items:center; gap:16px;">
                            <button id="btn-editor-undo" class="btn-icon-small" title="Ongedaan maken (Ctrl+Z)" style="color:var(--text-main); transition:0.2s; opacity:0.3; cursor:default;" disabled>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
                            </button>
                            <button id="btn-editor-redo" class="btn-icon-small" title="Opnieuw toepassen (Ctrl+Y)" style="color:var(--text-main); transition:0.2s; margin-right:8px; opacity:0.3; cursor:default;" disabled>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
                            </button>
                            
                            <div id="ss-save-status" class="ss-cloud-sync saved">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                <span>Opgeslagen</span>
                            </div>
                            <div style="width:1px; height:24px; background:rgba(128,128,128,0.3);"></div>
                            
                            <div class="ss-tooltip-wrapper">
                                <button id="ss-layout-toggle" class="btn-icon-small" style="color:var(--text-main); transition:0.2s; background:transparent; border:none; cursor:pointer;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="15" y="3" width="6" height="18" rx="1"></rect><rect x="3" y="3" width="10" height="18" rx="1" opacity="0.4"></rect></svg>
                                </button>
                                <div class="ss-delay-tooltip">Wissel Weergave (Zijbalk / Ribbon)</div>
                            </div>
                            
                            <button id="ss-theme-toggle" title="Wissel Thema" style="background:transparent; border:none; cursor:pointer; font-size:1.2rem; transition:0.2s; display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            </button>
                            
                            <button id="ss-play-btn" class="ss-btn-primary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> 
                                Presenteren
                            </button>
                        </div>
                    </div>
                    <div class="ss-editor-workspace" id="ss-editor-workspace"></div>
                </div>
            `;
            
            setTimeout(() => overlay.classList.add('visible'), 10);

            overlay.querySelector('.ss-close-btn').onclick = () => this.close();
            overlay.querySelector('#ss-theme-toggle').onclick = () => { if(this.toggleTheme) this.toggleTheme(); };
            overlay.querySelector('#ss-layout-toggle').onclick = () => this.toggleEditorLayout();

            overlay.querySelector('#ss-play-btn').onclick = () => {
                if(this.data && this.data.slideshow.uuid) window.open(`/play/${this.data.slideshow.uuid}`, '_blank');
            };
            
            overlay.querySelector('#btn-editor-undo').onclick = () => { if(this.undo) this.undo(); };
            overlay.querySelector('#btn-editor-redo').onclick = () => { if(this.redo) this.redo(); };

            const titleInput = overlay.querySelector('#ss-title-input');
            titleInput.oninput = () => {
                if (this.data) this.data.slideshow.title = titleInput.value;
                if(this.triggerAutoSave) this.triggerAutoSave("Titel van slideshow gewijzigd.");
            };
        }

        close() {
            if (this.pendingDeltaItems.size > 0 || this.isDirty) {
                clearTimeout(this.saveTimeout);
                if(this.performSave) this.performSave("Sessie gesloten");
            }
            
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
            const cursors = document.getElementById('ss-cursors-layer');
            if (cursors) cursors.remove();
            const collabs = document.getElementById('ss-collaborators');
            if (collabs) collabs.remove();

            if (!this.isReadOnly && this.slideshowId) {
                fetch('/api/slideshow/editor/unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slideshow_id: this.slideshowId })
                }).catch(() => {});
            }
            
            const overlay = document.getElementById('ss-editor-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(1.02)';
                setTimeout(() => overlay.remove(), 400);
            }
            
            if (window.EventBus) window.EventBus.emit('slideshow:refresh_overview');
            this.slideshowId = null;
            this.data = null;
        }
    }

    // Expose Global Class
    window.EditorCore = EditorCore;
    window.App = window.App || {};
    
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.App.slideshowEditor) window.App.slideshowEditor = new window.EditorCore();
    });
})();