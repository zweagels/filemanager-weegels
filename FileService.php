<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: app/Services/FileService.php */

require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/MimeTypes.php';
require_once __DIR__ . '/../Config/Constants.php';

class FileService {

    private $db;
    private static $migrationsRun = false;

    public function __construct() {
        $this->db = Database::getConnection();
        
        try { $this->db->query("SET SESSION sql_mode = ''"); } catch(Throwable $e) {}
        
        if (!self::$migrationsRun) {
            $this->ensureFaseDColumns();
            $this->ensureFaseFColumns();
            self::$migrationsRun = true;
        }
    }

    private function ensureFaseDColumns() {
        try { $this->db->query("SELECT view_count FROM files LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE files ADD COLUMN view_count INT DEFAULT 0"); }
        
        try { $this->db->query("SELECT expires_at FROM collaborations LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE collaborations ADD COLUMN expires_at DATETIME NULL"); }
        
        try { $this->db->query("SELECT color FROM albums LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE albums ADD COLUMN color VARCHAR(50) NULL"); }

        try { $this->db->query("SELECT icon FROM albums LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE albums ADD COLUMN icon VARCHAR(50) NULL"); }

        try { $this->db->query("SELECT pincode FROM albums LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE albums ADD COLUMN pincode VARCHAR(50) NULL"); }
    }

    private function ensureFaseFColumns() {
        try { $this->db->query("SELECT is_quarantined FROM files LIMIT 1"); } 
        catch (Exception $e) { @$this->db->query("ALTER TABLE files ADD COLUMN is_quarantined TINYINT(1) DEFAULT 0"); }

        try { $this->db->query("SELECT 1 FROM mime_types LIMIT 1"); } 
        catch (Exception $e) { 
            @$this->db->query("CREATE TABLE mime_types (
                extension VARCHAR(10) PRIMARY KEY,
                mime_type VARCHAR(100),
                color VARCHAR(20),
                icon TEXT
            )"); 
        }
    }

