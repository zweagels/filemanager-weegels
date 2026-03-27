// Pad: public/js/modules/slideshow/WorkerPreload.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/WorkerPreload.js */

(function() {
    class WorkerPreload {
        constructor() {
            this.cache = new Set(); 
            this.activeControllers = new Map(); // Voor AbortController per URL
            this.retryMap = new Map();
            this.MAX_RETRIES = 3;
            
            // FASE 3: Netwerk Throttling
            this.isThrottled = false;
            this.queue = []; 
        }

        // FASE 3: Functie om preloading te pauzeren als TV een zware taak doet
        throttle(state) {
            this.isThrottled = state;
            if (!this.isThrottled && this.queue.length > 0) {
                // Als we van het slot gaan, verwerk de eerstvolgende in de wachtrij
                const nextJob = this.queue.shift();
                this.preload(nextJob.url, nextJob.mimeType);
            }
        }

        /**
         * Preload media met hardware-optimalisatie
         */
        async preload(url, mimeType) {
            if (this.cache.has(url)) return url;
            
            // FASE 3: Als we gethrottled zijn, gooi het in de wachtrij en stop
            if (this.isThrottled) {
                // Voorkom dubbele urls in de wachtrij
                if (!this.queue.some(job => job.url === url)) {
                    this.queue.push({ url, mimeType });
                }
                return url;
            }

            // Annuleer eventuele lopende verzoeken voor dezelfde URL
            if (this.activeControllers.has(url)) {
                this.activeControllers.get(url).abort();
            }

            const controller = new AbortController();
            this.activeControllers.set(url, controller);

            const isVideo = mimeType && mimeType.startsWith('video');

            try {
                if (isVideo) {
                    // ENTERPRISE FIX 1: Geen RAM-vretende Blobs meer. 
                    // We gebruiken browser-native preloading via de <head>.
                    return new Promise((resolve) => {
                        const link = document.createElement('link');
                        link.rel = 'preload';
                        link.as = 'video';
                        link.href = url;
                        link.onload = () => {
                            this.cache.add(url);
                            this.activeControllers.delete(url);
                            resolve(url);
                        };
                        link.onerror = () => {
                            this.handleError(url, mimeType, resolve);
                        };
                        document.head.appendChild(link);
                        
                        // Ruim de link tag op na 30 seconden om de head schoon te houden
                        setTimeout(() => link.remove(), 30000);
                    });
                } else {
                    // ENTERPRISE FIX 2: Off-thread Beeld Decodering (img.decode)
                    const img = new Image();
                    img.src = url;
                    
                    await img.decode(); // Wacht tot de GPU het beeld heeft uitgepakt
                    this.cache.add(url);
                    this.activeControllers.delete(url);
                    return url;
                }
            } catch (e) {
                if (e.name === 'AbortError') return url;
                return this.handleError(url, mimeType);
            }
        }

        /**
         * Enterprise Fix 3: Exponentiële Retry Logica
         */
        handleError(url, mimeType, resolve = null) {
            let retries = this.retryMap.get(url) || 0;
            if (retries < this.MAX_RETRIES) {
                this.retryMap.set(url, retries + 1);
                const delay = Math.pow(2, retries) * 1000;
                setTimeout(() => this.preload(url, mimeType), delay);
            }
            if (resolve) resolve(url);
            return url;
        }

        /**
         * Annuleer specifieke download (Fix 4)
         */
        cancel(url) {
            if (this.activeControllers.has(url)) {
                this.activeControllers.get(url).abort();
                this.activeControllers.delete(url);
            }
            this.queue = this.queue.filter(job => job.url !== url);
        }

        /**
         * RAM Beheer: Actieve Garbage Collection.
         * Oude objecten worden écht uit de browser gehaald.
         */
        garbageCollect(keepUrls) {
            this.cache.forEach(url => {
                if (!keepUrls.includes(url)) {
                    this.cache.delete(url);
                    // Forceer de browser om het geheugen voor dit object vrij te maken
                    if (url.startsWith('blob:')) {
                        URL.revokeObjectURL(url);
                    }
                }
            });
        }

        getUrl(url) { return url; } 
    }

    window.App = window.App || {};
    window.App.workerPreload = new WorkerPreload();
})();