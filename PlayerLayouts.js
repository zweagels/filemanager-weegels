/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/PlayerLayouts.js */

(function() {
    window.App = window.App || {};
    window.App.playerLayouts = {
        generateSlideHTML: function(item, data, preloader) {
            // FASE 1/5 FIX (TV): Volledige verwijdering van ES6 Optional Chaining (?.) en Nullish Coalescing (??)
            var sObj = data.slideshow || data || {};
            var gSettings = data.settings || sObj.settings || {};
            
            var layout = gSettings.layout || 'full';
            var globalScale = gSettings.media_scale !== undefined ? gSettings.media_scale : 0.85;
            var rawScale = (item.media_scale !== null && item.media_scale !== undefined) ? item.media_scale : globalScale;
            
            var renderScale = rawScale * 0.75; 

            // DE URL FIX: Kogelvrij & Zonder '403 Forbidden' blokkade
            var getItemUrl = function(targetItem) {
                if (!targetItem) return '';
                
                var tvToken = window.slideshowToken ? '&token=' + window.slideshowToken : '';
                
                if (targetItem.file_id && targetItem.file_id !== 'undefined' && targetItem.file_id !== 'null') {
                    return '/api/files?action=download&id=' + targetItem.file_id + tvToken;
                }
                
                if (targetItem.file_url && targetItem.file_url !== 'undefined' && targetItem.file_url !== 'null') {
                    return targetItem.file_url + tvToken;
                }
                
                return targetItem.url_large || targetItem.url || targetItem.path || '';
            };

            var getCropStyles = function(targetItem, isKenBurns) {
                var filterStr = '';
                var b = (targetItem.filter_brightness !== null && targetItem.filter_brightness !== undefined) ? targetItem.filter_brightness : 100;
                var c = (targetItem.filter_contrast !== null && targetItem.filter_contrast !== undefined) ? targetItem.filter_contrast : 100;
                var s = (targetItem.filter_saturate !== null && targetItem.filter_saturate !== undefined) ? targetItem.filter_saturate : 100;
                var rotate = (targetItem.transform_rotate !== null && targetItem.transform_rotate !== undefined) ? targetItem.transform_rotate : 0;
                var flipX = (targetItem.transform_flip_x !== null && targetItem.transform_flip_x !== undefined) ? targetItem.transform_flip_x : 1;
                var flipY = (targetItem.transform_flip_y !== null && targetItem.transform_flip_y !== undefined) ? targetItem.transform_flip_y : 1;

                filterStr += 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%) ';

                if (targetItem.image_filter && targetItem.image_filter !== 'none') {
                    var f = targetItem.image_filter;
                    if (f === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (f === 'sepia') filterStr += 'sepia(100%) ';
                    else if (f === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                    else filterStr += f + ' ';
                } else if (targetItem.settings && targetItem.settings.filter) {
                    var sf = targetItem.settings.filter;
                    if (sf === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (sf === 'sepia') filterStr += 'sepia(100%) ';
                    else if (sf === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                }
                filterStr = filterStr.trim();

                var crop_x = targetItem.crop_x !== null && targetItem.crop_x !== undefined ? parseFloat(targetItem.crop_x) : 0;
                var crop_y = targetItem.crop_y !== null && targetItem.crop_y !== undefined ? parseFloat(targetItem.crop_y) : 0;
                var crop_w = targetItem.crop_w !== null && targetItem.crop_w !== undefined ? parseFloat(targetItem.crop_w) : 100;
                var crop_h = targetItem.crop_h !== null && targetItem.crop_h !== undefined ? parseFloat(targetItem.crop_h) : 100;

                var cx = crop_x + (crop_w / 2);
                var cy = crop_y + (crop_h / 2);

                var transformStr = '';
                if (isKenBurns) transformStr += 'translate3d(0,0,0) scale(1.1) ';
                if (rotate || flipX !== 1 || flipY !== 1) {
                    transformStr += 'rotate(' + rotate + 'deg) scaleX(' + flipX + ') scaleY(' + flipY + ')';
                }
                transformStr = transformStr.trim() || 'none';

                return { filterStr: filterStr, transformStr: transformStr, top: crop_y, left: crop_x, crop_w: crop_w, crop_h: crop_h, cx: cx, cy: cy };
            };

            var buildWatermarkHTML = function(gSet, iSet) {
                if (iSet && iSet.override_watermark === 0) return '';
                var rawText = (gSet.settings && gSet.settings.watermark_text) ? gSet.settings.watermark_text : '';
                var text = String(rawText);
                var logoId = (gSet.settings && gSet.settings.watermark_image_id) ? gSet.settings.watermark_image_id : null;
                
                if (!text && !logoId) return '';

                var sets = gSet.settings || {};
                var opacity = (sets.watermark_opacity !== undefined ? sets.watermark_opacity : 100) / 100;
                var font = sets.watermark_font || 'Inter';
                var sizeMap = { 'small': '32px', 'normal': '48px', 'large': '72px', 'xlarge': '100px' };
                var fontSize = sizeMap[sets.watermark_size] || '48px';
                var color = sets.watermark_color || '#ffffff';
                var bg = sets.watermark_bg || 'transparent';
                var shadow = sets.watermark_shadow == 1 ? '0 8px 24px rgba(0,0,0,0.5)' : 'none';
                var textShadow = (bg === 'transparent' && sets.watermark_shadow == 1) ? '0 4px 12px rgba(0,0,0,0.8)' : 'none';

                var contentHtml = '';
                if (logoId) {
                    contentHtml = '<img src="/api/files?action=download&id=' + logoId + (window.slideshowToken ? '&token='+window.slideshowToken : '') + '" style="max-height: 150px; width: auto; display: block;" onerror="this.style.display=\'none\'">';
                } else {
                    contentHtml = text.replace(/{datum}/g, new Date().toLocaleDateString('nl-NL')).replace(/{tijd}/g, new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}));
                }

                var wmX = sets.watermark_x !== undefined ? sets.watermark_x : 80;
                var wmY = sets.watermark_y !== undefined ? sets.watermark_y : 85;

                // FASE 1 FIX (TV): translate3d voor GPU acceleratie en compatibiliteit
                var style = 'position: absolute; left: ' + wmX + '%; top: ' + wmY + '%; transform: translate3d(-50%, -50%, 0); opacity: ' + opacity + '; font-family: \'' + font + '\', sans-serif; font-size: ' + fontSize + '; color: ' + color + '; background: ' + bg + '; box-shadow: ' + (bg !== 'transparent' ? shadow : 'none') + '; text-shadow: ' + textShadow + '; padding: ' + (bg !== 'transparent' ? '16px 32px' : '0') + '; border-radius: 16px; z-index: 50; pointer-events: none; word-wrap: break-word; overflow-wrap: break-word; max-width: 80%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; white-space: nowrap;';
                return '<div class="ss-tv-watermark" style="' + style + '">' + contentHtml + '</div>';
            };

            var buildClockHTML = function(gSet, iSet) {
                var clockId = gSet.clock_id;
                if (iSet && iSet.override_clock_id !== undefined && iSet.override_clock_id !== null) {
                    if (iSet.override_clock_id === 0) return '';
                    clockId = iSet.override_clock_id;
                }

                if (!clockId || clockId == 0) return '';
                
                var clockObj = null;
                if (data.dictionaries && data.dictionaries.clocks) {
                    for(var j=0; j < data.dictionaries.clocks.length; j++) {
                        if(data.dictionaries.clocks[j].id == clockId) {
                            clockObj = data.dictionaries.clocks[j];
                            break;
                        }
                    }
                }
                if (!clockObj) return '';

                var sets = gSet.settings || {};
                var clkX = sets.clock_x !== undefined ? sets.clock_x : 5;
                var clkY = sets.clock_y !== undefined ? sets.clock_y : 5;
                var scale = sets.clock_scale !== undefined ? sets.clock_scale : 1.0;
                
                var rawOpacity = sets.clock_bg_opacity !== undefined ? sets.clock_bg_opacity : 60;
                var bgOpacity = parseFloat(rawOpacity) / 100;

                var outerStyle = 'position: absolute; left: ' + clkX + '%; top: ' + clkY + '%; transform: translate3d(-50%, -50%, 0) scale(' + scale + '); transform-origin: center center; z-index: 50; pointer-events: none; display: flex; align-items: center; justify-content: center;';

                var isAnalog = clockObj.type === 'analog' || (clockObj.svg_code && clockObj.svg_code.indexOf('<svg') !== -1);
                var content = isAnalog ? clockObj.svg_code : new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'});
                var clockStyle = clockObj.css_code ? clockObj.css_code.replace(/"/g, "'") : '';
                
                var borderThickness = sets.clock_border_size !== undefined ? parseFloat(sets.clock_border_size) : 0; 
                var borderColor = sets.clock_border_color || '#ffffff';
                
                var bgCss = 'background: rgba(0,0,0,' + bgOpacity + ');';
                var borderCss = borderThickness > 0 ? 'border: ' + borderThickness + 'px solid ' + borderColor + ';' : 'border: none;';
                var paddingCss = isAnalog ? 'padding: 16px;' : 'padding: 24px 48px;';
                var radiusCss = isAnalog ? 'border-radius: 50%;' : 'border-radius: 24px;';
                var shadowCss = bgOpacity > 0 ? 'box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(16px);' : 'box-shadow: none; backdrop-filter: none;';
                var textShadowCss = 'text-shadow: 0 4px 16px rgba(0,0,0,0.9); color: #fff;';
                
                if (bgOpacity === 0) {
                    bgCss = 'background: transparent !important;';
                    shadowCss = 'box-shadow: none !important; backdrop-filter: none !important;';
                    if (isAnalog) {
                        borderCss = borderThickness > 0 ? 'border: ' + borderThickness + 'px solid ' + borderColor + ' !important;' : 'border: none !important;'; 
                    } else {
                        borderCss = borderThickness > 0 ? 'border: ' + borderThickness + 'px solid transparent !important;' : 'border: none !important;'; 
                        if (borderThickness > 0) {
                            textShadowCss = '-webkit-text-stroke: ' + borderThickness + 'px ' + borderColor + '; text-shadow: 0 0 10px ' + borderColor + ', 0 0 20px ' + borderColor + '; color: #ffffff;';
                        }
                    }
                }

                var innerStyle = 'display:flex; align-items:center; justify-content:center; white-space:nowrap; box-sizing:border-box; font-family: \'Space Mono\', \'Courier New\', monospace; font-weight: 700; font-size: 64px; letter-spacing: 2px; ' + radiusCss + ' ' + paddingCss + ' ' + bgCss + ' ' + borderCss + ' ' + shadowCss + ' ' + textShadowCss + ' ' + clockStyle;
                return '<div class="ss-tv-clock" style="' + outerStyle + '"><div class="ss-tv-clock-inner" style="' + innerStyle + '">' + content + '</div></div>';
            };

            var buildMedia = function(targetItem, customStyle, next) {
                if (!targetItem) return '';
                var targetUrl = getItemUrl(targetItem);
                if (preloader && !next) preloader.preload(targetUrl, targetItem.mime_type);
                
                var isVideo = targetItem.mime_type && targetItem.mime_type.indexOf('video') === 0;
                var tFitMode = targetItem.fit_mode || 'contain';

                var isKenBurns = targetItem.settings ? targetItem.settings.kenburns : false;
                var crop = getCropStyles(targetItem, isKenBurns);
                var watermarkHtml = buildWatermarkHTML(sObj, targetItem);

                var forceCover = (layout === 'grid' || (layout === 'pip' && next)); 

                if (forceCover || tFitMode === 'cover' || tFitMode === 'fill' || tFitMode === 'tile') {
                    var objF = (tFitMode === 'fill' && !forceCover) ? 'fill' : 'cover';
                    var objPos = forceCover ? crop.cx + '% ' + crop.cy + '%' : 'center center';

                    // FASE 1 FIX (TV): Vervang inset:0 door expliciete top, left, right, bottom voor oude tv's
                    var imgStyle = 'position:absolute; top:0; left:0; right:0; bottom:0; width:100%; height:100%; object-fit:' + objF + '; object-position:' + objPos + '; filter:' + crop.filterStr + '; transform:' + crop.transformStr + ';';
                    var mHtml = '';
                    if (tFitMode === 'tile' && !next) {
                        var size = (targetItem.settings && targetItem.settings.tile_size === 'sm') ? '100px' : ((targetItem.settings && targetItem.settings.tile_size === 'lg') ? '500px' : '250px');
                        imgStyle = 'position:absolute; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background-image:url(\'' + targetUrl + '\'); background-repeat:repeat; background-size:' + size + '; background-position:center; filter:' + crop.filterStr + ';';
                        mHtml = '<div style="' + imgStyle + '"></div>';
                    } else {
                        mHtml = isVideo ? '<video src="' + targetUrl + '" style="' + imgStyle + '" autoplay muted loop playsinline></video>' : '<img src="' + targetUrl + '" style="' + imgStyle + '">';
                    }
                    return '<div class="ss-anim-layer" style="position:relative; width:100%; height:100%; overflow:hidden; ' + (customStyle || '') + '">' + mHtml + watermarkHtml + '</div>';
                }

                var imgW = (100 / crop.crop_w) * 100;
                var imgH = (100 / crop.crop_h) * 100;
                var imgL = -(crop.left / crop.crop_w) * 100;
                var imgT = -(crop.top / crop.crop_h) * 100;

                var frameStyleObj = (targetItem.settings ? targetItem.settings.frame_style : null) || gSettings.frame_style || 'none';
                var frameBgStyle = '';
                var cropboxInset = 'top: 0; left: 0; right: 0; bottom: 0;';
                
                if (frameStyleObj === 'classic') {
                    frameBgStyle = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 8px; padding: 16px;';
                    cropboxInset = 'top: 16px; left: 16px; right: 16px; bottom: 16px;';
                } else if (frameStyleObj === 'polaroid') {
                    frameBgStyle = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 4px; padding: 24px 24px 100px 24px;';
                    cropboxInset = 'top: 24px; left: 24px; right: 24px; bottom: 100px;';
                } else if (frameStyleObj === 'rounded') {
                    frameBgStyle = 'box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 24px; border: 2px solid rgba(255,255,255,0.1);';
                } else {
                    frameBgStyle = 'border-radius: 0px;';
                }

                var mediaTag = isVideo 
                    ? '<video src="' + targetUrl + '" class="ss-phantom-measure" data-cropw="' + crop.crop_w + '" data-croph="' + crop.crop_h + '" style="position:absolute; left:' + imgL + '%; top:' + imgT + '%; width:' + imgW + '%; height:' + imgH + '%; filter:' + crop.filterStr + '; max-width:none; max-height:none;" autoplay muted loop playsinline></video>'
                    : '<img src="' + targetUrl + '" class="ss-phantom-measure" data-cropw="' + crop.crop_w + '" data-croph="' + crop.crop_h + '" style="position:absolute; left:' + imgL + '%; top:' + imgT + '%; width:' + imgW + '%; height:' + imgH + '%; filter:' + crop.filterStr + '; max-width:none; max-height:none;">';

                return '<div class="ss-anim-layer" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; ' + (customStyle || '') + '"><div class="ss-layer-wrapper" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; transform: ' + crop.transformStr + '; transform-origin: center;"><div class="ss-layer-frame" style="position:relative; display:inline-flex; min-width:0; min-height:0; max-width:100%; max-height:100%; box-sizing:border-box; ' + frameBgStyle + '"><svg class="ss-dummy-svg" width="1920" height="1080" viewBox="0 0 1920 1080" style="opacity:0; display:block; max-width:100%; max-height:100%; pointer-events:none;"></svg><div class="ss-layer-cropbox" style="position:absolute; ' + cropboxInset + ' overflow:hidden; border-radius:inherit;">' + mediaTag + '</div>' + watermarkHtml + '</div></div></div>';
            };

            var rootFitMode = item.fit_mode || 'contain';
            var bgHtml = '';
            
            if (rootFitMode === 'contain' || rootFitMode === 'cover' || rootFitMode === 'fill' || rootFitMode === 'tile' || rootFitMode === 'blur') {
                var url = getItemUrl(item);
                var filterStr = '';
                var b2 = (item.filter_brightness !== null && item.filter_brightness !== undefined) ? item.filter_brightness : 100;
                var c2 = (item.filter_contrast !== null && item.filter_contrast !== undefined) ? item.filter_contrast : 100;
                var sat2 = (item.filter_saturate !== null && item.filter_saturate !== undefined) ? item.filter_saturate : 100;
                filterStr = 'brightness(' + b2 + '%) contrast(' + c2 + '%) saturate(' + sat2 + '%) ';
                if (item.image_filter && item.image_filter !== 'none') {
                    var f2 = item.image_filter;
                    if (f2 === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (f2 === 'sepia') filterStr += 'sepia(100%) ';
                    else if (f2 === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                    else filterStr += f2 + ' ';
                }
                
                // FASE 3 FIX: Oplossing voor "Zwarte/Lelijke randen" bij video's. 
                // We gebruiken de video zelf (geschaald & vervaagd) als achtergrond-vuller!
                var isVideoBg = item.mime_type && item.mime_type.indexOf('video') === 0;
                if (isVideoBg) {
                    bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background:#000; z-index:1;"><video src="' + url + '" style="width:100%; height:100%; object-fit:cover; transform:scale(1.2); filter: blur(40px) saturate(2) brightness(0.6) ' + filterStr.trim() + ';" autoplay muted loop playsinline></video></div>';
                } else {
                    bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background:#000; z-index:1;"><img src="' + url + '" style="width:100%; height:100%; object-fit:cover; transform:scale(1.2); filter: blur(40px) saturate(2) brightness(0.6) ' + filterStr.trim() + ';"></div>';
                }
            } else if (rootFitMode === 'contain_color') {
                bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background-color:' + (item.background_color || '#000000') + '; z-index:1;"></div>';
            } else if (rootFitMode === 'contain_anim') {
                var bgId = (item.override_background_id !== null && item.override_background_id !== undefined) ? item.override_background_id : sObj.background_id;
                if (bgId && bgId != 0 && data.dictionaries && data.dictionaries.backgrounds) {
                    var bgObj = null;
                    for(var k=0; k<data.dictionaries.backgrounds.length; k++) {
                        if(data.dictionaries.backgrounds[k].id == bgId) { bgObj = data.dictionaries.backgrounds[k]; break; }
                    }
                    if (bgObj) {
                        if (bgObj.css_animation === 'bg-cinematic') {
                            var urlAnim = getItemUrl(item);
                            bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background:#000; z-index:1;"><img src="' + urlAnim + '" style="width:100%; height:100%; object-fit:cover; filter: blur(40px) saturate(2) brightness(0.6); animation: ssBgCinematicPulse 10s infinite alternate ease-in-out;"></div>';
                        } else {
                            bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background: ' + bgObj.fallback_color + '; z-index:1;"><div style="position:absolute; top:-10%; left:-10%; right:-10%; bottom:-10%; background: ' + bgObj.css_gradient + '; animation: ' + (bgObj.css_animation_keyframes && bgObj.css_animation_keyframes !== 'none' ? bgObj.css_animation + ' 15s infinite alternate ease-in-out' : 'none') + ';"></div></div>';
                        }
                    }
                }
            } else {
                bgHtml = '<div class="ss-tv-bg-layer ss-layer-2" style="background-color:#000000; z-index:1;"></div>';
            }

            var stageInnerStyle = 'position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; width:100%; height:100%;';
            var stageHtml = '';
            
            var numItems = data.items.length;
            var safeIdx = -1;
            for(var m=0; m<data.items.length; m++){ if(data.items[m].id === item.id){ safeIdx = m; break; } }

            var isDualLink = (item.settings && item.settings.dual_link);

            if (layout === 'split' || isDualLink) {
                var nextItemSplit = data.items[(safeIdx + 1) % numItems];
                // FASE 1 FIX (TV): Oude TVs snappen Flexbox GAP niet. We gebruiken position absolute.
                stageHtml = '<div style="' + stageInnerStyle + '"><div style="position:relative; width:100%; height:100%; padding: 0 2%; box-sizing:border-box;">' +
                    '<div style="position:absolute; left:2%; top:0; width:47%; height:100%; overflow:hidden;">' + buildMedia(item, '', false) + '</div>' +
                    '<div style="position:absolute; right:2%; top:0; width:47%; height:100%; overflow:hidden;">' + buildMedia(nextItemSplit, '', true) + '</div>' +
                '</div></div>';
            } else if (layout === 'pip') {
                var nextItemPip = data.items[(safeIdx + 1) % numItems];
                stageHtml = '<div style="' + stageInnerStyle + '"><div style="position:relative; width:100%; height:100%;">' +
                    '<div style="position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden;">' + buildMedia(item, 'width:100%; height:100%;', false) + '</div>' +
                    '<div style="position:absolute; bottom: 5%; right: 5%; width: 25%; aspect-ratio: 16/9; z-index:20; box-shadow: 0 40px 80px rgba(0,0,0,0.8); border-radius: 12px; overflow: hidden; border: 4px solid rgba(255,255,255,0.8);">' +
                        buildMedia(nextItemPip, '', true) +
                    '</div>' +
                '</div></div>';
            } else if (layout === 'grid') {
                var item2 = data.items[(safeIdx + 1) % numItems];
                var item3 = data.items[(safeIdx + 2) % numItems];
                var item4 = data.items[(safeIdx + 3) % numItems];
                stageHtml = '<div style="' + stageInnerStyle + '"><div style="display:grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width:100%; height:100%; box-sizing:border-box;">' +
                    '<div style="position:relative; width:100%; height:100%; overflow:hidden;">' + buildMedia(item, '', false) + '</div>' +
                    '<div style="position:relative; width:100%; height:100%; overflow:hidden;">' + buildMedia(item2, '', false) + '</div>' +
                    '<div style="position:relative; width:100%; height:100%; overflow:hidden;">' + buildMedia(item3, '', false) + '</div>' +
                    '<div style="position:relative; width:100%; height:100%; overflow:hidden;">' + buildMedia(item4, '', false) + '</div>' +
                '</div></div>';
            } else if (layout === 'carousel') {
                var prevIdx = (safeIdx - 1 + numItems) % numItems;
                var nextIdx = (safeIdx + 1) % numItems;
                var prevItemCar = data.items[prevIdx];
                var nextItemCar = data.items[nextIdx];

                stageHtml = '<div style="' + stageInnerStyle + ' perspective: 1200px; transform-style: preserve-3d; overflow:hidden;">' +
                    '<div style="position:absolute; left:-15%; width:50%; height:70%; opacity:0.4; transform: translate3d(0,0,-200px) rotateY(35deg); z-index:5; overflow:hidden;">' + buildMedia(prevItemCar, '', true) + '</div>' +
                    '<div style="z-index:15; width:60%; height:80%; transform: translate3d(0,0,50px); overflow:hidden;">' + buildMedia(item, '', false) + '</div>' +
                    '<div style="position:absolute; right:-15%; width:50%; height:70%; opacity:0.4; transform: translate3d(0,0,-200px) rotateY(-35deg); z-index:5; overflow:hidden;">' + buildMedia(nextItemCar, '', true) + '</div>' +
                '</div>';
            } else {
                stageHtml = '<div style="' + stageInnerStyle + '"><div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">' + buildMedia(item, '', false) + '</div></div>';
            }

            var overlayHtml = buildClockHTML(gSettings, item);

            return '<div style="position:absolute; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:transparent;">' +
                    bgHtml +
                    '<div class="ss-layer-media-scale" style="position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; z-index:10; transform: scale(' + renderScale + '); transform-origin: center center;">' +
                        stageHtml +
                    '</div>' +
                    '<div class="ss-layer-overlays" style="position:absolute; top:0; left:0; right:0; bottom:0; z-index:20; pointer-events:none;">' +
                        overlayHtml +
                    '</div>' +
                '</div>';
        }
    };
})();