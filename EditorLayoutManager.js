// Pad: public/js/modules/slideshow/EditorLayoutManager.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorLayoutManager.js */

(function() {
    if (!window.EditorCore) return;

    class EditorLayoutManager {
        constructor() {
            this.currentLayout = 'classic';
            this.workspace = null;
            this.injectStyles();
        }

        injectStyles() {
            if (document.getElementById('ss-layout-transitions')) return;
            const style = document.createElement('style');
            style.id = 'ss-layout-transitions';
            style.innerHTML = `
                /* FASE 3: Zachte Transities voor de Sidebar en Layout */
                .ss-sidebar {
                    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease;
                }
                .ss-canvas {
                    transition: flex 0.4s cubic-bezier(0.25, 1, 0.5, 1), width 0.4s;
                }
                .ss-rightbar {
                    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s;
                }
            `;
            document.head.appendChild(style);
        }

        applyLayout(layout) {
            this.currentLayout = layout;
            this.workspace = document.getElementById('ss-editor-workspace');
            if (!this.workspace) return;
            
            if (layout === 'ribbon') {
                this.workspace.classList.add('layout-ribbon');
            } else {
                this.workspace.classList.remove('layout-ribbon');
            }
            
            this.updateSidebarWidth();
            
            if (window.App && window.App.slideshowEditor && window.App.slideshowEditor.renderProperties) {
                setTimeout(() => window.App.slideshowEditor.renderProperties(), 50);
            }
        }

        updateSidebarWidth() {
            if (!this.workspace) return;
            const sidebar = document.getElementById('ss-sidebar-container');
            if (sidebar) {
                let width = '380px';
                if (sidebar.classList.contains('size-list')) width = '340px';
                if (sidebar.classList.contains('size-compact')) width = '440px';
                this.workspace.style.setProperty('--current-sidebar-width', width);
            }
        }
    }
    
    window.App = window.App || {};
    
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.App.layoutManager) {
            window.App.layoutManager = new EditorLayoutManager();
        }
    });

    const originalRender = window.EditorCore.prototype.render;
    window.EditorCore.prototype.render = function() {
        if (originalRender) originalRender.apply(this, arguments);
        if (window.App.layoutManager && this.data && this.data.slideshow) {
            window.App.layoutManager.applyLayout(this.data.slideshow.editor_layout || 'classic');
        }
    };

    const originalSetSetting = window.EditorCore.prototype.setSetting;
    window.EditorCore.prototype.setSetting = function(key, val) {
        if (originalSetSetting) originalSetSetting.apply(this, arguments);
        if (key === 'sidebar_size' && window.App.layoutManager) {
            window.App.layoutManager.updateSidebarWidth();
        }
    };
})();