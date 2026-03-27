/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/VirtualScroll.js */

(function() {
    class VirtualScroll {
        constructor() {
            this.observer = null;
            this.scrollContainer = document.getElementById('file-view');
            
            // FASE 5 FIX: Een kaart met alle geobserveerde items zodat we hun data kennen
            this.observedItems = new Map();
            
            this.initObserver();
        }

        initObserver() {
            if (!this.scrollContainer) return;

            const options = {
                root: this.scrollContainer,
                // Ruime marge: 600px boven en onder het scherm laden we al in
                rootMargin: '600px 0px', 
                threshold: 0 
            };

            this.observer = new IntersectionObserver((entries) => {
                requestAnimationFrame(() => {
                    entries.forEach(entry => {
                        const el = entry.target;
                        
                        if (entry.isIntersecting) {
                            this.renderContent(el);
                        } 
                        else {
                            this.cleanupContent(el);
                        }
                    });
                });
            }, options);
        }

        /**
         * Voeg een nieuw element toe aan de observer en bewaar zijn data.
         */
        observe(element, itemData) {
            if (this.observer && element) {
                // Sla de originele data op in een Map, gekoppeld aan de ID
                if (itemData && element.dataset.id) {
                    this.observedItems.set(element.dataset.id, {
                        data: itemData,
                        type: element.dataset.type || (element.classList.contains('type-folder') ? 'folder' : 'file')
                    });
                }
                this.observer.observe(element);
            }
        }

        unobserve(element) {
            if (this.observer && element) {
                this.observer.unobserve(element);
                if (element.dataset.id) {
                    this.observedItems.delete(element.dataset.id);
                }
            }
        }

        disconnect() {
            if (this.observer) {
                this.observer.disconnect();
                this.observedItems.clear();
            }
        }

        /**
         * Triggert inlaad-acties en tekent HTML opnieuw wanneer een item in beeld komt
         */
        renderContent(element) {
            if (!element.classList.contains('vs-rendered')) {
                
                // FASE 5 FIX: Als de inhoud is leeggemaakt voor RAM besparing, bouw deze dan opnieuw op!
                if (element.dataset.cleared === 'true' && element.dataset.id) {
                    const savedData = this.observedItems.get(element.dataset.id);
                    if (savedData && window.App.renderEngine) {
                        window.App.renderEngine.rebuildTile(element, savedData.data, savedData.type);
                    }
                    element.dataset.cleared = 'false';
                }

                element.classList.add('vs-rendered');
                
                if (window.App && window.App.imageLoader) {
                    window.App.imageLoader.startQueue(element);
                }

                const videos = element.querySelectorAll('video');
                videos.forEach(vid => {
                    if (vid.paused) {
                        let playPromise = vid.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => { 
                                // Autoplay werd geblokkeerd, negeer stil
                            });
                        }
                    }
                });
            }
        }

        /**
         * FASE 5 FIX: Bespaar MASSIEF op CPU/RAM wanneer een element uit beeld is gescrold
         */
        cleanupContent(element) {
            if (element.classList.contains('vs-rendered')) {
                element.classList.remove('vs-rendered');
                
                const videos = element.querySelectorAll('video');
                videos.forEach(vid => {
                    if (!vid.paused) vid.pause();
                });

                // De Magic Trick tegen het 1.1GB Memory Leak:
                // Als het geen back-tile is (de '.. Terug' knop), vernietig dan de DOM binnenkant.
                // We forceren een vaste hoogte/breedte via CSS grid/flex, dus het element "blijft" 
                // de ruimte innemen, maar de plaatjes worden keihard uit het RAM gegooid.
                if (!element.classList.contains('is-back-tile') && element.dataset.id) {
                    // Verwijder class attributes die specifiek waren voor de weergave (zoals active favorieten)
                    element.innerHTML = '';
                    element.dataset.cleared = 'true';
                }
            }
        }
    }

    // Registreer in de globale namespace
    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.virtualScroll = new VirtualScroll();
    });
})();