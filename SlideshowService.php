<?php
// Pad: app/Services/SlideshowService.php

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: app/Services/SlideshowService.php */

require_once __DIR__ . '/../Config/Database.php';

class SlideshowService {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureDatabaseColumns();
    }

    private function ensureDatabaseColumns() {
        try {
            $this->db->query("SELECT folder_id FROM slideshows LIMIT 1");
        } catch (Exception $e) {
            @$this->db->query("ALTER TABLE slideshows ADD COLUMN folder_id INT NULL DEFAULT NULL AFTER album_id");
        }

        // FIX VOOR SQL ERROR: Voegt een Index toe zodat de ORDER BY queries geen "Out of sort memory" veroorzaken.
        try {
            @$this->db->query("ALTER TABLE slideshow_items ADD INDEX idx_ss_sort_order (slideshow_id, sort_order)");
        } catch (Exception $e) {
            // Als de index al bestaat, zal deze query stilletjes falen, wat prima is.
        }
    }

    // =========================================================================
    // --- AUTORISATIE HELPER ---
    // =========================================================================
    
    public function checkAccess($slideshowId, $userId, $allowedRoles = ['owner']) {
        $stmt = $this->db->prepare("SELECT user_id FROM slideshows WHERE id = ?");
        $stmt->execute([$slideshowId]);
        $owner = $stmt->fetchColumn();

        if (!$owner) throw new Exception("Slideshow niet gevonden.");

        if ($owner == $userId) return 'owner';

        $stmtCol = $this->db->prepare("SELECT role FROM slideshow_collaborators WHERE slideshow_id = ? AND user_id = ?");
        $stmtCol->execute([$slideshowId, $userId]);
        $role = $stmtCol->fetchColumn();

        if (!$role) throw new Exception("Je hebt geen toegang tot deze slideshow.");
        if (!in_array($role, $allowedRoles)) throw new Exception("Je huidige rol ($role) staat deze actie niet toe.");

        return $role;
    }

    // =========================================================================
    // --- OVERVIEW & CRUD ---
    // =========================================================================

    public function getOverview($userId) {
        $stmt = $this->db->prepare("
            SELECT s.*, a.views, a.total_watch_time_seconds,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(s.settings, '$.privacy')), 'public') as privacy,
            (SELECT COUNT(*) FROM slideshow_items si WHERE si.slideshow_id = s.id) as item_count,
            CASE WHEN s.user_id = ? THEN 'owner' ELSE sc.role END as my_role,
            u.username as owner_name
            FROM slideshows s
            LEFT JOIN slideshow_analytics a ON s.id = a.slideshow_id
            LEFT JOIN slideshow_collaborators sc ON s.id = sc.slideshow_id AND sc.user_id = ?
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.user_id = ? OR sc.user_id = ?
            ORDER BY s.updated_at DESC
        ");
        $stmt->execute([$userId, $userId, $userId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createSlideshow($userId, $title, $albumIds = [], $foldersExact = [], $foldersRecursive = []) {
        try {
            $this->db->beginTransaction();

            $uuid = bin2hex(random_bytes(16));
            
            $primaryAlbum = !empty($albumIds) ? $albumIds[0] : null;
            $primaryFolder = !empty($foldersExact) ? $foldersExact[0] : (!empty($foldersRecursive) ? $foldersRecursive[0] : null);
            
            $stmt = $this->db->prepare("
                INSERT INTO slideshows (uuid, user_id, album_id, folder_id, title, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())
            ");
            $stmt->execute([$uuid, $userId, $primaryAlbum, $primaryFolder, $title]);
            $slideshowId = $this->db->lastInsertId();

            $settings = [
                'default_duration' => 10,
                'transition_style' => 'fade',
                'sync_albums' => is_array($albumIds) ? $albumIds : [],
                'sync_folders_exact' => is_array($foldersExact) ? $foldersExact : [],
                'sync_folders_recursive' => is_array($foldersRecursive) ? $foldersRecursive : []
            ];
            
            $stmtSet = $this->db->prepare("UPDATE slideshows SET settings = ? WHERE id = ?");
            $stmtSet->execute([json_encode($settings), $slideshowId]);

            $stmtAna = $this->db->prepare("INSERT INTO slideshow_analytics (slideshow_id, views, total_watch_time_seconds) VALUES (?, 0, 0)");
            $stmtAna->execute([$slideshowId]);

            $this->logAction($slideshowId, $userId, "Slideshow '$title' aangemaakt.");

            if (!empty($albumIds) || !empty($foldersExact) || !empty($foldersRecursive)) {
                $this->syncSmartMedia($slideshowId);
            }

            $this->db->commit();
            return ['id' => $slideshowId, 'uuid' => $uuid];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e; 
        }
    }

    public function createAutoPlaySlideshow($userId, $sourceType, $sourceId) {
        $title = "Auto-Play: " . ucfirst($sourceType);
        $albumIds = $sourceType === 'album' ? [(int)$sourceId] : [];
        $foldersRecursive = $sourceType === 'folder' ? [(int)$sourceId] : [];

        $show = $this->createSlideshow($userId, $title, $albumIds, [], $foldersRecursive);
        $this->db->prepare("UPDATE slideshows SET status = 'active' WHERE id = ?")->execute([$show['id']]);
        
        return $show['uuid'];
    }

    public function deleteSlideshow($slideshowId, $userId) {
        $this->checkAccess($slideshowId, $userId, ['owner', 'co-owner']); 
        try {
            $this->db->beginTransaction();
            $this->db->prepare("DELETE FROM slideshow_items WHERE slideshow_id = ?")->execute([$slideshowId]);
            $this->db->prepare("DELETE FROM slideshow_analytics WHERE slideshow_id = ?")->execute([$slideshowId]);
            $this->db->prepare("DELETE FROM slideshow_collaborators WHERE slideshow_id = ?")->execute([$slideshowId]);
            $this->db->prepare("DELETE FROM slideshow_snapshots WHERE slideshow_id = ?")->execute([$slideshowId]);
            $this->db->prepare("DELETE FROM slideshow_logs WHERE slideshow_id = ?")->execute([$slideshowId]);
            $this->db->prepare("DELETE FROM slideshows WHERE id = ?")->execute([$slideshowId]);

            $cacheFile = sys_get_temp_dir() . '/filemanager_cache/slideshow_' . $slideshowId . '_presence.json';
            if (file_exists($cacheFile)) @unlink($cacheFile);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // =========================================================================
    // --- SMART SYNC & SUBMAP ENGINE ---
    // =========================================================================

    private function getSubfolderIds($parentIds) {
        if (empty($parentIds)) return [];
        $allIds = $parentIds;
        $currentParents = $parentIds;
        
        while (!empty($currentParents)) {
            $in = str_repeat('?,', count($currentParents) - 1) . '?';
            $stmt = $this->db->prepare("SELECT id FROM folders WHERE parent_id IN ($in) AND deleted_at IS NULL");
            $stmt->execute($currentParents);
            $children = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (!empty($children)) {
                $allIds = array_merge($allIds, $currentParents);
                $currentParents = $children;
            } else {
                break;
            }
        }
        return array_unique($allIds);
    }

    public function syncSmartMedia($slideshowId) {
        $stmt = $this->db->prepare("SELECT user_id, settings FROM slideshows WHERE id = ?");
        $stmt->execute([$slideshowId]);
        $show = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$show) return;
        $settings = json_decode($show['settings'] ?? '{}', true) ?: [];

        $albumIds = $settings['sync_albums'] ?? [];
        $foldersExact = $settings['sync_folders_exact'] ?? ($settings['sync_folders'] ?? []); 
        $foldersRecursive = $settings['sync_folders_recursive'] ?? [];

        $newFiles = [];

        if (!empty($albumIds)) {
            $in = str_repeat('?,', count($albumIds) - 1) . '?';
            $stmtAlb = $this->db->prepare("SELECT file_id FROM album_files WHERE album_id IN ($in)");
            $stmtAlb->execute($albumIds);
            $res = $stmtAlb->fetchAll(PDO::FETCH_COLUMN);
            if ($res) $newFiles = array_merge($newFiles, $res);
        }

        $allFolderIdsToQuery = $foldersExact;
        if (!empty($foldersRecursive)) {
            $withSubfolders = $this->getSubfolderIds($foldersRecursive);
            $allFolderIdsToQuery = array_merge($allFolderIdsToQuery, $withSubfolders);
        }
        $allFolderIdsToQuery = array_unique($allFolderIdsToQuery);

        if (!empty($allFolderIdsToQuery)) {
            $in = str_repeat('?,', count($allFolderIdsToQuery) - 1) . '?';
            $query = "SELECT id FROM files WHERE folder_id IN ($in) AND deleted_at IS NULL AND (mime_type LIKE 'image/%' OR mime_type LIKE 'video/%')";
            $stmtFol = $this->db->prepare($query);
            $stmtFol->execute($allFolderIdsToQuery);
            $res = $stmtFol->fetchAll(PDO::FETCH_COLUMN);
            if ($res) $newFiles = array_merge($newFiles, $res);
        }

        $newFiles = array_unique($newFiles);
        if (empty($newFiles)) return;

        $existingStmt = $this->db->prepare("SELECT file_id FROM slideshow_items WHERE slideshow_id = ?");
        $existingStmt->execute([$slideshowId]);
        $existingFiles = $existingStmt->fetchAll(PDO::FETCH_COLUMN);

        $diffFiles = array_diff($newFiles, $existingFiles);
        if (empty($diffFiles)) return;

        $maxOrder = $this->db->query("SELECT MAX(sort_order) FROM slideshow_items WHERE slideshow_id = $slideshowId")->fetchColumn();
        $sort = ($maxOrder !== false && $maxOrder !== null) ? $maxOrder + 1 : 0;

        $insertItem = $this->db->prepare("
            INSERT INTO slideshow_items 
            (slideshow_id, file_id, sort_order, duration, fit_mode, layout_type, focal_point, is_active) 
            VALUES (?, ?, ?, 5, 'contain', 'full', 'center', 1)
        ");

        $addedCount = 0;
        foreach ($diffFiles as $fileId) {
            try {
                $insertItem->execute([$slideshowId, $fileId, $sort]);
                $sort++;
                $addedCount++;
            } catch (Exception $e) { } 
        }

        if ($addedCount > 0) {
            $this->db->prepare("UPDATE slideshows SET updated_at = NOW() WHERE id = ?")->execute([$slideshowId]);
        }
    }

    // =========================================================================
    // --- EDITOR LOGICA ---
    // =========================================================================

    public function lockSlideshow($slideshowId, $userId) {
        $stmt = $this->db->prepare("SELECT locked_by, locked_at FROM slideshows WHERE id = ?");
        $stmt->execute([$slideshowId]);
        $lock = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($lock && $lock['locked_by'] && $lock['locked_by'] != $userId) {
            $lockedTime = strtotime($lock['locked_at']);
            if (time() - $lockedTime < 120) {
                return false; 
            }
        }

        $upd = $this->db->prepare("UPDATE slideshows SET locked_by = ?, locked_at = NOW() WHERE id = ?");
        $upd->execute([$userId, $slideshowId]);
        return true;
    }

    public function unlockSlideshow($slideshowId, $userId) {
        $upd = $this->db->prepare("UPDATE slideshows SET locked_by = NULL, locked_at = NULL WHERE id = ? AND locked_by = ?");
        return $upd->execute([$slideshowId, $userId]);
    }

    public function getEditorData($slideshowId, $userId) {
        $myRole = 'viewer';
        
        if ($userId !== 0) {
            $myRole = $this->checkAccess($slideshowId, $userId, ['viewer', 'editor', 'redacteur', 'co-owner', 'owner']);
        }
        
        $this->syncSmartMedia($slideshowId);

        $stmt = $this->db->prepare("SELECT * FROM slideshows WHERE id = ?");
        $stmt->execute([$slideshowId]);
        $slideshow = $stmt->fetch(PDO::FETCH_ASSOC);

        $itemStmt = $this->db->prepare("
            SELECT si.*, f.original_name, f.mime_type, f.size, f.storage_name, f.file_hash 
            FROM slideshow_items si
            LEFT JOIN files f ON si.file_id = f.id
            WHERE si.slideshow_id = ?
            ORDER BY si.sort_order ASC
        ");
        $itemStmt->execute([$slideshowId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (isset($slideshow['settings']) && is_string($slideshow['settings'])) {
             $decodedSlideSettings = json_decode($slideshow['settings'], true);
             $slideshow['settings'] = (json_last_error() === JSON_ERROR_NONE) ? $decodedSlideSettings : [];
        } elseif (!isset($slideshow['settings'])) {
             $slideshow['settings'] = [];
        }

        $slideshow['privacy'] = $slideshow['settings']['privacy'] ?? 'public';
        
        $slideshow['watermark_text'] = $slideshow['watermark_text'] ?? null;
        $slideshow['watermark_pos'] = $slideshow['watermark_pos'] ?? 'bottom-right';
        $slideshow['watermark_opacity'] = $slideshow['watermark_opacity'] ?? 100;
        $slideshow['watermark_color'] = $slideshow['watermark_color'] ?? '#ffffff';
        $slideshow['watermark_bg'] = $slideshow['watermark_bg'] ?? 'transparent';
        $slideshow['watermark_font'] = $slideshow['watermark_font'] ?? 'Inter';
        $slideshow['watermark_size'] = $slideshow['watermark_size'] ?? 'normal';
        $slideshow['watermark_shadow'] = $slideshow['watermark_shadow'] ?? 1;
        $slideshow['watermark_margin'] = $slideshow['watermark_margin'] ?? 20;
        $slideshow['watermark_anim'] = $slideshow['watermark_anim'] ?? 'none';
        $slideshow['watermark_conditions'] = $slideshow['watermark_conditions'] ?? 'all';
        $slideshow['watermark_image_id'] = $slideshow['watermark_image_id'] ?? null;

        foreach ($items as &$item) {
            if (!empty($item['storage_name'])) {
                $item['file_url'] = '/storage/uploads/' . $item['storage_name'];
            } else {
                $item['file_url'] = '/api/files/download?id=' . $item['file_id'] . '&view=1';
            }

            if (isset($item['settings']) && is_string($item['settings'])) {
                $decoded = json_decode($item['settings'], true);
                $item['settings'] = (json_last_error() === JSON_ERROR_NONE) ? $decoded : [];
            } elseif (!isset($item['settings'])) {
                $item['settings'] = [];
            }
        }
        unset($item);

        $radios = $this->db->query("SELECT id, name, logo_url, stream_url FROM sys_radios WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
        $transitions = $this->db->query("SELECT id, name, css_class FROM sys_transitions WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
        $backgrounds = $this->db->query("SELECT id, name, css_animation, fallback_color, css_gradient, css_animation_keyframes FROM sys_backgrounds WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
        $clocks = $this->db->query("SELECT id, name, type, css_style, css_code, svg_code FROM sys_clocks WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
        
        $logsStmt = $this->db->prepare("
            SELECT sl.action, sl.timestamp, u.username 
            FROM slideshow_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
            WHERE sl.slideshow_id = ? 
            ORDER BY sl.timestamp DESC LIMIT 50
        ");
        $logsStmt->execute([$slideshowId]);
        $logs = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

        $snapsStmt = $this->db->prepare("
            SELECT s.id, s.slideshow_id, s.created_by, s.title, s.subject, s.created_at, s.snapshot_data, u.username as creator_name
            FROM slideshow_snapshots s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.slideshow_id = ?
            ORDER BY s.created_at DESC
        ");
        $snapsStmt->execute([$slideshowId]);
        $snapshots = $snapsStmt->fetchAll(PDO::FETCH_ASSOC);

        $slideshow['my_role'] = $myRole;

        return [
            'slideshow' => $slideshow,
            'items' => $items,
            'dictionaries' => [
                'radios' => $radios,
                'transitions' => $transitions,
                'backgrounds' => $backgrounds,
                'clocks' => $clocks
            ],
            'logs' => $logs,
            'snapshots' => $snapshots
        ];
    }

    public function saveSettings($slideshowId, $userId, $settings, $logMessage = null) {
        $this->checkAccess($slideshowId, $userId, ['editor', 'redacteur', 'co-owner', 'owner']);

        $stmtExisting = $this->db->prepare("SELECT settings FROM slideshows WHERE id = ?");
        $stmtExisting->execute([$slideshowId]);
        $existingDbSettings = json_decode($stmtExisting->fetchColumn() ?: '{}', true) ?: [];

        $jsonSettings = $settings['settings'] ?? [];
        if (is_string($jsonSettings)) {
            $jsonSettings = json_decode($jsonSettings, true) ?: [];
        }
        
        // FASE 1 FIX: Voeg de voortgangsbalk (progress_bar) ook expliciet toe aan de whitelist voor settings
        $nonDbColumns = ['custom_logo_path', 'pinned_snapshots', 'privacy', 'sync_folders_exact', 'sync_folders_recursive', 'sync_albums', 'progress_bar', 'ui_state'];
        foreach ($nonDbColumns as $col) {
            if (array_key_exists($col, $settings)) {
                $jsonSettings[$col] = $settings[$col];
            }
        }

        // Zorg dat we geneste array structuur in $jsonSettings oplossen als er stringified sub-arrays zitten
        foreach ($jsonSettings as $key => $value) {
             if (is_string($value) && (strpos($value, '{') === 0 || strpos($value, '[') === 0)) {
                 $decoded = json_decode($value, true);
                 if (json_last_error() === JSON_ERROR_NONE) {
                     $jsonSettings[$key] = $decoded;
                 }
             }
        }

        $finalSettingsJson = json_encode(array_merge($existingDbSettings, $jsonSettings));

        $query = "UPDATE slideshows SET 
            title = ?, theme_mode = ?, allow_video = ?, 
            radio_station_id = ?, clock_id = ?, background_id = ?, cover_file_id = ?, settings = ?,
            editor_layout = ?, shuffle_enabled = ?, status = 'active', updated_at = NOW(),
            locked_at = NOW(),
            watermark_opacity = ?, watermark_font = ?, watermark_size = ?, watermark_color = ?, 
            watermark_bg = ?, watermark_image_id = ?, watermark_shadow = ?, watermark_margin = ?, 
            watermark_anim = ?, watermark_conditions = ?, watermark_text = ?, watermark_pos = ?";
            
        $params = [
            $settings['title'] ?? 'Naamloos',
            $settings['theme_mode'] ?? 'light',
            isset($settings['allow_video']) ? (int)$settings['allow_video'] : 1,
            $settings['radio_station_id'] ?? null,
            $settings['clock_id'] ?? null,
            $settings['background_id'] ?? null,
            $settings['cover_file_id'] ?? null,
            $finalSettingsJson,
            $settings['editor_layout'] ?? 'classic',
            isset($settings['shuffle_enabled']) ? (int)$settings['shuffle_enabled'] : 0,
            
            $settings['watermark_opacity'] ?? 100,
            $settings['watermark_font'] ?? 'Inter',
            $settings['watermark_size'] ?? 'normal',
            $settings['watermark_color'] ?? '#ffffff',
            $settings['watermark_bg'] ?? 'transparent',
            $settings['watermark_image_id'] ?? null,
            isset($settings['watermark_shadow']) ? (int)$settings['watermark_shadow'] : 1,
            $settings['watermark_margin'] ?? 20,
            $settings['watermark_anim'] ?? 'none',
            $settings['watermark_conditions'] ?? 'all',
            $settings['watermark_text'] ?? null,
            $settings['watermark_pos'] ?? 'bottom-right'
        ];

        if (isset($settings['privacy']) && $settings['privacy'] === 'public') {
            $query .= ", pincode_hash = NULL";
        } elseif (!empty($settings['password'])) {
            $passHash = password_hash($settings['password'], PASSWORD_DEFAULT);
            $query .= ", pincode_hash = ?";
            $params[] = $passHash;
        }

        $query .= " WHERE id = ?";
        $params[] = $slideshowId;

        $upd = $this->db->prepare($query);
        $res = $upd->execute($params);

        if ($res && $logMessage) {
            $this->logAction($slideshowId, $userId, $logMessage);
        }

        $this->syncSmartMedia($slideshowId);

        return $res;
    }

    public function saveDeltaItems($slideshowId, $userId, $deltaItems, $logMessage = null) {
        $this->checkAccess($slideshowId, $userId, ['editor', 'redacteur', 'co-owner', 'owner']);
        if (empty($deltaItems)) return true;

        $stmt = $this->db->prepare("
            INSERT INTO slideshow_items 
            (id, slideshow_id, file_id, sort_order, duration, transition_id, fit_mode, layout_type, focal_point, animation_bg, is_active, trim_start, trim_end, background_color, settings, chapter_name, parent_id,
             crop_x, crop_y, crop_w, crop_h, focus_x, focus_y, filter_brightness, filter_contrast, filter_saturate, transform_rotate, transform_flip_x, transform_flip_y,
             media_scale, override_clock_id, override_background_id, override_watermark) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            sort_order = VALUES(sort_order), duration = VALUES(duration), transition_id = VALUES(transition_id), 
            fit_mode = VALUES(fit_mode), layout_type = VALUES(layout_type), focal_point = VALUES(focal_point), animation_bg = VALUES(animation_bg),
            is_active = VALUES(is_active), trim_start = VALUES(trim_start), trim_end = VALUES(trim_end), background_color = VALUES(background_color), settings = VALUES(settings),
            chapter_name = VALUES(chapter_name), parent_id = VALUES(parent_id),
            crop_x = VALUES(crop_x), crop_y = VALUES(crop_y), crop_w = VALUES(crop_w), crop_h = VALUES(crop_h),
            focus_x = VALUES(focus_x), focus_y = VALUES(focus_y),
            filter_brightness = VALUES(filter_brightness), filter_contrast = VALUES(filter_contrast), filter_saturate = VALUES(filter_saturate),
            transform_rotate = VALUES(transform_rotate), transform_flip_x = VALUES(transform_flip_x), transform_flip_y = VALUES(transform_flip_y),
            media_scale = VALUES(media_scale), override_clock_id = VALUES(override_clock_id), override_background_id = VALUES(override_background_id), override_watermark = VALUES(override_watermark)
        ");

        foreach ($deltaItems as $item) {
            $itemId = (isset($item['id']) && is_numeric($item['id'])) ? (int)$item['id'] : null;

            $stmt->execute([
                $itemId,
                (int)$slideshowId,
                (int)$item['file_id'],
                (int)($item['sort_order'] ?? 0),
                (isset($item['duration']) && $item['duration'] !== 'auto' && $item['duration'] !== '') ? (int)$item['duration'] : null,
                (isset($item['transition_id']) && $item['transition_id'] !== '') ? (int)$item['transition_id'] : null,
                isset($item['fit_mode']) && $item['fit_mode'] !== '' ? $item['fit_mode'] : 'contain',
                isset($item['layout_type']) && $item['layout_type'] !== '' ? $item['layout_type'] : 'full',
                isset($item['focal_point']) && $item['focal_point'] !== '' ? $item['focal_point'] : 'center',
                isset($item['animation_bg']) && $item['animation_bg'] !== '' ? $item['animation_bg'] : null,
                (isset($item['is_active']) && $item['is_active'] !== '') ? (int)$item['is_active'] : 1,
                (isset($item['trim_start']) && $item['trim_start'] !== '') ? (float)$item['trim_start'] : null,
                (isset($item['trim_end']) && $item['trim_end'] !== '') ? (float)$item['trim_end'] : null,
                isset($item['background_color']) && $item['background_color'] !== '' ? $item['background_color'] : null,
                isset($item['settings']) ? (is_array($item['settings']) ? json_encode($item['settings']) : $item['settings']) : null,
                isset($item['chapter_name']) && $item['chapter_name'] !== '' ? $item['chapter_name'] : null,
                (isset($item['parent_id']) && $item['parent_id'] !== '') ? (int)$item['parent_id'] : null,
                
                (isset($item['crop_x']) && $item['crop_x'] !== '') ? (float)$item['crop_x'] : null,
                (isset($item['crop_y']) && $item['crop_y'] !== '') ? (float)$item['crop_y'] : null,
                (isset($item['crop_w']) && $item['crop_w'] !== '') ? (float)$item['crop_w'] : null,
                (isset($item['crop_h']) && $item['crop_h'] !== '') ? (float)$item['crop_h'] : null,
                (isset($item['focus_x']) && $item['focus_x'] !== '') ? (float)$item['focus_x'] : null,
                (isset($item['focus_y']) && $item['focus_y'] !== '') ? (float)$item['focus_y'] : null,
                (isset($item['filter_brightness']) && $item['filter_brightness'] !== '') ? (int)$item['filter_brightness'] : 100,
                (isset($item['filter_contrast']) && $item['filter_contrast'] !== '') ? (int)$item['filter_contrast'] : 100,
                (isset($item['filter_saturate']) && $item['filter_saturate'] !== '') ? (int)$item['filter_saturate'] : 100,
                (isset($item['transform_rotate']) && $item['transform_rotate'] !== '') ? (int)$item['transform_rotate'] : 0,
                (isset($item['transform_flip_x']) && $item['transform_flip_x'] !== '') ? (int)$item['transform_flip_x'] : 1,
                (isset($item['transform_flip_y']) && $item['transform_flip_y'] !== '') ? (int)$item['transform_flip_y'] : 1,

                (isset($item['media_scale']) && $item['media_scale'] !== '') ? (float)$item['media_scale'] : null,
                (isset($item['override_clock_id']) && $item['override_clock_id'] !== '') ? (int)$item['override_clock_id'] : null,
                (isset($item['override_background_id']) && $item['override_background_id'] !== '') ? (int)$item['override_background_id'] : null,
                (isset($item['override_watermark']) && $item['override_watermark'] !== '') ? (int)$item['override_watermark'] : null
            ]);
        }
        
        if ($logMessage) {
            $this->logAction($slideshowId, $userId, $logMessage);
        } else {
            $this->logAction($slideshowId, $userId, "Heeft " . count($deltaItems) . " dia('s) gewijzigd/toegevoegd.");
        }

        return true;
    }

    public function removeItems($slideshowId, $userId, $itemIds) {
        $this->checkAccess($slideshowId, $userId, ['editor', 'redacteur', 'co-owner', 'owner']);
        
        $cleanIds = array_filter($itemIds, 'is_numeric');
        if (empty($cleanIds)) return false;
        
        $placeholders = implode(',', array_fill(0, count($cleanIds), '?'));
        $stmt = $this->db->prepare("DELETE FROM slideshow_items WHERE slideshow_id = ? AND id IN ($placeholders)");
        
        $params = array_merge([$slideshowId], $cleanIds);
        $res = $stmt->execute($params);
        if ($res) $this->logAction($slideshowId, $userId, count($cleanIds) . " dia('s) verwijderd uit presentatie.");
        return $res;
    }

    // =========================================================================
    // --- COLLABORATORS, SNAPSHOTS & HEARTBEAT ---
    // =========================================================================

    public function addCollaborator($slideshowId, $ownerId, $targetUserId, $role = 'editor') {
        $this->checkAccess($slideshowId, $ownerId, ['co-owner', 'owner']);
        $stmt = $this->db->prepare("INSERT INTO slideshow_collaborators (slideshow_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?");
        return $stmt->execute([$slideshowId, $targetUserId, $role, $role]);
    }

    public function removeCollaborator($slideshowId, $ownerId, $targetUserId) {
        $this->checkAccess($slideshowId, $ownerId, ['co-owner', 'owner']);
        $stmt = $this->db->prepare("DELETE FROM slideshow_collaborators WHERE slideshow_id = ? AND user_id = ?");
        return $stmt->execute([$slideshowId, $targetUserId]);
    }

    public function createSnapshot($slideshowId, $userId, $title, $subject) {
        $this->checkAccess($slideshowId, $userId, ['editor', 'redacteur', 'co-owner', 'owner']);

        $stmt = $this->db->prepare("SELECT * FROM slideshows WHERE id = ?");
        $stmt->execute([$slideshowId]);
        $slideshow = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmtItems = $this->db->prepare("SELECT * FROM slideshow_items WHERE slideshow_id = ? ORDER BY sort_order ASC");
        $stmtItems->execute([$slideshowId]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        $jsonData = json_encode(['slideshow' => $slideshow, 'items' => $items]);

        $snap = $this->db->prepare("INSERT INTO slideshow_snapshots (slideshow_id, created_by, title, subject, snapshot_data, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $snap->execute([$slideshowId, $userId, $title, $subject, $jsonData]);

        $this->logAction($slideshowId, $userId, "Snapshot '$title' vastgelegd.");

        $settings = json_decode($slideshow['settings'] ?? '{}', true);
        $pinnedIds = $settings['pinned_snapshots'] ?? [];

        $countStmt = $this->db->prepare("SELECT id FROM slideshow_snapshots WHERE slideshow_id = ? ORDER BY created_at DESC");
        $countStmt->execute([$slideshowId]);
        $allSnaps = $countStmt->fetchAll(PDO::FETCH_COLUMN);

        $unpinnedSnaps = array_diff($allSnaps, $pinnedIds);

        if (count($unpinnedSnaps) > 10) {
            $toDelete = array_slice($unpinnedSnaps, 10);
            if (!empty($toDelete)) {
                $inQuery = implode(',', array_fill(0, count($toDelete), '?'));
                $delStmt = $this->db->prepare("DELETE FROM slideshow_snapshots WHERE id IN ($inQuery)");
                $delStmt->execute($toDelete);
            }
        }

        return true;
    }

    public function restoreSnapshot($slideshowId, $userId, $snapshotId) {
        $this->checkAccess($slideshowId, $userId, ['co-owner', 'editor', 'redacteur', 'owner']);

        $stmt = $this->db->prepare("SELECT snapshot_data FROM slideshow_snapshots WHERE id = ? AND slideshow_id = ?");
        $stmt->execute([$snapshotId, $slideshowId]);
        $snapshot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$snapshot) throw new Exception("Snapshot niet gevonden of gecorrumpeerd.");

        $data = json_decode($snapshot['snapshot_data'], true);

        try {
            $this->db->beginTransaction();
            
            if (isset($data['slideshow'])) {
                $this->saveSettings($slideshowId, $userId, $data['slideshow'], null);
            }

            $this->db->prepare("DELETE FROM slideshow_items WHERE slideshow_id = ?")->execute([$slideshowId]);
            
            if (isset($data['items']) && is_array($data['items'])) {
                $insertStmt = $this->db->prepare("
                    INSERT INTO slideshow_items 
                    (slideshow_id, file_id, sort_order, duration, transition_id, fit_mode, layout_type, focal_point, animation_bg, is_active, trim_start, trim_end, background_color, settings, chapter_name, parent_id,
                     crop_x, crop_y, crop_w, crop_h, focus_x, focus_y, filter_brightness, filter_contrast, filter_saturate, transform_rotate, transform_flip_x, transform_flip_y,
                     media_scale, override_clock_id, override_background_id, override_watermark) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($data['items'] as $item) {
                    $insertStmt->execute([
                        $slideshowId,
                        (int)$item['file_id'],
                        (int)($item['sort_order'] ?? 0),
                        (isset($item['duration']) && $item['duration'] !== 'auto' && $item['duration'] !== '') ? (int)$item['duration'] : null,
                        (isset($item['transition_id']) && $item['transition_id'] !== '') ? (int)$item['transition_id'] : null,
                        isset($item['fit_mode']) && $item['fit_mode'] !== '' ? $item['fit_mode'] : 'contain',
                        isset($item['layout_type']) && $item['layout_type'] !== '' ? $item['layout_type'] : 'full',
                        isset($item['focal_point']) && $item['focal_point'] !== '' ? $item['focal_point'] : 'center',
                        isset($item['animation_bg']) && $item['animation_bg'] !== '' ? $item['animation_bg'] : null,
                        (isset($item['is_active']) && $item['is_active'] !== '') ? (int)$item['is_active'] : 1,
                        (isset($item['trim_start']) && $item['trim_start'] !== '') ? (float)$item['trim_start'] : null,
                        (isset($item['trim_end']) && $item['trim_end'] !== '') ? (float)$item['trim_end'] : null,
                        isset($item['background_color']) && $item['background_color'] !== '' ? $item['background_color'] : null,
                        isset($item['settings']) ? (is_string($item['settings']) ? $item['settings'] : json_encode($item['settings'])) : null,
                        isset($item['chapter_name']) && $item['chapter_name'] !== '' ? $item['chapter_name'] : null,
                        (isset($item['parent_id']) && $item['parent_id'] !== '') ? (int)$item['parent_id'] : null,
                        
                        (isset($item['crop_x']) && $item['crop_x'] !== '') ? (float)$item['crop_x'] : null,
                        (isset($item['crop_y']) && $item['crop_y'] !== '') ? (float)$item['crop_y'] : null,
                        (isset($item['crop_w']) && $item['crop_w'] !== '') ? (float)$item['crop_w'] : null,
                        (isset($item['crop_h']) && $item['crop_h'] !== '') ? (float)$item['crop_h'] : null,
                        (isset($item['focus_x']) && $item['focus_x'] !== '') ? (float)$item['focus_x'] : null,
                        (isset($item['focus_y']) && $item['focus_y'] !== '') ? (float)$item['focus_y'] : null,
                        (isset($item['filter_brightness']) && $item['filter_brightness'] !== '') ? (int)$item['filter_brightness'] : 100,
                        (isset($item['filter_contrast']) && $item['filter_contrast'] !== '') ? (int)$item['filter_contrast'] : 100,
                        (isset($item['filter_saturate']) && $item['filter_saturate'] !== '') ? (int)$item['filter_saturate'] : 100,
                        (isset($item['transform_rotate']) && $item['transform_rotate'] !== '') ? (int)$item['transform_rotate'] : 0,
                        (isset($item['transform_flip_x']) && $item['transform_flip_x'] !== '') ? (int)$item['transform_flip_x'] : 1,
                        (isset($item['transform_flip_y']) && $item['transform_flip_y'] !== '') ? (int)$item['transform_flip_y'] : 1,
                        
                        (isset($item['media_scale']) && $item['media_scale'] !== '') ? (float)$item['media_scale'] : null,
                        (isset($item['override_clock_id']) && $item['override_clock_id'] !== '') ? (int)$item['override_clock_id'] : null,
                        (isset($item['override_background_id']) && $item['override_background_id'] !== '') ? (int)$item['override_background_id'] : null,
                        (isset($item['override_watermark']) && $item['override_watermark'] !== '') ? (int)$item['override_watermark'] : null
                    ]);
                }
            }

            $this->logAction($slideshowId, $userId, "Time Machine herstel uitgevoerd.");
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function logAction($slideshowId, $userId, $action) {
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM slideshow_logs WHERE slideshow_id = ?");
        $countStmt->execute([$slideshowId]);
        if ($countStmt->fetchColumn() >= 50) {
            $this->db->prepare("DELETE FROM slideshow_logs WHERE slideshow_id = ? ORDER BY timestamp ASC LIMIT 1")->execute([$slideshowId]);
        }

        $stmt = $this->db->prepare("INSERT INTO slideshow_logs (slideshow_id, user_id, action, timestamp) VALUES (?, ?, ?, NOW())");
        return $stmt->execute([$slideshowId, $userId, $action]);
    }

    // =========================================================================
    // --- ANALYTICS TRACKING & STATS ---
    // =========================================================================

    public function trackView($slideshowId, $watchTimeSeconds) {
        return $this->trackItemView($slideshowId, null, $watchTimeSeconds);
    }

    public function trackItemView($slideshowId, $itemId, $watchTimeSeconds) {
        $stmt = $this->db->prepare("
            UPDATE slideshow_analytics 
            SET views = views + 1, 
                total_watch_time_seconds = total_watch_time_seconds + ?, 
                last_viewed_at = NOW() 
            WHERE slideshow_id = ?
        ");
        $stmt->execute([$watchTimeSeconds, $slideshowId]);

        if ($itemId && is_numeric($itemId)) {
            $stmtItem = $this->db->prepare("
                UPDATE slideshow_items 
                SET views = views + 1, 
                    watch_time = watch_time + ? 
                WHERE id = ? AND slideshow_id = ?
            ");
            $stmtItem->execute([$watchTimeSeconds, $itemId, $slideshowId]);
        }
        return true;
    }

    // =========================================================================
    // --- PRESENCE & OVERIGE SYNCS ---
    // =========================================================================

    public function processHeartbeat($slideshowId, $userId, $cursorX, $cursorY, $action = null) {
        $cacheDir = sys_get_temp_dir() . '/filemanager_cache';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0777, true);
        }
        
        $cacheFile = $cacheDir . '/slideshow_' . $slideshowId . '_presence.json';
        
        $fp = fopen($cacheFile, "c+");
        if (!$fp) return [];
        
        $presence = [];
        
        if (flock($fp, LOCK_EX)) {
            $filesize = filesize($cacheFile);
            $content = $filesize > 0 ? fread($fp, $filesize) : '';
            $presence = $content ? json_decode($content, true) : [];
            if (!is_array($presence)) $presence = [];

            $stmt = $this->db->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $username = $stmt->fetchColumn() ?: 'Collega';

            $now = time();
            $presence[$userId] = [
                'id' => $userId,
                'name' => $username,
                'color' => '#' . substr(md5((string)$userId), 0, 6), 
                'x' => $cursorX,
                'y' => $cursorY,
                'action' => $action,
                'last_seen' => $now
            ];

            foreach ($presence as $uid => $data) {
                if ($now - $data['last_seen'] > 10) {
                    unset($presence[$uid]);
                }
            }

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($presence));
            flock($fp, LOCK_UN);
        }
        fclose($fp);

        $others = $presence;
        unset($others[$userId]);
        
        return array_values($others);
    }

    public function getSnapshotDiff($slideshowId, $snapshotId, $userId) {
        $this->checkAccess($slideshowId, $userId, ['viewer', 'editor', 'redacteur', 'co-owner', 'owner']);

        $stmt = $this->db->prepare("SELECT snapshot_data, title, created_at FROM slideshow_snapshots WHERE id = ? AND slideshow_id = ?");
        $stmt->execute([$snapshotId, $slideshowId]);
        $snapshot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$snapshot) throw new Exception("Snapshot niet gevonden of is gecorrumpeerd.");

        $data = json_decode($snapshot['snapshot_data'], true);
        $oldItems = $data['items'] ?? [];

        $stmtCurrent = $this->db->prepare("SELECT * FROM slideshow_items WHERE slideshow_id = ? ORDER BY sort_order ASC");
        $stmtCurrent->execute([$slideshowId]);
        $currentItems = $stmtCurrent->fetchAll(PDO::FETCH_ASSOC);

        $diff = [
            'snapshot_title' => $snapshot['title'],
            'snapshot_date' => $snapshot['created_at'],
            'added' => 0,
            'removed' => 0,
            'modified' => 0,
            'details' => []
        ];

        $oldMap = [];
        foreach ($oldItems as $o) $oldMap[$o['file_id']] = $o; 

        $currentMap = [];
        foreach ($currentItems as $c) $currentMap[$c['file_id']] = $c;

        foreach ($currentMap as $fileId => $c) {
            if (!isset($oldMap[$fileId])) {
                $diff['added']++;
                $diff['details'][] = "Nieuwe dia toegevoegd op positie " . ($c['sort_order'] + 1);
            } else {
                $o = $oldMap[$fileId];
                $isModified = false;
                
                if (($c['transition_id'] ?? null) != ($o['transition_id'] ?? null)) $isModified = true;
                if (($c['duration'] ?? 'auto') != ($o['duration'] ?? 'auto')) $isModified = true;
                if ($c['sort_order'] != $o['sort_order']) $isModified = true;
                if (($c['layout_type'] ?? 'full') != ($o['layout_type'] ?? 'full')) $isModified = true;
                if (($c['focal_point'] ?? 'center') != ($o['focal_point'] ?? 'center')) $isModified = true;
                if (($c['filter_brightness'] ?? 100) != ($o['filter_brightness'] ?? 100)) $isModified = true;
                if (($c['crop_w'] ?? null) != ($o['crop_w'] ?? null)) $isModified = true;
                if (($c['media_scale'] ?? null) != ($o['media_scale'] ?? null)) $isModified = true;
                
                if ($isModified) {
                    $diff['modified']++;
                    $diff['details'][] = "Dia op positie " . ($c['sort_order'] + 1) . " instellingen of effecten gewijzigd.";
                }
            }
        }

        foreach ($oldMap as $fileId => $o) {
            if (!isset($currentMap[$fileId])) {
                $diff['removed']++;
                $diff['details'][] = "Dia verwijderd uit presentatie (Oorspronkelijke positie: " . ($o['sort_order'] + 1) . ")";
            }
        }

        return $diff;
    }

    public function getSlideshowPlayData($id) {
        $this->syncSmartMedia($id);

        $stmt = $this->db->prepare("SELECT * FROM slideshows WHERE id = ?");
        $stmt->execute([$id]);
        $slideshow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$slideshow) throw new Exception("Slideshow niet gevonden.");

        $settings = json_decode($slideshow['settings'] ?? '{}', true);

        $stmtItems = $this->db->prepare("
            SELECT si.*, f.storage_name, f.original_name, f.extension, f.mime_type, f.size 
            FROM slideshow_items si
            JOIN files f ON si.file_id = f.id
            WHERE si.slideshow_id = ? AND si.is_active = 1 AND f.deleted_at IS NULL
            ORDER BY si.sort_order ASC
        ");
        $stmtItems->execute([$id]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as &$item) {
            // FIX: De TV Speler gebruikt NU ALTIJD de directe '/storage/uploads/' link indien mogelijk.
            if (!empty($item['storage_name'])) {
                $item['file_url'] = '/storage/uploads/' . $item['storage_name'];
            } else {
                $item['file_url'] = '/api/files/download?id=' . $item['file_id'] . '&view=1';
            }
            $item['type'] = (strpos($item['mime_type'], 'video') !== false) ? 'video' : 'image';
        }

        return [
            'slideshow' => [
                'id' => $slideshow['id'],
                'title' => $slideshow['title'],
                'updated_at' => $slideshow['updated_at'],
                'editor_layout' => $slideshow['editor_layout'] ?? 'classic',
                'shuffle_enabled' => $slideshow['shuffle_enabled'] ?? 0
            ],
            'settings' => $settings,
            'items' => $items
        ];
    }
}
?>