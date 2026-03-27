/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Utils | FILE: public/js/utils/InputValidator.js */

(function() {
    class InputValidator {
        constructor() {
            // Illegale tekens voor bestandsnamen (Windows/Linux standaard)
            this.illegalChars = /[\/\\:*?"<>|]/g;
        }

        /**
         * Koppel de validator aan een specifiek input veld.
         * Voorkomt de invoer van illegale tekens real-time.
         * * @param {HTMLInputElement} inputElement 
         */
        attach(inputElement) {
            if (!inputElement) return;

            // 1. Voorkom dat de toetsaanslag doorkomt tijdens typen
            inputElement.addEventListener('keydown', (e) => {
                const invalid = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
                
                // Als de getypte toets in de verboden lijst staat
                if (invalid.includes(e.key)) {
                    e.preventDefault(); // Blokkeer de fysieke toetsaanslag direct
                    
                    // Geef een nette waarschuwing via het NotificationCenter
                    if (window.EventBus) {
                        window.EventBus.emit('notify:warning', `Het teken ${e.key} is niet toegestaan in een bestandsnaam.`);
                    }
                }
            });

            // 2. Vang Copy-Paste (plakken) op: als iemand een hele tekst met verboden tekens plakt
            inputElement.addEventListener('input', (e) => {
                if (this.illegalChars.test(e.target.value)) {
                    // Strip de illegale tekens er direct uit
                    e.target.value = e.target.value.replace(this.illegalChars, '');
                    
                    if (window.EventBus) {
                        window.EventBus.emit('notify:warning', 'Illegale tekens zijn automatisch verwijderd uit de geplakte tekst.');
                    }
                }
            });
        }
    }

    // Registreer in de globale namespace zodat andere scripts (zoals PropertiesPanel) hem kunnen aanroepen
    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.inputValidator = new InputValidator();
    });
})();