    public function getUserSettings($userId) {
        try {
            $stmt = $this->db->prepare("SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?");
            $stmt->execute([$userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $settings = [];
            foreach ($rows as $row) {
                $decoded = json_decode($row['setting_value'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $settings[$row['setting_key']] = $decoded;
                } else {
                    $settings[$row['setting_key']] = $row['setting_value'];
                }
            }
            return $settings;
        } catch (Exception $e) {
            error_log("FileService::getUserSettings Fout: " . $e->getMessage());
            return [];
        }
    }

    public function saveUserSettings($userId, $settings) {
        if (!is_array($settings) || empty($settings)) return;
        
        try {
            $sql = "INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()";
            $stmt = $this->db->prepare($sql);
            
            foreach ($settings as $key => $value) {
                $valStr = json_encode($value);
                $stmt->execute([$userId, $key, $valStr]);
            }
        } catch (Exception $e) {
            error_log("FileService::saveUserSettings Fout: " . $e->getMessage());
            throw new Exception("Database weigerde de instellingen op te slaan: " . $e->getMessage());
        }
    }

    public function incrementViewCount($fileId) {
        try {
            $stmt = $this->db->prepare("UPDATE files SET view_count = view_count + 1 WHERE id = ?");
            $stmt->execute([$fileId]);
        } catch(Exception $e) { error_log("View count error: " . $e->getMessage()); }
    }

    public function getRecentDashboardData($userId) {
        $stmt = $this->db->prepare("SELECT id, original_name as name, size, extension, color, category, is_quarantined FROM files WHERE user_id = ? AND deleted_at IS NULL ORDER BY size DESC LIMIT 10");
        $stmt->execute([$userId]);
        $topLarge = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->formatFiles($topLarge);

        $stmt = $this->db->prepare("SELECT id, original_name as name, view_count, extension, color, category, size, is_quarantined FROM files WHERE user_id = ? AND deleted_at IS NULL ORDER BY view_count DESC LIMIT 10");
        $stmt->execute([$userId]);
        $topViewed = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->formatFiles($topViewed);

        $stmt = $this->db->prepare("SELECT id, original_name as name, updated_at, created_at, extension, size, color, category, is_quarantined FROM files WHERE user_id = ? AND deleted_at IS NULL AND updated_at > created_at ORDER BY updated_at DESC LIMIT 10");
        $stmt->execute([$userId]);
        $recentlyEdited = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->formatFiles($recentlyEdited);

        $recentLinks = [];
        try {
            $stmt = $this->db->prepare("SELECT id, share_name as name, token, created_at, expires_at, views_count as views FROM shares WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
            $stmt->execute([$userId]);
            $recentLinks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Dashboard Links Fout: " . $e->getMessage());
        }

        $stmt = $this->db->prepare("SELECT id, original_name as name, extension, size, created_at, updated_at, file_hash, category, is_favorite, color, 'file' as type, is_quarantined FROM files WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 60");
        $stmt->execute([$userId]);
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->formatFiles($timeline);

        $activityLog = [];
        try {
            $stmt = $this->db->prepare("SELECT action, description as details, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
            $stmt->execute([$userId]);
            $activityLog = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Dashboard Activity Fout: " . $e->getMessage());
        }

        return [
            'top_large' => $topLarge,
            'top_viewed' => $topViewed,
            'recently_edited' => $recentlyEdited,
            'recent_links' => $recentLinks,
            'timeline' => $timeline,
            'activity' => $activityLog
        ];
    }

    private function formatFiles(&$files) {
        if (empty($files)) return;
        
        $fileIds = array_column($files, 'id');
        $placeholders = str_repeat('?,', count($fileIds) - 1) . '?';
        
        $sql = "SELECT ft.file_id, t.id, t.name, t.color, t.icon 
                FROM tags t 
                INNER JOIN file_tags ft ON t.id = ft.tag_id 
                WHERE ft.file_id IN ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($fileIds);
        $tagsData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $tagsByFile = [];
        foreach ($tagsData as $row) {
            $tagsByFile[$row['file_id']][] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'color' => $row['color'],
                'icon' => $row['icon']
            ];
        }

        $customMimes = [];
        try {
            $stmtMimes = $this->db->query("SELECT extension, color, icon FROM mime_types");
            while ($mRow = $stmtMimes->fetch(PDO::FETCH_ASSOC)) {
                $customMimes[strtolower($mRow['extension'])] = $mRow;
            }
        } catch(Exception $e) {}

        foreach ($files as &$file) {
            $ext = strtolower($file['extension'] ?? '');
            $cMime = $customMimes[$ext] ?? null;

            if ($cMime && !empty($cMime['icon']) && $cMime['icon'] !== 'none') {
                $file['icon'] = $cMime['icon'];
            } else {
                $file['icon'] = MimeTypes::getIcon($ext);
            }

            if ($cMime && !empty($cMime['color'])) {
                $file['badge_color'] = $cMime['color'];
            }

            $file['formatted_size'] = isset($file['size']) ? $this->formatSize($file['size']) : '';
            $file['tags'] = $tagsByFile[$file['id']] ?? []; 
        }
    }

    public function getPermissions($targetType, $targetId, $userId) {
        if (!$targetId) {
            return ['role' => 'owner', 'owner_id' => $userId];
        }

        $roleWeights = ['viewer' => 1, 'editor' => 2, 'co_owner' => 3, 'owner' => 4];

        if ($targetType === 'album') {
            $stmt = $this->db->prepare("SELECT user_id FROM albums WHERE id = ?");
            $stmt->execute([$targetId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$item) return ['role' => false, 'owner_id' => null];
            if ($item['user_id'] == $userId) return ['role' => 'owner', 'owner_id' => $item['user_id']];

            $cStmt = $this->db->prepare("SELECT role, expires_at FROM collaborations WHERE target_type = 'album' AND target_id = ? AND user_id = ?");
            $cStmt->execute([$targetId, $userId]);
            $collab = $cStmt->fetch(PDO::FETCH_ASSOC);

            if ($collab) {
                if (!empty($collab['expires_at']) && strtotime($collab['expires_at']) < time()) {
                    return ['role' => false, 'owner_id' => $item['user_id']]; 
                }
                return ['role' => $collab['role'], 'owner_id' => $item['user_id']];
            }
            return ['role' => false, 'owner_id' => $item['user_id']];
        }

        $table = ($targetType === 'folder') ? 'folders' : 'files';
        $stmt = $this->db->prepare("SELECT user_id, parent_id as folder_id FROM folders WHERE id = ?");
        if ($targetType === 'file') {
            $stmt = $this->db->prepare("SELECT user_id, folder_id FROM files WHERE id = ?");
        }
        
        $stmt->execute([$targetId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) return ['role' => false, 'owner_id' => null];
        if ($item['user_id'] == $userId) return ['role' => 'owner', 'owner_id' => $item['user_id']];

        $currentFolderId = ($targetType === 'file') ? $item['folder_id'] : $targetId;
        $highestRole = false;
        $currentWeight = 0;

        while ($currentFolderId != null) {
            $cStmt = $this->db->prepare("SELECT role, expires_at FROM collaborations WHERE target_type = 'folder' AND target_id = ? AND user_id = ?");
            $cStmt->execute([$currentFolderId, $userId]);
            $collab = $cStmt->fetch(PDO::FETCH_ASSOC);

            if ($collab) {
                if (empty($collab['expires_at']) || strtotime($collab['expires_at']) >= time()) {
                    $w = $roleWeights[$collab['role']] ?? 0;
                    if ($w > $currentWeight) {
                        $currentWeight = $w;
                        $highestRole = $collab['role'];
                    }
                }
            }

            $pStmt = $this->db->prepare("SELECT parent_id FROM folders WHERE id = ?");
            $pStmt->execute([$currentFolderId]);
            $currentFolderId = $pStmt->fetchColumn();
        }

        if ($targetType === 'file') {
            $cStmt = $this->db->prepare("SELECT role, expires_at FROM collaborations WHERE target_type = 'file' AND target_id = ? AND user_id = ?");
            $cStmt->execute([$targetId, $userId]);
            $collab = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($collab) {
                if (empty($collab['expires_at']) || strtotime($collab['expires_at']) >= time()) {
                    $w = $roleWeights[$collab['role']] ?? 0;
                    if ($w > $currentWeight) {
                        $currentWeight = $w;
                        $highestRole = $collab['role'];
                    }
                }
            }

            $aStmt = $this->db->prepare("
                SELECT c.role, c.expires_at 
                FROM album_files af
                INNER JOIN collaborations c ON c.target_id = af.album_id AND c.target_type = 'album'
                WHERE af.file_id = ? AND c.user_id = ?
            ");
            $aStmt->execute([$targetId, $userId]);
            $albumCollabs = $aStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($albumCollabs as $ac) {
                if (empty($ac['expires_at']) || strtotime($ac['expires_at']) >= time()) {
                    $w = $roleWeights[$ac['role']] ?? 0;
                    if ($w > $currentWeight) {
                        $currentWeight = $w;
                        $highestRole = $ac['role'];
                    }
                }
            }
        }

        return ['role' => $highestRole, 'owner_id' => $item['user_id']];
    }

    public function logAudit($targetType, $targetId, $userId, $action, $details = '') {
        $stmt = $this->db->prepare("INSERT INTO audit_logs (target_type, target_id, user_id, action, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$targetType, $targetId, $userId, $action, $details]);
    }

    public function checkLock($fileId, $userId) {
        $stmt = $this->db->prepare("SELECT locked_by FROM files WHERE id = ?");
        $stmt->execute([$fileId]);
        $lockedBy = $stmt->fetchColumn();
        
        if ($lockedBy && $lockedBy != $userId) {
            return false; 
        }
        return true;
    }

    public function getContents($folderId, $userId) {
        $perms = $this->getPermissions('folder', $folderId, $userId);
        if ($folderId !== null && !$perms['role']) {
            throw new Exception("Map niet gevonden of geen toegang.");
        }

        $queryOwner = $folderId === null ? "AND user_id = ?" : "";
        $paramsFolders = $folderId === null ? [null, $userId] : [$folderId];
        $paramsFiles = $folderId === null ? [null, $userId] : [$folderId];

        $sqlFolders = "SELECT id, name, color, icon, created_at, 0 as is_quarantined, 'folder' as type 
                       FROM folders 
                       WHERE parent_id <=> ? $queryOwner AND deleted_at IS NULL 
                       ORDER BY name ASC";
        
        $stmtFolders = $this->db->prepare($sqlFolders);
        $stmtFolders->execute($paramsFolders);
        $folders = $stmtFolders->fetchAll(PDO::FETCH_ASSOC);

        foreach ($folders as &$f) {
            $fPerms = $this->getPermissions('folder', $f['id'], $userId);
            $f['role'] = $fPerms['role'];
            $f['is_shared'] = ($fPerms['role'] && $fPerms['role'] !== 'owner') ? true : false;
        }

        $sqlFiles = "SELECT id, original_name as name, extension, size, file_hash, color, category, created_at, updated_at, is_favorite, locked_by, is_quarantined, 'file' as type 
                     FROM files 
                     WHERE folder_id <=> ? $queryOwner AND deleted_at IS NULL 
                     ORDER BY original_name ASC";

        $stmtFiles = $this->db->prepare($sqlFiles);
        $stmtFiles->execute($paramsFiles);
        $files = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

        $this->formatFiles($files);

        foreach ($files as &$f) {
            $fPerms = $this->getPermissions('file', $f['id'], $userId);
            $f['role'] = $fPerms['role'];
            $f['is_shared'] = ($fPerms['role'] && $fPerms['role'] !== 'owner') ? true : false;
            $f['is_locked'] = ($f['locked_by'] !== null && $f['locked_by'] != $userId);
        }

        return [
            'breadcrumbs' => $this->getBreadcrumbs($folderId, $userId),
            'folders' => $folders,
            'files' => $files,
            'current_role' => $perms['role'],
            'owner_id' => $perms['owner_id']
        ];
    }

    public function getSharedWithMe($userId) {
        $stmtFolders = $this->db->prepare("
            SELECT f.id, f.name, f.color, f.icon, f.created_at, 0 as is_quarantined, 'folder' as type, c.role 
            FROM folders f 
            INNER JOIN collaborations c ON f.id = c.target_id 
            WHERE c.target_type = 'folder' AND c.user_id = ? AND f.deleted_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > NOW())
            ORDER BY f.name ASC
        ");
        $stmtFolders->execute([$userId]);
        $folders = $stmtFolders->fetchAll(PDO::FETCH_ASSOC);

        $stmtFiles = $this->db->prepare("
            SELECT f.id, f.original_name as name, f.extension, f.size, f.file_hash, f.color, f.category, f.created_at, f.updated_at, f.is_favorite, f.locked_by, f.is_quarantined, 'file' as type, c.role 
            FROM files f 
            INNER JOIN collaborations c ON f.id = c.target_id 
            WHERE c.target_type = 'file' AND c.user_id = ? AND f.deleted_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > NOW())
            ORDER BY f.original_name ASC
        ");
        $stmtFiles->execute([$userId]);
        $files = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

        $this->formatFiles($files);

        foreach ($files as &$f) {
            $f['is_shared'] = true;
            $f['is_locked'] = ($f['locked_by'] !== null && $f['locked_by'] != $userId);
        }
        foreach ($folders as &$f) {
            $f['is_shared'] = true;
        }

        return [
            'breadcrumbs' => [['id' => 'shared_with_me', 'name' => 'Gedeeld met mij']],
            'folders' => $folders,
            'files' => $files
        ];
    }

    public function getRecentFiles($userId) {
        $sql = "SELECT id, original_name as name, extension, size, file_hash, color, category, created_at, updated_at, is_favorite, is_quarantined, 'file' as type 
                FROM files 
                WHERE user_id = ? AND deleted_at IS NULL 
                ORDER BY COALESCE(updated_at, created_at) DESC 
                LIMIT 30";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->formatFiles($files);

        return [
            'breadcrumbs' => [['id' => 'recent', 'name' => 'Recent']],
            'folders' => [],
            'files' => $files
        ];
    }

    public function getFavoriteItems($userId) {
        $folders = [];
        try {
            $stmtF = $this->db->prepare("SELECT id, name, color, icon, created_at, is_favorite, 0 as is_quarantined, 'folder' as type FROM folders WHERE user_id = ? AND is_favorite = 1 AND deleted_at IS NULL ORDER BY name ASC");
            $stmtF->execute([$userId]);
            $folders = $stmtF->fetchAll();
        } catch(Exception $e) {
            try {
                $stmtF = $this->db->prepare("SELECT id, name, color, icon, created_at, is_pinned as is_favorite, 0 as is_quarantined, 'folder' as type FROM folders WHERE user_id = ? AND is_pinned = 1 AND deleted_at IS NULL ORDER BY name ASC");
                $stmtF->execute([$userId]);
                $folders = $stmtF->fetchAll();
            } catch(Exception $e2) {}
        }

        $sqlFiles = "SELECT id, original_name as name, extension, size, file_hash, color, category, created_at, updated_at, is_favorite, is_quarantined, 'file' as type 
                     FROM files 
                     WHERE user_id = ? AND is_favorite = 1 AND deleted_at IS NULL 
                     ORDER BY original_name ASC";
        $stmtFi = $this->db->prepare($sqlFiles);
        $stmtFi->execute([$userId]);
        $files = $stmtFi->fetchAll(PDO::FETCH_ASSOC);

        $this->formatFiles($files);

        return [
            'breadcrumbs' => [['id' => 'favorites', 'name' => 'Favorieten']],
            'folders' => $folders,
            'files' => $files
        ];
    }

    public function getItemsByTag($tagName, $userId) {
        $stmtT = $this->db->prepare("SELECT id FROM tags WHERE name = ? AND user_id = ?");
        $stmtT->execute([$tagName, $userId]);
        $tag = $stmtT->fetch();

        $files = [];
        if ($tag) {
            $sqlFiles = "SELECT f.id, f.original_name as name, f.extension, f.size, f.file_hash, f.color, f.category, f.created_at, f.updated_at, f.is_favorite, f.is_quarantined, 'file' as type 
                         FROM files f
                         INNER JOIN file_tags ft ON f.id = ft.file_id
                         WHERE ft.tag_id = ? AND f.user_id = ? AND f.deleted_at IS NULL 
                         ORDER BY f.original_name ASC";
            $stmtFi = $this->db->prepare($sqlFiles);
            $stmtFi->execute([$tag['id'], $userId]);
            $files = $stmtFi->fetchAll(PDO::FETCH_ASSOC);
            
            $this->formatFiles($files);
        }

        return [
            'breadcrumbs' => [
                ['id' => 'tags_overview', 'name' => 'Mijn Tags'],
                ['id' => 'tag_detail_' . $tagName, 'name' => $tagName]
            ],
            'folders' => [], 
            'files' => $files
        ];
    }

    private function getBreadcrumbs($folderId, $userId) {
        $crumbs = [];
        $currentId = $folderId;
        while ($currentId !== null) {
            $perms = $this->getPermissions('folder', $currentId, $userId);
            if (!$perms['role']) break; 

            $stmt = $this->db->prepare("SELECT id, name, parent_id FROM folders WHERE id = ? AND deleted_at IS NULL");
            $stmt->execute([$currentId]);
            $folder = $stmt->fetch();
            
            if ($folder) {
                array_unshift($crumbs, ['id' => $folder['id'], 'name' => $folder['name']]);
                $currentId = $folder['parent_id'];
            } else {
                break;
            }
        }
        array_unshift($crumbs, ['id' => 'root', 'name' => 'Mijn Bestanden']);
        return $crumbs;
    }

    public function serveErrorSvg($text) {
        if (ob_get_length()) @ob_clean();
        header('Content-Type: image/svg+xml');
        header('Cache-Control: no-store');
        $text = htmlspecialchars($text);
        
        $lines = explode("\n", wordwrap($text, 35, "\n", true));
        $svgLines = '';
        $y = 40;
        foreach($lines as $line) {
            $svgLines .= '<text x="20" y="'.$y.'" fill="#ef4444" font-family="sans-serif" font-weight="bold" font-size="14">'.$line.'</text>';
            $y += 20;
        }
        
        echo '<?xml version="1.0" encoding="UTF-8"?>
        <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#0f172a" />
            <rect width="100%" height="100%" fill="rgba(239, 68, 68, 0.1)" />
            ' . $svgLines . '
        </svg>';
        exit;
    }

    public function serveVideoSvg() {
        if (ob_get_length()) @ob_clean();
        header('Content-Type: image/svg+xml');
        header('Cache-Control: public, max-age=31536000');
        echo '<?xml version="1.0" encoding="UTF-8"?>
        <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="background:rgba(15, 23, 42, 0.03);">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
            <polygon points="10,9 15,12 10,15" fill="#64748b"></polygon>
        </svg>';
        exit;
    }

    private function serveRawFile($path, $ext) {
        $mime = MimeTypes::getMimeType(ltrim($ext, '.'));
        $this->outputFileDirect($path, $mime, basename($path), false);
    }

    private function createTempWatermarked($source, $ext) {
        $ext = strtolower($ext);
        if ($ext === 'jpg' || $ext === 'jpeg') $img = @imagecreatefromjpeg($source);
        elseif ($ext === 'png') $img = @imagecreatefrompng($source);
        elseif ($ext === 'webp') $img = @imagecreatefromwebp($source);
        else return false;

        if (!$img) return false;

        $width = imagesx($img);
        $height = imagesy($img);

        $fontColor = imagecolorallocatealpha($img, 255, 255, 255, 60); 
        $thickness = max(3, intval($width / 150));
        imagesetthickness($img, $thickness);
        
        imageline($img, 0, 0, $width, $height, $fontColor);
        imageline($img, 0, $height, $width, 0, $fontColor);

        $text = "VERTROUWELIJK";
        $font = 5; 
        $tw = imagefontwidth($font) * strlen($text);
        $th = imagefontheight($font);
        
        $bg = imagecolorallocatealpha($img, 0, 0, 0, 60);
        imagefilledrectangle($img, ($width/2)-($tw/2)-10, ($height/2)-($th/2)-10, ($width/2)+($tw/2)+10, ($height/2)+($th/2)+10, $bg);
        imagestring($img, $font, ($width/2)-($tw/2), ($height/2)-($th/2), $text, imagecolorallocate($img, 255, 255, 255));

        $tempPath = sys_get_temp_dir() . '/wm_' . uniqid() . '.' . $ext;
        if ($ext === 'png') imagepng($img, $tempPath);
        elseif ($ext === 'webp') imagewebp($img, $tempPath);
        else imagejpeg($img, $tempPath);

        imagedestroy($img);
        return $tempPath;
    }

    public function serveFileWithWatermarkCheck($fileId, $userId, $isDownload = false) {
        $perms = $this->getPermissions('file', $fileId, $userId);
        if (!$perms['role']) {
            $this->serveErrorSvg("Toegang geweigerd. Geen rechten voor dit bestand.");
        }

        $stmt = $this->db->prepare("SELECT storage_name, original_name, extension, mime_type FROM files WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$file) {
            $this->serveErrorSvg("Bestand niet gevonden of verwijderd.");
        }

        $this->incrementViewCount($fileId);

        $baseUploadDir = STORAGE_PATH . '/uploads/';
        $candidates = [
            $baseUploadDir . $file['storage_name'],
            $baseUploadDir . $file['storage_name'] . '.bin',
            $baseUploadDir . $file['storage_name'] . '.' . $file['extension'],
            $baseUploadDir . $file['original_name']
        ];
        
        $physicalPath = null;
        foreach ($candidates as $path) {
            if (file_exists($path) && is_file($path)) {
                $physicalPath = $path;
                break;
            }
        }

        if (!$physicalPath) {
            $this->serveErrorSvg("Opslag Fout:\nFysiek bestand ontbreekt.");
        }

        $ext = strtolower($file['extension']);
        $isImage = in_array($ext, ['jpg', 'jpeg', 'png', 'webp']);

        if ($perms['role'] === 'viewer' && $isImage) {
            $watermarkedPath = $this->createTempWatermarked($physicalPath, $ext);
            if ($watermarkedPath && file_exists($watermarkedPath)) {
                $this->outputFileDirect($watermarkedPath, $file['mime_type'], $file['original_name'], $isDownload);
                @unlink($watermarkedPath);
                exit;
            }
        }

        $this->outputFileDirect($physicalPath, $file['mime_type'], $file['original_name'], $isDownload);
        exit;
    }

    private function outputFileDirect($path, $mime, $filename, $isDownload) {
        if (ob_get_length()) @ob_end_clean();
        
        if (!file_exists($path) || !is_file($path)) {
            http_response_code(404);
            exit;
        }

        $size = filesize($path);
        $time = filemtime($path);

        if (!$isDownload && isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
            $clientCacheTime = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
            if ($clientCacheTime !== false && $clientCacheTime >= $time) {
                header('HTTP/1.1 304 Not Modified');
                exit;
            }
        }

        $length = $size;
        $start = 0;
        $end = $size - 1;

        header('Content-Type: ' . $mime);
        header('Accept-Ranges: bytes');
        
        $disposition = $isDownload ? 'attachment' : 'inline';
        $safeFilename = str_replace('"', '\\"', basename($filename));
        header('Content-Disposition: ' . $disposition . '; filename="' . $safeFilename . '"');
        
        if (isset($_SERVER['HTTP_RANGE'])) {
            $c_start = $start;
            $c_end = $end;
            list(, $range) = explode('=', $_SERVER['HTTP_RANGE'], 2);
            
            if (strpos($range, ',') !== false) {
                header('HTTP/1.1 416 Requested Range Not Satisfiable');
                header("Content-Range: bytes $start-$end/$size");
                exit;
            }
            
            if ($range == '-') {
                $c_start = $size - substr($range, 1);
            } else {
                $range = explode('-', $range);
                $c_start = $range[0];
                $c_end = (isset($range[1]) && is_numeric($range[1])) ? $range[1] : $size - 1;
            }
            
            $c_end = ($c_end > $end) ? $end : $c_end;
            if ($c_start > $c_end || $c_start > $size - 1 || $c_end >= $size) {
                header('HTTP/1.1 416 Requested Range Not Satisfiable');
                header("Content-Range: bytes $start-$end/$size");
                exit;
            }
            
            $start = $c_start;
            $end = $c_end;
            $length = $end - $start + 1;
            
            http_response_code(206);
            header("Content-Range: bytes $start-$end/$size");
        } else {
            header('HTTP/1.1 200 OK');
        }
        
        header('Content-Length: ' . $length);
        header('Cache-Control: public, max-age=86400');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $time) . ' GMT');
        
        $fp = @fopen($path, 'rb');
        if ($fp) {
            fseek($fp, $start);
            $bufferSize = 8192; 
            while (!feof($fp) && ($p = ftell($fp)) <= $end) {
                if (connection_aborted()) break;
                
                $readSize = ($p + $bufferSize > $end) ? ($end - $p + 1) : $bufferSize;
                echo fread($fp, $readSize);
                flush();
            }
            fclose($fp);
        }
        exit;
    }

    public function saveVideoThumbnail($fileId, $base64, $userId) {
        $perms = $this->getPermissions('file', $fileId, $userId);
        if (!$perms['role'] || $perms['role'] === 'viewer') {
            throw new Exception("Geen rechten om thumbnail op te slaan.");
        }

        $stmt = $this->db->prepare("SELECT storage_name FROM files WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$file) throw new Exception("Bestand niet gevonden.");

        $thumbsDir = STORAGE_PATH . '/thumbs/';
        if (!file_exists($thumbsDir)) {
            @mkdir($thumbsDir, 0755, true);
        }

        $thumbPath = $thumbsDir . $file['storage_name'] . '.jpg';

        if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
            $base64Data = substr($base64, strpos($base64, ',') + 1);
            $data = base64_decode($base64Data);
            if ($data !== false) {
                file_put_contents($thumbPath, $data);
            }
        }
    }
    
    private function generateFfmpegThumbnail($videoPath, $targetThumbPath) {
        $ffmpegPath = STORAGE_PATH . '/bin/ffmpeg/ffmpeg'; 
        
        if (file_exists($ffmpegPath) && !is_executable($ffmpegPath)) {
            @chmod($ffmpegPath, 0755);
        }

        if (file_exists($ffmpegPath) && is_executable($ffmpegPath)) {
            $cmd = escapeshellcmd($ffmpegPath) . " -i " . escapeshellarg($videoPath) . " -ss 00:00:02.000 -vframes 1 -vf scale=400:-1 " . escapeshellarg($targetThumbPath) . " 2>&1";
            exec($cmd, $output, $return_var);
            
            return ($return_var === 0 && file_exists($targetThumbPath));
        }
        
        return false;
    }

    public function serveThumbnail($fileId, $userId) {
        ini_set('memory_limit', '512M'); 
        
        $perms = $this->getPermissions('file', $fileId, $userId);
        if (!$perms['role']) {
             $this->serveErrorSvg("Toegang geweigerd.\nJe hebt geen rechten.");
        }

        $stmt = $this->db->prepare("SELECT storage_name, original_name, extension, updated_at, created_at FROM files WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch();
        
        $stmt = null;
        
        if (!$file) {
            $this->serveErrorSvg("DB Fout: Bestand ID $fileId\nniet gevonden.");
        }
        
        $ext = strtolower($file['extension']);
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'svg', 'mp4', 'webm', 'mov', 'm4v', 'avi'];
        
        if (!in_array($ext, $allowed)) {
            http_response_code(404);
            exit;
        }

        $thumbsDir = STORAGE_PATH . '/thumbs/';
        if (!file_exists($thumbsDir)) {
            @mkdir($thumbsDir, 0755, true);
        }
        
        $thumbPathWebp = $thumbsDir . $file['storage_name'] . '.webp'; 
        $thumbPathJpg = $thumbsDir . $file['storage_name'] . '.jpg'; 
        
        if (file_exists($thumbPathWebp)) {
            $this->serveRawFile($thumbPathWebp, 'webp');
        } elseif (file_exists($thumbPathJpg)) {
            $this->serveRawFile($thumbPathJpg, 'jpg');
        }

        $baseUploadDir = STORAGE_PATH . '/uploads/';
        $candidates = [
            $baseUploadDir . $file['storage_name'],
            $baseUploadDir . $file['storage_name'] . '.bin', 
            $baseUploadDir . $file['storage_name'] . '.' . $ext,
            $baseUploadDir . $file['original_name']
        ];
        
        $originalPath = null;
        foreach ($candidates as $path) {
            if (file_exists($path) && is_file($path)) {
                $originalPath = $path;
                break;
            }
        }
        
        if (!$originalPath) {
            $this->serveErrorSvg("Opslag Fout:\nFysiek bestand ontbreekt\nop server.");
        }

        $isVideo = in_array($ext, ['mp4', 'webm', 'mov', 'm4v', 'avi']);
        if ($isVideo) {
            $success = $this->generateFfmpegThumbnail($originalPath, $thumbPathJpg);
            if ($success && file_exists($thumbPathJpg)) {
                $this->serveRawFile($thumbPathJpg, 'jpg');
            } else {
                $this->serveVideoSvg();
            }
            exit;
        }

        $fileSizeBytes = filesize($originalPath);
        $bypassGD = ['webp', 'avif', 'heic', 'gif', 'svg'];
        
        if (in_array($ext, $bypassGD) || $fileSizeBytes > (15 * 1024 * 1024)) {
            $this->serveRawFile($originalPath, $ext);
        }
        
        if (!function_exists('imagecreatefromstring')) {
            $this->serveRawFile($originalPath, $ext);
        }
        
        $imgString = @file_get_contents($originalPath);
        if ($imgString === false) {
             $this->serveErrorSvg("Leesfout:\nServer weigert bestand\nte lezen.");
        }
        
        $img = @imagecreatefromstring($imgString);
        if (!$img) {
            $this->serveRawFile($originalPath, $ext);
        }
        
        $width = imagesx($img);
        $height = imagesy($img);
        
        $newWidth = 400; 
        $newHeight = floor($height * ($newWidth / $width));
        
        if ($width < $newWidth) {
            $newWidth = $width;
            $newHeight = $height;
        }
        
        $tmp = imagecreatetruecolor($newWidth, $newHeight);
        
        if ($ext === 'png') {
            imagealphablending($tmp, false);
            imagesavealpha($tmp, true);
            $transparent = imagecolorallocatealpha($tmp, 255, 255, 255, 127);
            imagefilledrectangle($tmp, 0, 0, $newWidth, $newHeight, $transparent);
        } else {
            $white = imagecolorallocate($tmp, 255, 255, 255);
            imagefilledrectangle($tmp, 0, 0, $newWidth, $newHeight, $white);
        }
        
        imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        $saved = false;
        $useWebp = function_exists('imagewebp');
        $targetExt = $useWebp ? '.webp' : '.jpg';
        $thumbPath = $thumbsDir . $file['storage_name'] . $targetExt;
        
        if (is_dir($thumbsDir) && is_writable($thumbsDir)) {
            if ($useWebp) {
                $saved = @imagewebp($tmp, $thumbPath, 80);
            } else {
                $saved = @imagejpeg($tmp, $thumbPath, 80);
            }
        }
        
        if (ob_get_length()) @ob_clean(); 
        
        if ($saved && file_exists($thumbPath)) {
            imagedestroy($img);
            imagedestroy($tmp);
            $this->serveRawFile($thumbPath, $targetExt);
        } else {
            $mime = $useWebp ? 'image/webp' : 'image/jpeg';
            header("Content-Type: $mime");
            header('Cache-Control: public, max-age=31536000');
            if ($useWebp) { imagewebp($tmp, null, 80); } else { imagejpeg($tmp, null, 80); }
            imagedestroy($img);
            imagedestroy($tmp);
            exit;
        }
    }

    public function createFolder($name, $parentId, $userId) {
        $name = trim($name);
        if (empty($name)) throw new Exception("Mapnaam mag niet leeg zijn.");
        if (preg_match('/[<>:"\/\\|?*]/', $name)) throw new Exception("Mapnaam bevat ongeldige tekens.");

        $ownerId = $userId;
        
        if ($parentId !== null) {
            $perms = $this->getPermissions('folder', $parentId, $userId);
            if (!$perms['role'] || $perms['role'] === 'viewer') {
                throw new Exception("Je hebt geen bewerkrechten in deze map.");
            }
            $ownerId = $perms['owner_id']; 
        }

        $sqlCheck = "SELECT id FROM folders WHERE name = ? AND user_id = ? AND deleted_at IS NULL ";
        $paramsCheck = [$name, $ownerId];

        if ($parentId === null) {
            $sqlCheck .= "AND parent_id IS NULL";
        } else {
            $sqlCheck .= "AND parent_id = ?";
            $paramsCheck[] = $parentId;
        }

        $stmt = $this->db->prepare($sqlCheck);
        $stmt->execute($paramsCheck);
        if ($stmt->fetch()) throw new Exception("Er bestaat al een map met deze naam.");

        // FASE 4 FIX: Robuuste SQL insert! Zorgt dat lege defaults geen Strict Mode errors geven.
        $stmtInsert = $this->db->prepare("INSERT INTO folders (user_id, parent_id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, '#f59e0b', 'none', NOW(), NOW())");
        $stmtInsert->execute([$ownerId, $parentId, $name]);
        $newId = $this->db->lastInsertId();

        if ($ownerId != $userId) {
            $this->logAudit('folder', $newId, $userId, 'created', "Map '$name' aangemaakt.");
        }

        return $newId;
    }

    public function renameItem($type, $id, $newName, $userId) {
        $newName = trim($newName);
        if (empty($newName)) throw new Exception("Naam mag niet leeg zijn.");
        if (preg_match('/[<>:"\/\\|?*]/', $newName)) throw new Exception("Naam bevat ongeldige tekens.");

        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role'] || $perms['role'] === 'viewer') {
            throw new Exception("Je hebt geen rechten om dit te hernoemen.");
        }
        if ($type === 'file' && !$this->checkLock($id, $userId)) {
            throw new Exception("Bestand is vergrendeld door een collega.");
        }

        if ($type === 'folder') {
            $stmt = $this->db->prepare("SELECT parent_id FROM folders WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();
            if (!$item) throw new Exception("Map niet gevonden.");
            
            $parentId = $item['parent_id'];
            
            $sqlCheck = "SELECT id FROM folders WHERE name = ? AND user_id = ? AND id != ? AND deleted_at IS NULL ";
            $params = [$newName, $perms['owner_id'], $id];
            if($parentId === null) $sqlCheck .= "AND parent_id IS NULL";
            else { $sqlCheck .= "AND parent_id = ?"; $params[] = $parentId; }
            
            $stmtCheck = $this->db->prepare($sqlCheck);
            $stmtCheck->execute($params);
            if ($stmtCheck->fetch()) throw new Exception("Naam bestaat al.");

            $stmtUpdate = $this->db->prepare("UPDATE folders SET name = ?, updated_at = NOW() WHERE id = ?");
            $stmtUpdate->execute([$newName, $id]);

        } else if ($type === 'file') {
            $stmt = $this->db->prepare("SELECT folder_id FROM files WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();
            if (!$item) throw new Exception("Bestand niet gevonden.");

            $folderId = $item['folder_id'];
            
            $sqlCheck = "SELECT id FROM files WHERE original_name = ? AND user_id = ? AND id != ? AND deleted_at IS NULL ";
            $params = [$newName, $perms['owner_id'], $id];
            if($folderId === null) $sqlCheck .= "AND folder_id IS NULL";
            else { $sqlCheck .= "AND folder_id = ?"; $params[] = $folderId; }

            $stmtCheck = $this->db->prepare($sqlCheck);
            $stmtCheck->execute($params);
            if ($stmtCheck->fetch()) throw new Exception("Bestandsnaam bestaat al.");

            $stmtUpdate = $this->db->prepare("UPDATE files SET original_name = ?, updated_at = NOW() WHERE id = ?");
            $stmtUpdate->execute([$newName, $id]);
        }

        if ($perms['owner_id'] != $userId) {
            $this->logAudit($type, $id, $userId, 'renamed', "Hernoemd naar '$newName'.");
        }
    }

    public function calculateFolderSize($folderId, $userId) {
        $totalSize = 0;

        $perms = $this->getPermissions('folder', $folderId, $userId);
        $ownerId = $perms['owner_id'] ?? $userId;

        $sqlFiles = "SELECT SUM(size) as total FROM files WHERE user_id = ? AND deleted_at IS NULL ";
        $params = [$ownerId];
        if ($folderId === null) $sqlFiles .= "AND folder_id IS NULL";
        else { $sqlFiles .= "AND folder_id = ?"; $params[] = $folderId; }

        $stmt = $this->db->prepare($sqlFiles);
        $stmt->execute($params);
        $res = $stmt->fetch();
        if ($res) $totalSize += (int)$res['total'];

        $sqlFolders = "SELECT id FROM folders WHERE user_id = ? AND deleted_at IS NULL ";
        $paramsFolders = [$ownerId];
        if ($folderId === null) $sqlFolders .= "AND parent_id IS NULL";
        else { $sqlFolders .= "AND parent_id = ?"; $paramsFolders[] = $folderId; }

        $stmtFolders = $this->db->prepare($sqlFolders);
        $stmtFolders->execute($paramsFolders);
        $subFolders = $stmtFolders->fetchAll();

        foreach ($subFolders as $sub) {
            $totalSize += $this->calculateFolderSize($sub['id'], $userId);
        }

        return $totalSize;
    }

    public function getStorageQuota($userId) {
        $stmt = $this->db->prepare("SELECT SUM(size) as total FROM files WHERE user_id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        $usedBytes = $row && $row['total'] ? (int)$row['total'] : 0;

        $stmtU = $this->db->prepare("SELECT storage_quota FROM users WHERE id = ?");
        $stmtU->execute([$userId]);
        $user = $stmtU->fetch();
        
        $quotaBytes = ($user && $user['storage_quota']) ? (int)$user['storage_quota'] : 5368709120;

        $percentage = ($quotaBytes > 0) ? round(($usedBytes / $quotaBytes) * 100, 1) : 0;

        return [
            'used_bytes' => $usedBytes,
            'used_formatted' => $this->formatSize($usedBytes),
            'quota_bytes' => $quotaBytes,
            'quota_formatted' => $this->formatSize($quotaBytes),
            'percentage' => $percentage
        ];
    }

    public function formatSize($bytes) {
        if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
        elseif ($bytes >= 1048576) return number_format($bytes / 1048576, 2) . ' MB';
        elseif ($bytes >= 1024) return number_format($bytes / 1024, 2) . ' KB';
        elseif ($bytes > 1) return $bytes . ' bytes';
        elseif ($bytes == 1) return $bytes . ' byte';
        else return '0 bytes';
    }

    public function createTextFile($name, $folderId, $userId) {
        if (empty(trim($name))) $name = "Nieuw Tekstbestand";
        if (strpos(strtolower($name), '.txt') === false) $name .= '.txt';

        $ownerId = $userId;
        if ($folderId !== null) {
            $perms = $this->getPermissions('folder', $folderId, $userId);
            if (!$perms['role'] || $perms['role'] === 'viewer') {
                throw new Exception("Je mag hier geen bestanden maken.");
            }
            $ownerId = $perms['owner_id'];
        }

        $hash = bin2hex(random_bytes(32));
        $storageName = $hash . '.bin';
        $uploadDir = STORAGE_PATH . '/uploads/';
        
        if (!file_exists($uploadDir)) @mkdir($uploadDir, 0755, true);
        
        $physicalPath = $uploadDir . $storageName;

        if (file_put_contents($physicalPath, "") === false) {
            throw new Exception("Kon fysiek bestand niet aanmaken op de server.");
        }

        // FASE 4 FIX: Robuuste SQL insert met fallback '#94a3b8' als default
        $stmt = $this->db->prepare("
            INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mime_type, size, file_hash, category, color, created_at) 
            VALUES (?, ?, ?, ?, 'txt', 'text/plain', 0, ?, 'doc', '#94a3b8', NOW())
        ");
        $stmt->execute([$ownerId, $folderId, $storageName, $name, $hash]);
        $newId = $this->db->lastInsertId();

        if ($ownerId != $userId) {
            $this->logAudit('file', $newId, $userId, 'created', "Tekstbestand '$name' aangemaakt.");
        }

        return $newId;
    }

    public function moveItem($type, $id, $newFolderId, $userId) {
        if ($type === 'folder' && (string)$id === (string)$newFolderId) {
            throw new Exception("Kan een map niet in zichzelf verplaatsen.");
        }

        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role'] || $perms['role'] === 'viewer') {
            throw new Exception("Je hebt geen bewerkrechten op dit item.");
        }

        if ($type === 'file' && !$this->checkLock($id, $userId)) {
            throw new Exception("Bestand is vergrendeld.");
        }

        $newOwnerId = $userId;
        if ($newFolderId !== null) {
            $targetPerms = $this->getPermissions('folder', $newFolderId, $userId);
            if (!$targetPerms['role'] || $targetPerms['role'] === 'viewer') {
                throw new Exception("Je hebt geen bewerkrechten in de doelmap.");
            }
            $newOwnerId = $targetPerms['owner_id'];
        }

        if ($perms['owner_id'] !== $newOwnerId) {
            throw new Exception("Verplaatsen geweigerd. Je mag geen bestanden verplaatsen tussen verschillende eigenaren (Anti-Diefstal).");
        }
        
        if ($type === 'folder') {
            $stmt = $this->db->prepare("UPDATE folders SET parent_id = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$newFolderId, $id]);
        } else {
            $stmt = $this->db->prepare("UPDATE files SET folder_id = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$newFolderId, $id]);
        }

        if ($perms['owner_id'] != $userId) {
            $this->logAudit($type, $id, $userId, 'moved', "Verplaatst naar nieuwe map.");
        }
    }

    public function moveBulkItems($fileIds, $folderIds, $newFolderId, $userId) {
        $successCount = 0;
        $errors = [];

        $this->db->beginTransaction();
        try {
            foreach ($fileIds as $fileId) {
                try {
                    $this->moveItem('file', $fileId, $newFolderId, $userId);
                    $successCount++;
                } catch (Exception $e) {
                    $errors[] = "Bestand " . $fileId . ": " . $e->getMessage();
                }
            }

            foreach ($folderIds as $folderId) {
                try {
                    $this->moveItem('folder', $folderId, $newFolderId, $userId);
                    $successCount++;
                } catch (Exception $e) {
                    $errors[] = "Map " . $folderId . ": " . $e->getMessage();
                }
            }

            if ($successCount === 0 && count($errors) > 0) {
                throw new Exception(implode(", ", array_unique($errors)));
            }

            $this->db->commit();
            return $successCount;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function copyFile($id, $newFolderId, $userId) {
        $perms = $this->getPermissions('file', $id, $userId);
        if (!$perms['role']) throw new Exception("Bestand niet gevonden of geen toegang.");

        $stmt = $this->db->prepare("SELECT * FROM files WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $file = $stmt->fetch();

        if (!$file) throw new Exception("Bestand niet gevonden of is verwijderd.");

        $newOwnerId = $userId;
        if ($newFolderId !== null) {
            $targetPerms = $this->getPermissions('folder', $newFolderId, $userId);
            if (!$targetPerms['role'] || $targetPerms['role'] === 'viewer') {
                throw new Exception("Je hebt geen bewerkrechten in de doelmap.");
            }
            $newOwnerId = $targetPerms['owner_id'];
        }

        $newHash = bin2hex(random_bytes(32));
        $newStorageName = $newHash . '.bin';

        $baseUploadDir = STORAGE_PATH . '/uploads/';
        $candidates = [
            $baseUploadDir . $file['storage_name'],
            $baseUploadDir . $file['storage_name'] . '.bin',
            $baseUploadDir . $file['storage_name'] . '.' . $file['extension'],
            $baseUploadDir . $file['original_name']
        ];
        
        $oldPath = null;
        foreach ($candidates as $path) {
            if (file_exists($path) && is_file($path)) {
                $oldPath = $path;
                break;
            }
        }

        if (!$oldPath) {
            throw new Exception("Fysiek bronbestand mist op de server. Kan niet kopiëren.");
        }

        $newPath = $baseUploadDir . $newStorageName;
        copy($oldPath, $newPath);

        $newName = "Kopie van " . $file['original_name'];

        $stmtInsert = $this->db->prepare("
            INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mime_type, size, file_hash, category, color, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmtInsert->execute([
            $newOwnerId, $newFolderId, $newStorageName, $newName, 
            $file['extension'], $file['mime_type'], $file['size'], 
            $newHash, $file['category'], $file['color']
        ]);

        return $this->db->lastInsertId();
    }

    public function updateAppearance($type, $id, $color, $icon, $userId) {
        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role'] || $perms['role'] === 'viewer') {
            throw new Exception("Je mag de weergave niet aanpassen (Alleen Lezen).");
        }

        $color = ($color === 'none' || empty($color)) ? null : $color;
        $icon = ($icon === 'none' || empty($icon)) ? null : $icon;
        
        if ($type === 'file') {
            $stmt = $this->db->prepare("UPDATE files SET color = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$color, $id]);
        } else {
            $stmt = $this->db->prepare("UPDATE folders SET color = ?, icon = ? WHERE id = ?");
            $stmt->execute([$color, $icon, $id]);
        }
    }

    public function toggleFavorite($type, $id, $status, $userId) {
        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role']) throw new Exception("Geen toegang tot dit bestand.");
        
        if ($perms['role'] === 'viewer') {
             throw new Exception("In deze versie vereist Favorieten bewerkrechten.");
        }

        $statusVal = $status ? 1 : 0;
        if ($type === 'file') {
            $stmt = $this->db->prepare("UPDATE files SET is_favorite = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$statusVal, $id]);
        } else {
            try {
                $stmt = $this->db->prepare("UPDATE folders SET is_favorite = ? WHERE id = ?");
                $stmt->execute([$statusVal, $id]);
            } catch (Exception $e) {
                $stmt = $this->db->prepare("UPDATE folders SET is_pinned = ? WHERE id = ?");
                $stmt->execute([$statusVal, $id]);
            }
        }
    }

    public function getItemProperties($type, $id, $userId) {
        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role']) throw new Exception("Toegang geweigerd. Item niet gevonden.");

        $table = ($type === 'folder') ? 'folders' : 'files';
        $stmt = $this->db->prepare("SELECT * FROM {$table} WHERE id = ?");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) throw new Exception("Item niet gevonden.");
        
        $item['current_role'] = $perms['role'];
        $item['is_shared'] = ($perms['role'] !== 'owner');

        if ($type === 'file') {
            unset($item['storage_name']); 
            $item['formatted_size'] = $this->formatSize($item['size']);
            
            $stmtT = $this->db->prepare("SELECT t.id, t.name, t.color, t.icon FROM tags t INNER JOIN file_tags ft ON t.id = ft.tag_id WHERE ft.file_id = ?");
            $stmtT->execute([$id]);
            $item['tags'] = $stmtT->fetchAll(PDO::FETCH_ASSOC);
            
            $stmtA = $this->db->prepare("SELECT a.id, a.name FROM albums a INNER JOIN album_files af ON a.id = af.album_id WHERE af.file_id = ?");
            $stmtA->execute([$id]);
            $item['albums'] = $stmtA->fetchAll(PDO::FETCH_ASSOC);
            
        } else {
            $size = $this->calculateFolderSize($id, $userId);
            $item['formatted_size'] = $this->formatSize($size);
        }

        return $item;
    }

    public function getTrashContents($userId) {
        $stmtFolders = $this->db->prepare("SELECT id, name, color, icon, deleted_at, 0 as is_quarantined, 'folder' as type FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC");
        $stmtFolders->execute([$userId]);
        $folders = $stmtFolders->fetchAll();

        $stmtFiles = $this->db->prepare("SELECT id, original_name as name, extension, size, file_hash, color, category, deleted_at, is_quarantined, 'file' as type FROM files WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC");
        $stmtFiles->execute([$userId]);
        $files = $stmtFiles->fetchAll();

        $this->formatFiles($files);

        return [
            'breadcrumbs' => [['id' => 'trash', 'name' => 'Prullenbak']],
            'folders' => $folders,
            'files' => $files
        ];
    }

    public function softDelete($type, $id, $userId) {
        $perms = $this->getPermissions($type, $id, $userId);
        if (!$perms['role'] || $perms['role'] === 'viewer') {
            throw new Exception("Je mag dit item niet verwijderen (Alleen Lezen).");
        }

        if ($type === 'file' && !$this->checkLock($id, $userId)) {
            throw new Exception("Bestand is vergrendeld door een collega en kan niet worden verwijderd.");
        }

        $table = ($type === 'folder') ? 'folders' : 'files';
        $stmt = $this->db->prepare("UPDATE {$table} SET deleted_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);

        if ($perms['owner_id'] != $userId) {
            $this->logAudit($type, $id, $userId, 'deleted', "Verplaatst naar de prullenbak van de eigenaar.");
        }
    }

    public function restoreItem($type, $id, $userId) {
        if ($type === 'folder') {
            $stmt = $this->db->prepare("SELECT parent_id FROM folders WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            $item = $stmt->fetch();
            
            if ($item && $item['parent_id']) {
                $stmtCheck = $this->db->prepare("SELECT id FROM folders WHERE id = ? AND deleted_at IS NULL");
                $stmtCheck->execute([$item['parent_id']]);
                if (!$stmtCheck->fetch()) {
                    $stmtUpdate = $this->db->prepare("UPDATE folders SET parent_id = NULL, deleted_at = NULL WHERE id = ?");
                    $stmtUpdate->execute([$id]);
                    return;
                }
            }
            $stmtUpdate = $this->db->prepare("UPDATE folders SET deleted_at = NULL WHERE id = ? AND user_id = ?");
            $stmtUpdate->execute([$id, $userId]);
            
        } else {
            $stmt = $this->db->prepare("SELECT folder_id FROM files WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            $item = $stmt->fetch();
            
            if ($item && $item['folder_id']) {
                $stmtCheck = $this->db->prepare("SELECT id FROM folders WHERE id = ? AND deleted_at IS NULL");
                $stmtCheck->execute([$item['folder_id']]);
                if (!$stmtCheck->fetch()) {
                    $stmtUpdate = $this->db->prepare("UPDATE files SET folder_id = NULL, deleted_at = NULL WHERE id = ?");
                    $stmtUpdate->execute([$id]);
                    return;
                }
            }
            $stmtUpdate = $this->db->prepare("UPDATE files SET deleted_at = NULL WHERE id = ? AND user_id = ?");
            $stmtUpdate->execute([$id, $userId]);
        }
    }

    public function forceDelete($type, $id, $userId) {
        if ($type === 'file') {
            $this->physicalDeleteFile($id, $userId);
        } else if ($type === 'folder') {
            $this->physicalDeleteFolder($id, $userId);
        }
    }

    private function physicalDeleteFile($id, $userId) {
        $stmt = $this->db->prepare("SELECT storage_name, extension FROM files WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        $file = $stmt->fetch();
        
        if ($file) {
            $basePath = STORAGE_PATH . '/uploads/' . $file['storage_name'];
            if (file_exists($basePath)) @unlink($basePath);
            if (file_exists($basePath . '.bin')) @unlink($basePath . '.bin');
            if (file_exists($basePath . '.' . $file['extension'])) @unlink($basePath . '.' . $file['extension']);
            
            $thumbJpg = STORAGE_PATH . '/thumbs/' . $file['storage_name'] . '.jpg';
            $thumbWebp = STORAGE_PATH . '/thumbs/' . $file['storage_name'] . '.webp';
            if (file_exists($thumbJpg)) @unlink($thumbJpg);
            if (file_exists($thumbWebp)) @unlink($thumbWebp);
            
            $stmtDel = $this->db->prepare("DELETE FROM files WHERE id = ?");
            $stmtDel->execute([$id]);
        }
    }

    private function physicalDeleteFolder($folderId, $userId) {
        $stmtF = $this->db->prepare("SELECT id FROM folders WHERE parent_id = ? AND user_id = ?");
        $stmtF->execute([$folderId, $userId]);
        $subfolders = $stmtF->fetchAll();
        foreach ($subfolders as $sub) {
            $this->physicalDeleteFolder($sub['id'], $userId);
        }

        $stmtFiles = $this->db->prepare("SELECT id FROM files WHERE folder_id = ? AND user_id = ?");
        $stmtFiles->execute([$folderId, $userId]);
        $files = $stmtFiles->fetchAll();
        foreach ($files as $f) {
            $this->physicalDeleteFile($f['id'], $userId);
        }

        $stmtDel = $this->db->prepare("DELETE FROM folders WHERE id = ? AND user_id = ?");
        $stmtDel->execute([$folderId, $userId]);
    }

    public function emptyTrash($userId) {
        $stmtFiles = $this->db->prepare("SELECT id FROM files WHERE user_id = ? AND deleted_at IS NOT NULL");
        $stmtFiles->execute([$userId]);
        $files = $stmtFiles->fetchAll();
        foreach ($files as $f) {
            $this->physicalDeleteFile($f['id'], $userId);
        }

        $stmtFolders = $this->db->prepare("SELECT id FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL");
        $stmtFolders->execute([$userId]);
        $folders = $stmtFolders->fetchAll();
        foreach ($folders as $sub) {
            $this->physicalDeleteFolder($sub['id'], $userId);
        }
    }

    public function autoClearTrash($userId, $daysToKeep = 30) {
        $stmtFiles = $this->db->prepare("SELECT id FROM files WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)");
        $stmtFiles->execute([$userId, $daysToKeep]);
        $files = $stmtFiles->fetchAll();
        foreach ($files as $f) {
            $this->physicalDeleteFile($f['id'], $userId);
        }

        $stmtFolders = $this->db->prepare("SELECT id FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)");
        $stmtFolders->execute([$userId, $daysToKeep]);
        $folders = $stmtFolders->fetchAll();
        foreach ($folders as $sub) {
            $this->physicalDeleteFolder($sub['id'], $userId);
        }
    }

    public function getAlbumContents($albumId, $userId) {
        $stmtA = $this->db->prepare("SELECT * FROM albums WHERE id = ? AND user_id = ?");
        $stmtA->execute([$albumId, $userId]);
        $album = $stmtA->fetch();
        if (!$album) throw new Exception("Album niet gevonden.");

        $sql = "SELECT f.id, f.original_name as name, f.extension, f.size, f.file_hash, f.color, f.category, f.created_at, f.updated_at, f.is_favorite, f.is_quarantined, 'file' as type
                FROM files f
                INNER JOIN album_files af ON f.id = af.file_id
                WHERE af.album_id = ? AND f.user_id = ? AND f.deleted_at IS NULL
                ORDER BY f.created_at DESC";
        $stmtF = $this->db->prepare($sql);
        $stmtF->execute([$albumId, $userId]);
        $files = $stmtF->fetchAll();

        $this->formatFiles($files);

        return [
            'breadcrumbs' => [
                ['id' => 'albums_overview', 'name' => 'Mijn Albums'],
                ['id' => 'album_'.$albumId, 'name' => $album['name']]
            ],
            'folders' => [], 
            'files' => $files,
            'album' => $album
        ];
    }

    public function searchItems($query, $userId) {
        $searchTerm = '%' . $query . '%';

        $sqlFiles = "SELECT id, original_name as name, extension, size, created_at, updated_at, is_quarantined, 'file' as type 
                     FROM files WHERE user_id = ? AND deleted_at IS NULL AND original_name LIKE ?";
        
        $sqlFolders = "SELECT id, name, NULL as extension, 0 as size, created_at, updated_at, 0 as is_quarantined, 'folder' as type 
                       FROM folders WHERE user_id = ? AND deleted_at IS NULL AND name LIKE ?";

        $sqlAlbums = "SELECT id, name, NULL as extension, 0 as size, created_at, updated_at, 0 as is_quarantined, 'album' as type 
                      FROM albums WHERE user_id = ? AND name LIKE ?";

        $sqlTags = "SELECT id, name, NULL as extension, 0 as size, created_at, updated_at, 0 as is_quarantined, 'tag' as type 
                    FROM tags WHERE user_id = ? AND name LIKE ?";

        $sql = "($sqlFiles) UNION ($sqlFolders) UNION ($sqlAlbums) UNION ($sqlTags) ORDER BY type ASC, name ASC LIMIT 50";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $userId, $searchTerm,
            $userId, $searchTerm,
            $userId, $searchTerm,
            $userId, $searchTerm
        ]);

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $filesOnly = array_filter($results, function($item) { return $item['type'] === 'file'; });
        
        if (!empty($filesOnly)) {
            $filesList = array_values($filesOnly);
            $this->formatFiles($filesList);
            
            $fileIndex = 0;
            foreach ($results as $key => $item) {
                if ($item['type'] === 'file') {
                    $results[$key] = $filesList[$fileIndex];
                    $fileIndex++;
                }
            }
        }

        return $results;
    }

    public function createZipForFiles($fileIds, $userId) {
        if (empty($fileIds)) throw new Exception("Geen bestanden geselecteerd om in te pakken.");

        $zipDir = STORAGE_PATH . '/chunks';
        if (!file_exists($zipDir)) @mkdir($zipDir, 0755, true);

        $zipPath = $zipDir . '/export_' . $userId . '_' . time() . '.zip';
        $zip = new ZipArchive();
        
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new Exception("Kan geen ZIP bestand aanmaken op de server. Controleer schrijfrechten.");
        }

        $addedCount = 0;
        foreach ($fileIds as $id) {
            if (!is_numeric($id)) continue;
            
            $perms = $this->getPermissions('file', $id, $userId);
            if (!$perms['role']) continue; 

            $stmt = $this->db->prepare("SELECT storage_name, original_name, extension FROM files WHERE id = ? AND deleted_at IS NULL");
            $stmt->execute([$id]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($file) {
                $baseUploadDir = STORAGE_PATH . '/uploads/';
                $candidates = [
                    $baseUploadDir . $file['storage_name'],
                    $baseUploadDir . $file['storage_name'] . '.bin',
                    $baseUploadDir . $file['storage_name'] . '.' . $file['extension'],
                    $baseUploadDir . $file['original_name']
                ];
                
                $physicalPath = null;
                foreach ($candidates as $path) {
                    if (file_exists($path) && is_file($path)) {
                        $physicalPath = $path;
                        break;
                    }
                }

                if ($physicalPath) {
                    $zip->addFile($physicalPath, $file['original_name']);
                    $addedCount++;
                }
            }
        }

        $zip->close();

        if ($addedCount === 0) {
            @unlink($zipPath);
            throw new Exception("Geen toegankelijke bestanden gevonden op de server om in te pakken.");
        }

        return [
            'path' => $zipPath,
            'name' => 'Geselecteerde_Bestanden_' . date('Ymd_His') . '.zip'
        ];
    }

    public function createZipForFolder($folderId, $userId) {
        $perms = $this->getPermissions('folder', $folderId, $userId);
        if (!$perms['role']) throw new Exception("Map niet gevonden of geen toegang.");

        $stmt = $this->db->prepare("SELECT name FROM folders WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$folderId]);
        $folder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $folderName = $folder ? $folder['name'] : 'Map';
        $safeFolderName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $folderName);

        $zipDir = STORAGE_PATH . '/chunks';
        if (!file_exists($zipDir)) @mkdir($zipDir, 0755, true);

        $zipPath = $zipDir . '/' . $safeFolderName . '_' . $userId . '_' . time() . '.zip';
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new Exception("Kan geen ZIP bestand aanmaken op de server.");
        }

        $this->addFolderToZip($zip, $folderId, $userId, $safeFolderName);

        $zip->close();

        return [
            'path' => $zipPath,
            'name' => $safeFolderName . '.zip'
        ];
    }

    public function createZipForAlbum($albumId, $userId) {
        $perms = $this->getPermissions('album', $albumId, $userId);
        if (!$perms['role']) throw new Exception("Album niet gevonden of geen toegang.");

        $stmtA = $this->db->prepare("SELECT name FROM albums WHERE id = ?");
        $stmtA->execute([$albumId]);
        $albumName = $stmtA->fetchColumn() ?: 'Album';
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $albumName);

        $zipDir = STORAGE_PATH . '/chunks';
        if (!file_exists($zipDir)) @mkdir($zipDir, 0755, true);
        $zipPath = $zipDir . '/' . $safeName . '_' . $userId . '_' . time() . '.zip';
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new Exception("Kan geen ZIP aanmaken.");
        }

        $stmtF = $this->db->prepare("
            SELECT f.id, f.storage_name, f.original_name, f.extension 
            FROM files f
            INNER JOIN album_files af ON f.id = af.file_id
            WHERE af.album_id = ? AND f.deleted_at IS NULL
        ");
        $stmtF->execute([$albumId]);
        $files = $stmtF->fetchAll(PDO::FETCH_ASSOC);

        $baseUploadDir = STORAGE_PATH . '/uploads/';
        $tempFilesToClean = [];

        foreach ($files as $file) {
            $path = $baseUploadDir . $file['storage_name'];
            if(!file_exists($path)) $path .= '.bin';
            if(!file_exists($path)) $path = $baseUploadDir . $file['storage_name'] . '.' . $file['extension'];
            
            if (file_exists($path)) {
                $ext = strtolower($file['extension']);
                if ($perms['role'] === 'viewer' && in_array($ext, ['jpg','jpeg','png','webp'])) {
                    $markedPath = $this->createTempWatermarked($path, $ext);
                    if ($markedPath) {
                        $zip->addFile($markedPath, $safeName . '/' . $file['original_name']);
                        $tempFilesToClean[] = $markedPath;
                        continue;
                    }
                }
                $zip->addFile($path, $safeName . '/' . $file['original_name']);
            }
        }
        
        $zip->close();
        
        foreach($tempFilesToClean as $tmp) { @unlink($tmp); }
        
        return ['path' => $zipPath, 'name' => $safeName . '.zip'];
    }

    private function addFolderToZip($zip, $folderId, $userId, $localPath) {
        $zip->addEmptyDir($localPath);

        $stmtFiles = $this->db->prepare("SELECT id, storage_name, original_name, extension FROM files WHERE folder_id = ? AND deleted_at IS NULL");
        $stmtFiles->execute([$folderId]);
        $files = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

        $baseUploadDir = STORAGE_PATH . '/uploads/';

        foreach ($files as $file) {
            $perms = $this->getPermissions('file', $file['id'], $userId);
            if (!$perms['role']) continue;

            $candidates = [
                $baseUploadDir . $file['storage_name'],
                $baseUploadDir . $file['storage_name'] . '.bin',
                $baseUploadDir . $file['storage_name'] . '.' . $file['extension'],
                $baseUploadDir . $file['original_name']
            ];
            
            $physicalPath = null;
            foreach ($candidates as $path) {
                if (file_exists($path) && is_file($path)) {
                    $physicalPath = $path;
                    break;
                }
            }

            if ($physicalPath) {
                $zip->addFile($physicalPath, $localPath . '/' . $file['original_name']);
            }
        }

        $stmtFolders = $this->db->prepare("SELECT id, name FROM folders WHERE parent_id = ? AND deleted_at IS NULL");
        $stmtFolders->execute([$folderId]);
        $subfolders = $stmtFolders->fetchAll(PDO::FETCH_ASSOC);

        foreach ($subfolders as $sub) {
            $perms = $this->getPermissions('folder', $sub['id'], $userId);
            if (!$perms['role']) continue;
            
            $safeSubName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $sub['name']);
            $this->addFolderToZip($zip, $sub['id'], $userId, $localPath . '/' . $safeSubName);
        }
    }
}
?>