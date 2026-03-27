// Pad: public/js/modules/slideshow/EditorLayoutRibbon.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorLayoutRibbon.js */

(function() {
    if (!window.EditorCore) return;

    const style = document.createElement('style');
    style.id = 'slideshow-ribbon-styles';
    style.innerHTML = `
        .layout-ribbon {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: var(--bg-body);
        }
        .layout-ribbon .ss-editor-header {
            flex-shrink: 0;
        }
        .layout-ribbon .ss-editor-workspace {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 60px);
        }
        .layout-ribbon .ss-canvas {
            flex: 1;
            height: auto;
            order: 2;
            position: relative;
            overflow: hidden;
        }
        .layout-ribbon .ss-sidebar {
            display: none; /* Focus mode: linker zijbalk verbergen in Ribbon layout */
        }
        .layout-ribbon .ss-rightbar {
            order: 1;
            width: 100%;
            height: auto;
            flex-shrink: 0;
            border-left: none;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            background: var(--bg-surface);
            z-index: 10;
        }
        .layout-ribbon .ss-tabs-wrapper {
            border-bottom: 1px solid var(--border-color);
            padding: 0 10px;
            display: flex;
            align-items: flex-end;
            background: var(--bg-surface);
        }
        .layout-ribbon .ss-tabs {
            display: flex;
            gap: 2px;
        }
        .layout-ribbon .ss-tab {
            padding: 8px 16px;
            background: transparent;
            border: 1px solid transparent;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            margin-bottom: -1px;
            cursor: pointer;
            color: var(--text-muted);
            font-size: 0.85rem;
            transition: 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .layout-ribbon .ss-tab:hover {
            color: var(--text-main);
            background: rgba(128,128,128,0.05);
        }
        .layout-ribbon .ss-tab.active {
            background: var(--bg-main);
            border-color: var(--border-color);
            border-bottom-color: var(--bg-main);
            font-weight: 600;
            color: var(--primary);
        }
        .layout-ribbon .ss-prop-content {
            padding: 0;
            overflow: visible;
            background: var(--bg-main);
        }

        /* FIX BUG 12: Ribbon Bar Container met Flex-Wrap (Nooit meer scrollbalken) */
        .ms-ribbon-bar {
            display: flex;
            flex-wrap: wrap; 
            gap: 8px;
            padding: 8px 12px;
            background: var(--bg-main);
            min-height: 90px;
            align-items: stretch;
            border-bottom: 1px solid var(--border-color);
            box-shadow: 0 4px 6px -4px rgba(0,0,0,0.05);
        }

        /* Ribbon Groups */
        .ms-ribbon-group {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-right: 1px solid rgba(128,128,128,0.2);
            padding-right: 12px;
            margin-right: 4px;
        }
        .ms-ribbon-group:last-child {
            border-right: none;
            padding-right: 0;
            margin-right: 0;
        }

        .ms-ribbon-content {
            display: flex;
            flex: 1;
            gap: 8px;
            align-items: center;
        }

        .ms-ribbon-label {
            font-size: 10px;
            color: var(--text-muted);
            text-align: center;
            margin-top: 6px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        /* UI Elements inside Ribbon */
        .ms-gallery {
            display: flex;
            gap: 4px;
            background: rgba(128,128,128,0.05);
            padding: 4px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.1);
        }
        .ms-gallery-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid transparent;
            min-width: 44px;
            transition: 0.2s;
        }
        .ms-gallery-item:hover {
            background: rgba(128,128,128,0.1);
        }
        .ms-gallery-item.active {
            background: rgba(37,99,235,0.1);
            border-color: rgba(37,99,235,0.3);
            color: var(--primary);
        }
        .ms-gallery-item .preview {
            width: 28px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 2px;
        }
        .ms-gallery-item .lbl {
            font-size: 9px;
            margin-top: 6px;
            font-weight: 700;
            white-space: nowrap;
        }

        .ms-stack {
            display: flex;
            flex-direction: column;
            gap: 6px;
            justify-content: center;
        }
        
        .ms-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--text-main);
        }
        .ms-row label {
            min-width: 60px;
            font-weight: 500;
            color: var(--text-muted);
        }
        
        .ms-input, .ms-select {
            font-size: 11px;
            padding: 4px 6px;
            border: 1px solid rgba(128,128,128,0.2);
            border-radius: 4px;
            background: var(--bg-surface);
            color: var(--text-main);
            height: 24px;
            outline: none;
            transition: border-color 0.2s;
        }
        .ms-input:focus, .ms-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
        }
        
        .ms-check-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            cursor: pointer;
            color: var(--text-main);
            transition: 0.2s;
            padding: 2px 4px;
            border-radius: 4px;
        }
        .ms-check-row:hover {
            background: rgba(128,128,128,0.1);
        }
        .ms-check-row input[type="checkbox"] {
            margin: 0;
            cursor: pointer;
            width: 14px;
            height: 14px;
            accent-color: var(--primary);
        }

        .ms-btn-small {
            background: var(--bg-surface);
            border: 1px solid rgba(128,128,128,0.2);
            color: var(--text-main);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 24px;
        }
        .ms-btn-small:hover {
            background: rgba(128,128,128,0.1);
            border-color: rgba(128,128,128,0.4);
        }
        .ms-btn-small.primary {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .ms-btn-small.primary:hover {
            background: #1d4ed8;
            border-color: #1d4ed8;
        }

        .ms-btn-large {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 1px solid transparent;
            color: var(--text-main);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            height: 100%;
            min-height: 60px;
            gap: 6px;
            transition: 0.2s;
        }
        .ms-btn-large:hover {
            background: rgba(128,128,128,0.1);
        }
        .ms-btn-large svg {
            width: 24px;
            height: 24px;
            color: var(--primary);
        }
        .ms-btn-large span {
            font-size: 11px;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
})();