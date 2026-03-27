/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: public/js/core/EventBus.js */

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Luister naar een event
     * @param {string} event - Naam van het event (bv. 'folder:selected')
     * @param {function} callback - Functie die uitgevoerd moet worden
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Stop met luisteren
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Vuur een event af
     * @param {string} event - Naam van het event
     * @param {any} data - Data om mee te sturen
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
}

// Maak globaal beschikbaar
window.EventBus = new EventBus();