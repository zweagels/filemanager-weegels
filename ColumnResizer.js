/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/ColumnResizer.js */

(function() {
    class ColumnResizer {
        constructor() {
            this.isResizing = false;
            this.currentHeader = null;
            this.currentHandle = null;
            this.startX = 0;
            this.startWidth = 0;
            this.colName = '';
            this.container = null;

            // Luister naar de EventBus: Zodra Render.js klaar is met tekenen, plakken we de drag-handles erop.
            if (window.EventBus) {
                window.EventBus.on('render:complete', () => this.initHandles());
            }

            // Bindings zodat 'this' niet breekt tijdens muis events
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
        }

        initHandles() {
            this.container = document.querySelector('.view-list');
            if (!this.container) return; // We zijn niet in de lijst-weergave, doe niets.

            const headerRow = this.container.querySelector('.list-header');
            if (!headerRow) return;

            // Haal de kolommen op (Icon, Naam, Datum, Grootte, Type)
            const cols = headerRow.children;
            
            // Loop door de kolommen, sla de eerste (Icon) en de laatste (Type/Menu) over.
            for (let i = 1; i < cols.length - 1; i++) {
                const col = cols[i];
                
                // Koppel de juiste CSS variabele uit list.css aan de kolom
                let cssVar = '';
                if (i === 1) cssVar = '--col-name';
                else if (i === 2) cssVar = '--col-date';
                else if (i === 3) cssVar = '--col-size';

                // Voeg de sleep-hendel toe als deze nog niet bestaat
                if (cssVar && !col.querySelector('.resizer-handle')) {
                    col.style.position = 'relative'; // Nodig om de hendel absoluut te positioneren
                    
                    const handle = document.createElement('div');
                    handle.className = 'resizer-handle';
                    // Inline css voor de functionaliteit van de hendel, past geen globale stijlen aan
                    handle.style.cssText = 'position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 10;';
                    
                    // Visuele feedback bij hoveren (Kleur: primary blue)
                    handle.addEventListener('mouseenter', () => {
                        if (!this.isResizing) handle.style.background = 'var(--primary)';
                    });
                    handle.addEventListener('mouseleave', () => {
                        if (!this.isResizing) handle.style.background = 'transparent';
                    });

                    // Start het slepen
                    handle.addEventListener('mousedown', (e) => this.onMouseDown(e, col, cssVar, handle));
                    
                    col.appendChild(handle);
                }
            }
        }

        onMouseDown(e, colElement, cssVar, handleElement) {
            e.preventDefault();
            e.stopPropagation();
            
            this.isResizing = true;
            this.currentHeader = colElement;
            this.colName = cssVar;
            this.startX = e.pageX;
            this.startWidth = colElement.offsetWidth;
            this.currentHandle = handleElement;

            // Houd de hendel blauw tijdens het slepen en verander de muis
            this.currentHandle.style.background = 'var(--primary)';
            document.body.style.cursor = 'col-resize';

            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        }

        onMouseMove(e) {
            if (!this.isResizing) return;
            
            // Bereken het verschil in pixels
            const dx = e.pageX - this.startX;
            const newWidth = Math.max(80, this.startWidth + dx); // Minimale breedte van 80px om bugs te voorkomen

            // Update de CSS variabele direct op de container. list.css regelt de rest!
            if (this.container) {
                this.container.style.setProperty(this.colName, `${newWidth}px`);
            }
        }

        onMouseUp(e) {
            if (!this.isResizing) return;
            this.isResizing = false;
            
            // Reset visuele staten
            if (this.currentHandle) {
                this.currentHandle.style.background = 'transparent';
            }
            document.body.style.cursor = '';

            // Verwijder tijdelijke event listeners
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('mouseup', this.onMouseUp);

            this.currentHeader = null;
            this.currentHandle = null;
            this.colName = '';
        }
    }

    // Registreer in de globale namespace
    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.columnResizer = new ColumnResizer();
    });
})();