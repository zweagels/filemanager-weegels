/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/MasonryLayout.js */

(function() {
    class MasonryLayout {
        constructor() {
            this.renderTimeout = null;
            this.container = null;
            this.injectStyles();
        }

        injectStyles() {
            if (document.getElementById('masonry-dynamic-fixes')) return;
            const style = document.createElement('style');
            style.id = 'masonry-dynamic-fixes';
            style.innerHTML = `
                /* DE ULTIEME PINTEREST FIX */
                .masonry-wrapper {
                    column-width: var(--zoom-level, 220px);
                    column-gap: 20px;
                    padding: 10px;
                    width: 100%;
                }
                .masonry-wrapper .grid-tile {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    -webkit-column-break-inside: avoid !important;
                    display: inline-block; /* Cruciaal voor CSS columns in plaats van flex */
                    width: 100%;
                    margin-bottom: 20px;
                    aspect-ratio: auto !important;
                    height: auto !important;
                    min-height: 50px;
                    background: var(--bg-surface);
                    border: 1px solid var(--border-dropdown);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                .masonry-wrapper .grid-tile .tile-visual {
                    height: auto !important;
                    display: block;
                    padding: 0;
                    margin: 0;
                }
                .masonry-wrapper .grid-tile .tile-visual img {
                    width: 100% !important;
                    height: auto !important; /* Vloeibare hoogte, geen vervorming */
                    object-fit: contain !important; /* Behoudt originele ratio in Pinterest stijl */
                    display: block;
                    border-radius: 12px 12px 0 0;
                }
                .masonry-wrapper .grid-tile .tile-info {
                    padding: 12px;
                    background: var(--bg-surface);
                    height: auto !important;
                    border-top: 1px solid rgba(128,128,128,0.05);
                }
            `;
            document.head.appendChild(style);
        }

        render(container, data, zoom) {
            this.container = container;

            clearTimeout(this.renderTimeout);

            // Timeout zorgt ervoor dat hidden modals (zoals de album cover kiezer) 
            // eerst kunnen renderen in de DOM voordat Masonry de breedtes berekent.
            this.renderTimeout = setTimeout(() => {
                this.executeRender(container, data, zoom);
                this.container.style.opacity = '1'; 
                this.renderTimeout = null;
            }, 10);
        }

        executeRender(container, data, zoom) {
            if (!container) return;
            container.innerHTML = '';
            document.documentElement.style.setProperty('--zoom-level', `${zoom}px`);

            const fragment = document.createDocumentFragment();
            const wrapper = document.createElement('div');
            wrapper.className = 'masonry-wrapper';

            const items = [...(data.folders || []), ...(data.files || [])];

            items.forEach(item => {
                const type = item.mime_type ? 'file' : 'folder';
                let tileNode = null;

                try {
                    if (window.App && window.App.tileBuilder) {
                        const htmlStr = window.App.tileBuilder.build(item, false);
                        if (htmlStr) {
                            const temp = document.createElement('div');
                            temp.innerHTML = htmlStr.trim();
                            tileNode = temp.firstChild;
                            // Reset hardcoded heights uit grid view
                            tileNode.style.height = 'auto';
                            tileNode.style.aspectRatio = 'auto';
                        }
                    }
                } catch (e) {
                    console.error("TileBuilder error in MasonryLayout:", e);
                }

                if (!tileNode) {
                    tileNode = document.createElement('div');
                    tileNode.className = `grid-tile type-${type}`;
                    tileNode.dataset.id = item.id;
                    tileNode.dataset.type = type;
                    tileNode.innerHTML = `<div class="tile-info"><div class="tile-name">${item.name || item.original_name}</div></div>`;
                }

                wrapper.appendChild(tileNode);

                if (window.App && window.App.renderEngine && !item.isBackTile) {
                    window.App.renderEngine.attachInteractionEvents(tileNode, item, type);
                }
            });

            fragment.appendChild(wrapper);
            container.appendChild(fragment);

            if (window.App && window.App.imageLoader) {
                window.App.imageLoader.startQueue(container);
            }
        }
    }

    window.App = window.App || {};
    window.App.masonryLayout = new MasonryLayout();
})();