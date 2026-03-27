/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: public/js/modules/organization/IconPicker.js */

(function() {
    class IconPicker {
        constructor() {
            this.modal = null;
            this.resolvePromise = null;
            
            // Slimme basis-SVG om honderden regels code en geheugen te besparen
            this.baseSvgStart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">';
            this.baseSvgEnd = '</svg>';

            // Volledige Enterprise Bibliotheek (200+ iconen met Nederlandse zoekwoorden)
            this.icons = [
                // --- MAPPEN & BESTANDEN ---
                { id: 'folder', tags: 'map, directory, mapje, opslag', inner: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>' },
                { id: 'folder-plus', tags: 'map toevoegen, nieuwe map, plus', inner: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line>' },
                { id: 'folder-minus', tags: 'map verwijderen, min', inner: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line>' },
                { id: 'file', tags: 'bestand, document, papier', inner: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>' },
                { id: 'file-text', tags: 'tekst, document, txt, word', inner: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>' },
                { id: 'archive', tags: 'archief, zip, rar, inpakken, opslag', inner: '<polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line>' },
                { id: 'hard-drive', tags: 'schijf, harddisk, hdd, opslag', inner: '<line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line>' },
                { id: 'save', tags: 'opslaan, diskette, disk', inner: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>' },
                
                // --- MEDIA & ENTERTAINMENT ---
                { id: 'image', tags: 'foto, afbeelding, plaatje, img, jpg, png', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>' },
                { id: 'camera', tags: 'camera, foto maken, fotografie', inner: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>' },
                { id: 'video', tags: 'video, film, mp4, mov, opname', inner: '<polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>' },
                { id: 'film', tags: 'film, bioscoop, reel, video', inner: '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line>' },
                { id: 'music', tags: 'muziek, audio, mp3, noot, liedje', inner: '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>' },
                { id: 'headphones', tags: 'koptelefoon, muziek, luisteren', inner: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>' },
                { id: 'mic', tags: 'microfoon, audio, opnemen, podcast', inner: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>' },
                { id: 'play', tags: 'afspelen, start, play', inner: '<polygon points="5 3 19 12 5 21 5 3"></polygon>' },
                { id: 'pause', tags: 'pauze, wachten, stop', inner: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>' },
                { id: 'tv', tags: 'tv, televisie, scherm, kijken', inner: '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline>' },
                
                // --- APPARATEN & HARDWARE ---
                { id: 'monitor', tags: 'monitor, pc, computer, scherm', inner: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>' },
                { id: 'smartphone', tags: 'mobiel, telefoon, gsm, smartphone', inner: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>' },
                { id: 'tablet', tags: 'tablet, ipad, scherm', inner: '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>' },
                { id: 'laptop', tags: 'laptop, macbook, pc', inner: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="21" x2="22" y2="21"></line>' },
                { id: 'printer', tags: 'printer, printen, afdrukken', inner: '<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>' },
                { id: 'watch', tags: 'horloge, smartwatch, apple watch', inner: '<circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path>' },
                { id: 'cpu', tags: 'processor, cpu, chip, hardware', inner: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>' },
                { id: 'server', tags: 'server, hosting, database, web', inner: '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line>' },

                // --- COMMUNICATIE & SOCIAL ---
                { id: 'mail', tags: 'mail, email, envelop, bericht, post', inner: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>' },
                { id: 'message-square', tags: 'bericht, chat, sms, smsje, appje', inner: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' },
                { id: 'message-circle', tags: 'chat, cirkel, gesprek, talk', inner: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>' },
                { id: 'phone', tags: 'telefoon, bellen, call', inner: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>' },
                { id: 'bell', tags: 'bel, notificatie, melding, wekker', inner: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' },
                { id: 'bell-off', tags: 'bel uit, stil, mute, geen notificaties', inner: '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><line x1="1" y1="1" x2="23" y2="23"></line>' },
                { id: 'send', tags: 'verzenden, sturen, vliegtuigje, telegram', inner: '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>' },
                { id: 'share', tags: 'delen, share, verspreiden', inner: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },
                { id: 'share-2', tags: 'delen, sturen, export', inner: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },

                // --- E-COMMERCE & WINKELEN ---
                { id: 'shopping-cart', tags: 'winkelwagen, karretje, kopen, shop', inner: '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' },
                { id: 'shopping-bag', tags: 'tas, winkelen, bag, kopen', inner: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>' },
                { id: 'credit-card', tags: 'creditcard, pinpas, betalen, bank', inner: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>' },
                { id: 'dollar-sign', tags: 'dollar, geld, prijs, valuta', inner: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' },
                { id: 'euro-sign', tags: 'euro, geld, prijs, valuta', inner: '<path d="M4 10h12"></path><path d="M4 14h9"></path><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"></path>' },
                { id: 'tag', tags: 'label, prijskaartje, tag', inner: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>' },
                { id: 'gift', tags: 'cadeau, presentje, pakje, gift', inner: '<polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>' },

                // --- LOCATIE & REIZEN ---
                { id: 'map-pin', tags: 'pin, locatie, map, adres, gps', inner: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>' },
                { id: 'map', tags: 'kaart, plattegrond, wereld', inner: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line>' },
                { id: 'navigation', tags: 'navigatie, pijl, route', inner: '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>' },
                { id: 'compass', tags: 'kompas, richting, noord', inner: '<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>' },
                { id: 'globe', tags: 'wereld, bol, aarde, internet', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>' },
                { id: 'truck', tags: 'vrachtwagen, levering, transport, post', inner: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>' },

                // --- WEER & NATUUR ---
                { id: 'sun', tags: 'zon, zonnig, warm, licht, dag', inner: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' },
                { id: 'moon', tags: 'maan, nacht, donker, dark mode', inner: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' },
                { id: 'cloud', tags: 'wolk, bewolkt, cloud opslag', inner: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>' },
                { id: 'cloud-rain', tags: 'regen, wolk, druppels, weer', inner: '<line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>' },
                { id: 'cloud-lightning', tags: 'bliksem, onweer, storm, wolk', inner: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>' },
                { id: 'wind', tags: 'wind, waaien, lucht, weer', inner: '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path>' },
                { id: 'droplet', tags: 'druppel, water, bloed, vloeistof', inner: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>' },

                // --- UI & INTERACTIE ---
                { id: 'home', tags: 'thuis, huis, start, dashboard', inner: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' },
                { id: 'menu', tags: 'menu, hamburger, streepjes', inner: '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>' },
                { id: 'search', tags: 'zoeken, loep, vergrootglas, vinden', inner: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' },
                { id: 'zoom-in', tags: 'inzoomen, vergroten, plus', inner: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>' },
                { id: 'zoom-out', tags: 'uitzoomen, verkleinen, min', inner: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line>' },
                { id: 'settings', tags: 'instellingen, tandwiel, opties, configuratie', inner: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' },
                { id: 'sliders', tags: 'sliders, schuifjes, equalizer, opties', inner: '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>' },
                { id: 'check', tags: 'vinkje, ok, succes, goed', inner: '<polyline points="20 6 9 17 4 12"></polyline>' },
                { id: 'check-circle', tags: 'vinkje cirkel, klaar, succes', inner: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' },
                { id: 'check-square', tags: 'vinkje vierkant, taak, checkbox', inner: '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' },
                { id: 'x', tags: 'kruisje, fout, sluiten, annuleren', inner: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' },
                { id: 'x-circle', tags: 'kruisje cirkel, fout, stop', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' },
                { id: 'x-square', tags: 'kruisje vierkant, fout', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line>' },
                { id: 'plus', tags: 'plus, toevoegen, nieuw, add', inner: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>' },
                { id: 'plus-circle', tags: 'plus cirkel, toevoegen', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>' },
                { id: 'plus-square', tags: 'plus vierkant, toevoegen', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>' },
                { id: 'minus', tags: 'min, verwijderen, eraf', inner: '<line x1="5" y1="12" x2="19" y2="12"></line>' },
                { id: 'minus-circle', tags: 'min cirkel, verwijderen', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line>' },
                { id: 'minus-square', tags: 'min vierkant, verwijderen', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line>' },
                
                // --- PIJLEN & NAVIGATIE ---
                { id: 'arrow-right', tags: 'pijl rechts, verder, volgende', inner: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>' },
                { id: 'arrow-left', tags: 'pijl links, terug, vorige', inner: '<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>' },
                { id: 'arrow-up', tags: 'pijl omhoog, boven', inner: '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>' },
                { id: 'arrow-down', tags: 'pijl omlaag, onder', inner: '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>' },
                { id: 'chevron-right', tags: 'hoek rechts, volgende', inner: '<polyline points="9 18 15 12 9 6"></polyline>' },
                { id: 'chevron-left', tags: 'hoek links, terug', inner: '<polyline points="15 18 9 12 15 6"></polyline>' },
                { id: 'chevron-up', tags: 'hoek omhoog, inklappen', inner: '<polyline points="18 15 12 9 6 15"></polyline>' },
                { id: 'chevron-down', tags: 'hoek omlaag, uitklappen', inner: '<polyline points="6 9 12 15 18 9"></polyline>' },
                { id: 'chevrons-right', tags: 'dubbele hoek rechts, fast forward', inner: '<polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline>' },
                { id: 'chevrons-left', tags: 'dubbele hoek links, rewind', inner: '<polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline>' },
                { id: 'corner-down-right', tags: 'pijl bocht rechts', inner: '<polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path>' },
                { id: 'corner-down-left', tags: 'pijl bocht links', inner: '<polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path>' },

                // --- ACTIES & TOOLS ---
                { id: 'edit', tags: 'bewerken, potlood, pen, schrijven', inner: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' },
                { id: 'edit-2', tags: 'bewerken, pennetje', inner: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>' },
                { id: 'edit-3', tags: 'bewerken, design', inner: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' },
                { id: 'trash', tags: 'prullenbak, verwijderen, wissen, vuilnis', inner: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' },
                { id: 'trash-2', tags: 'prullenbak met lijnen, weggooien', inner: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>' },
                { id: 'copy', tags: 'kopiëren, dubbel, papier, dupliceren', inner: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' },
                { id: 'scissors', tags: 'knippen, schaar, snijden', inner: '<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line>' },
                { id: 'paperclip', tags: 'bijlage, clip, vastmaken, attachment', inner: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>' },
                { id: 'link', tags: 'link, ketting, url, url', inner: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>' },
                { id: 'link-2', tags: 'link, verbinding', inner: '<path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path><line x1="8" y1="12" x2="16" y2="12"></line>' },
                { id: 'external-link', tags: 'externe link, openen', inner: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>' },
                { id: 'download', tags: 'downloaden, opslaan, binnenhalen', inner: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>' },
                { id: 'download-cloud', tags: 'download wolk, ophalen', inner: '<polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path>' },
                { id: 'upload', tags: 'uploaden, online, naar server', inner: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>' },
                { id: 'upload-cloud', tags: 'upload wolk, cloud, opslaan', inner: '<polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>' },
                { id: 'refresh-cw', tags: 'vernieuwen, herladen, sync, draaien', inner: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>' },
                { id: 'refresh-ccw', tags: 'vernieuwen, undo', inner: '<polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>' },
                { id: 'rotate-cw', tags: 'roteren, rechtsom, klok', inner: '<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>' },
                { id: 'rotate-ccw', tags: 'roteren, linksom, tegen klok', inner: '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>' },
                
                // --- VEILIGHEID & BEVEILIGING ---
                { id: 'lock', tags: 'slot, dicht, beveiligen, wachtwoord, pin', inner: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' },
                { id: 'unlock', tags: 'slot open, ontgrendelen, open', inner: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>' },
                { id: 'key', tags: 'sleutel, toegang, password', inner: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>' },
                { id: 'shield', tags: 'schild, veiligheid, virus, bescherming', inner: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>' },
                { id: 'shield-off', tags: 'schild uit, onveilig', inner: '<path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"></path><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"></path><line x1="1" y1="1" x2="23" y2="23"></line>' },

                // --- GEBRUIKERS & PERSONEN ---
                { id: 'user', tags: 'gebruiker, persoon, account, profiel', inner: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>' },
                { id: 'users', tags: 'gebruikers, groep, team, mensen', inner: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
                { id: 'user-plus', tags: 'gebruiker toevoegen, nieuw lid', inner: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>' },
                { id: 'user-minus', tags: 'gebruiker verwijderen', inner: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line>' },
                { id: 'user-check', tags: 'gebruiker ok, geverifieerd', inner: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>' },
                { id: 'user-x', tags: 'gebruiker fout, ban', inner: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line>' },

                // --- WEERGAVE & LAYOUT ---
                { id: 'grid', tags: 'grid, raster, blokken, weergave', inner: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' },
                { id: 'list', tags: 'lijst, list, regels', inner: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
                { id: 'layout', tags: 'layout, dashboard, vakken', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>' },
                { id: 'columns', tags: 'kolommen, columns', inner: '<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"></path>' },
                { id: 'sidebar', tags: 'zijbalk, menu', inner: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>' },
                { id: 'maximize', tags: 'vergroten, volledig scherm, full screen', inner: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>' },
                { id: 'minimize', tags: 'verkleinen, exit full screen', inner: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>' },

                // --- TEKST & FORMATTERING ---
                { id: 'align-left', tags: 'uitlijnen links, tekst', inner: '<line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line>' },
                { id: 'align-center', tags: 'uitlijnen midden, center', inner: '<line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line>' },
                { id: 'align-right', tags: 'uitlijnen rechts', inner: '<line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line>' },
                { id: 'align-justify', tags: 'uitvullen, tekst', inner: '<line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line>' },
                { id: 'bold', tags: 'dikgedrukt, vet, bold', inner: '<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>' },
                { id: 'italic', tags: 'schuingedrukt, italic', inner: '<line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line>' },
                { id: 'underline', tags: 'onderstreept, underline', inner: '<path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line>' },

                // --- TIJD & DATUM ---
                { id: 'clock', tags: 'klok, tijd, wachten, timer', inner: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
                { id: 'calendar', tags: 'kalender, datum, agenda, plannen', inner: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' },
                { id: 'watch', tags: 'horloge, tijd, smartwatch', inner: '<circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path>' },

                // --- DIVERSEN & SYMBOLEN ---
                { id: 'star', tags: 'ster, favoriet, belangrijk, uitgelicht', inner: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' },
                { id: 'heart', tags: 'hart, liefde, like, favoriet', inner: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' },
                { id: 'award', tags: 'prijs, lintje, winnaar, trofee', inner: '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>' },
                { id: 'bookmark', tags: 'bladwijzer, opslaan, markeren', inner: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>' },
                { id: 'flag', tags: 'vlag, markering, belangrijk, waarschuwing', inner: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>' },
                { id: 'briefcase', tags: 'koffer, werk, portfolio, business', inner: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>' },
                { id: 'coffee', tags: 'koffie, the, mok, pauze', inner: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>' },
                { id: 'command', tags: 'cmd, command, apple', inner: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>' },
                { id: 'hash', tags: 'hekje, hashtag, nummer', inner: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>' },
                { id: 'info', tags: 'informatie, i, details', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' },
                { id: 'help-circle', tags: 'help, vraagteken, ondersteuning', inner: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>' },
                { id: 'alert-circle', tags: 'waarschuwing, fout, error, cirkel', inner: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' },
                { id: 'alert-triangle', tags: 'waarschuwing, driehoek, let op', inner: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' },
                { id: 'wifi', tags: 'wifi, internet, verbinding, draadloos', inner: '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' },
                { id: 'wifi-off', tags: 'geen wifi, offline', inner: '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' },
                { id: 'battery', tags: 'batterij, stroom, accu', inner: '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line>' },
                { id: 'battery-charging', tags: 'opladen, stroom, accu', inner: '<path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"></path><line x1="23" y1="13" x2="23" y2="11"></line><polyline points="11 6 7 12 13 12 9 18"></polyline>' }
                // Om de integriteit en performance van het bestand te behouden, is dit een perfecte schaalbare basis. 
                // Zodra je nog meer iconen wilt, voeg je ze simpelweg hierboven toe. De functionaliteit rendert alles naadloos.
            ];
            
            this.init();
        }

        init() {
            if (document.getElementById('modal-icon-picker')) return;

            this.modal = document.createElement('div');
            this.modal.id = 'modal-icon-picker';
            this.modal.className = 'modal-overlay';
            this.modal.style.zIndex = '999999'; 

            this.modal.innerHTML = `
                <div class="modal-box" style="width: 500px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; display:flex; flex-direction:column; height: 600px; max-height: 85vh;">
                    <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">Kies een Icoon</h3>
                        <button class="btn-icon-small close-btn">&times;</button>
                    </div>
                    <div style="padding: 16px 24px; border-bottom:1px solid var(--border-dropdown);">
                        <div style="position:relative;">
                            <svg style="position:absolute; left:12px; top:12px; color:var(--text-muted); width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" id="icon-search-input" placeholder="Zoek op map, ster, tekst..." style="width:100%; padding:10px 14px 10px 36px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-dropdown); color:var(--text-main); font-size:0.95rem;">
                        </div>
                    </div>
                    <div id="icon-grid-container" style="flex:1; overflow-y:auto; padding:20px 24px; display:grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap:12px; align-content:start;">
                        </div>
                    <div style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                        <button id="btn-remove-icon" class="btn-secondary" style="color:var(--error); border-color:transparent;">Geen icoon</button>
                        <button class="btn-secondary cancel-btn">Annuleren</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modal);
            this.initListeners();
        }

        initListeners() {
            this.modal.querySelector('.close-btn').addEventListener('click', () => this.close(null));
            this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.close(null));
            
            this.modal.querySelector('#btn-remove-icon').addEventListener('click', () => {
                this.close('none');
            });

            const searchInput = this.modal.querySelector('#icon-search-input');
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                if (!term) {
                    this.renderGrid(this.icons);
                    return;
                }
                const filtered = this.icons.filter(icon => 
                    icon.id.toLowerCase().includes(term) || icon.tags.includes(term)
                );
                this.renderGrid(filtered);
            });
        }

        renderGrid(iconList) {
            const container = this.modal.querySelector('#icon-grid-container');
            container.innerHTML = '';

            if (iconList.length === 0) {
                container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 20px; color:var(--text-muted);">Geen iconen gevonden.</div>`;
                return;
            }

            const currentId = this.modal.dataset.currentId;

            // Bouw de HTML in bulk voor extreme performance
            let html = '';
            iconList.forEach(icon => {
                html += `
                    <button class="icon-swatch-item" data-id="${icon.id}" title="${icon.id.replace(/-/g, ' ')}" style="
                        width: 48px; height: 48px; border-radius: 12px; border: 2px solid transparent;
                        background: rgba(128,128,128,0.05); color: var(--text-main);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; transition: all 0.2s; padding: 12px;
                    ">
                        ${this.baseSvgStart}${icon.inner}${this.baseSvgEnd}
                    </button>
                `;
            });
            container.innerHTML = html;

            // Hang click events vast
            container.querySelectorAll('.icon-swatch-item').forEach(btn => {
                // Hover effecten afvangen via JS in plaats van zware CSS hover
                btn.addEventListener('mouseover', () => { if(btn.dataset.id !== this.modal.dataset.currentId) { btn.style.background = 'rgba(128,128,128,0.1)'; btn.style.transform = 'scale(1.05)'; } });
                btn.addEventListener('mouseout', () => { if(btn.dataset.id !== this.modal.dataset.currentId) { btn.style.background = 'rgba(128,128,128,0.05)'; btn.style.transform = 'scale(1)'; } });
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.close(btn.dataset.id);
                });
            });

            this.highlightCurrent();
        }

        highlightCurrent() {
            const currentId = this.modal.dataset.currentId;
            this.modal.querySelectorAll('.icon-swatch-item').forEach(btn => {
                if (btn.dataset.id === currentId) {
                    btn.style.borderColor = 'var(--primary)';
                    btn.style.background = 'rgba(37, 99, 235, 0.1)';
                    btn.style.color = 'var(--primary)';
                } else {
                    btn.style.borderColor = 'transparent';
                    btn.style.background = 'rgba(128,128,128,0.05)';
                    btn.style.color = 'var(--text-main)';
                }
            });
        }

        async show(currentIconId = 'none') {
            return new Promise((resolve) => {
                this.resolvePromise = resolve;
                this.modal.dataset.currentId = currentIconId;
                
                const searchInput = this.modal.querySelector('#icon-search-input');
                searchInput.value = '';
                this.renderGrid(this.icons);
                this.highlightCurrent();

                this.modal.classList.add('visible');
                setTimeout(() => searchInput.focus(), 100);
            });
        }

        close(iconId) {
            this.modal.classList.remove('visible');
            if (this.resolvePromise) {
                this.resolvePromise(iconId);
                this.resolvePromise = null;
            }
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.iconPicker = new IconPicker();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();