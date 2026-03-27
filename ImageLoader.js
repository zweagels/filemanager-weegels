/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Utils | FILE: public/js/utils/ImageLoader.js */

(function() {
    class ImageLoader {
        constructor() {
            // Verhoogd naar 8: perfecte balans tussen supersnel laden en voorkomen van Strato DDoS blocks
            this.maxConcurrent = 8; 
            this.active = 0;
            this.queue = [];
        }

        /**
         * Start de wachtrij voor het inladen van thumbnails.
         */
        startQueue(container) {
            if (!container) return;

            // FASE 4 OPTIMALISATIE: Selecteer alleen afbeeldingen die NOG NIET in de wachtrij staan.
            // Dit elimineert de dodelijke O(N^2) array 'some' check die je CPU deed overkoken.
            const images = Array.from(container.querySelectorAll('img.strato-lazy-thumb[data-thumb-src]:not([data-queued="true"])'));
            
            images.forEach(img => {
                const src = img.getAttribute('data-thumb-src');
                
                if (src && src !== 'null' && src !== 'undefined' && src.trim() !== '') {
                    img.dataset.queued = 'true'; // O(1) markering
                    this.queue.push({ img, src });
                } else {
                    this.showFallback(img);
                }
            });

            this.processNext();
        }

        showFallback(img) {
            img.removeAttribute('data-thumb-src');
            img.removeAttribute('data-queued');
            img.style.display = 'none';
            if (img.parentElement) {
                const spinner = img.parentElement.querySelector('.thumb-loader-spinner');
                if (spinner) spinner.style.display = 'none';
                const fallback = img.parentElement.querySelector('.thumb-fallback');
                if (fallback) fallback.style.display = 'flex';
            }
        }

        processNext() {
            if (this.queue.length === 0 || this.active >= this.maxConcurrent) return;

            const item = this.queue.shift();
            const { img, src } = item;

            // MEMORY LEAK FIX: Als VirtualScroll de tegel uit de DOM heeft verwijderd
            // (omdat je er voorbij bent gescrold), gooi de download dan weg! 
            // Dit bespaart 90% geheugen, bandbreedte en server belasting.
            if (!document.body.contains(img)) {
                this.processNext();
                return;
            }

            img.removeAttribute('data-thumb-src');
            this.active++;

            const tempImage = new Image();

            tempImage.onload = () => {
                // Alleen renderen als hij nog steeds op het scherm staat
                if (document.body.contains(img)) {
                    img.src = src;
                    img.style.opacity = '1';
                    img.classList.remove('strato-lazy-thumb');
                    
                    if (img.parentElement) {
                        const spinner = img.parentElement.querySelector('.thumb-loader-spinner');
                        if (spinner) spinner.style.display = 'none';
                    }
                }
                
                // RAM opruimen (Garbage Collection Helper)
                tempImage.onload = null;
                tempImage.onerror = null;

                this.active--;
                this.processNext();
            };

            tempImage.onerror = () => {
                if (document.body.contains(img)) {
                    this.showFallback(img);
                }

                tempImage.onload = null;
                tempImage.onerror = null;

                this.active--;
                this.processNext();
            };

            tempImage.src = src;
        }
    }

    window.App = window.App || {};
    window.App.imageLoader = new ImageLoader();
})();