/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/ViewState.js */

class ViewState {
    constructor() {
        this.storageKey = 'fm_view_states';
        this.globalZoomKey = 'fm_global_zoom';
        this.defaultViewKey = 'fm_default_view';
        
        // Laad opgeslagen instellingen of gebruik standaarden
        this.states = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        this.globalZoom = parseInt(localStorage.getItem(this.globalZoomKey) || '150', 10);
        this.defaultView = localStorage.getItem(this.defaultViewKey) || 'grid';
    }

    /**
     * Haal de weergave op voor een specifieke map, tag of album
     */
    get(contextKey) {
        if (this.states[contextKey]) {
            return this.states[contextKey];
        }
        return { view: this.defaultView, zoom: this.globalZoom };
    }

    /**
     * Sla de weergave (Grid/List/Masonry) en zoom op
     */
    set(contextKey, viewStr, zoomInt) {
        if (!this.states[contextKey]) {
            this.states[contextKey] = { view: this.defaultView, zoom: this.globalZoom };
        }
        
        if (viewStr !== undefined && viewStr !== null) {
            this.states[contextKey].view = viewStr;
            this.defaultView = viewStr;
            localStorage.setItem(this.defaultViewKey, viewStr);
        }
        
        if (zoomInt !== undefined && zoomInt !== null) {
            this.states[contextKey].zoom = zoomInt;
            this.globalZoom = zoomInt;
            localStorage.setItem(this.globalZoomKey, zoomInt);
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(this.states));
    }

    /**
     * Pas de zoom globaal aan (voor de slider in de toolbar)
     */
    setGlobalZoom(zoomInt) {
        this.globalZoom = zoomInt;
        localStorage.setItem(this.globalZoomKey, zoomInt);
        
        // Update alle reeds opgeslagen mappen naar de nieuwe zoom-waarde
        for (let key in this.states) {
            this.states[key].zoom = zoomInt;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(this.states));
    }
}

// Global exposure zodat de Toolbar en Render engine erbij kunnen
window.ViewState = new ViewState();