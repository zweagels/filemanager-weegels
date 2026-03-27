<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Admin | FILE: app/Services/AdminService.php */

require_once __DIR__ . '/../Config/Database.php';

class AdminService {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // =========================================================================
    // --- USERS ---
    // =========================================================================

    public function getAllUsers() {
        $stmt = $this->db->query("
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.storage_quota, u.created_at, u.role_id, r.name as role_name, r.color as role_color
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserById($id) {
        $stmt = $this->db->prepare("
            SELECT u.*, r.name as role_name, r.color as role_color, r.permissions 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createUser($data) {
        $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$data['username'], $data['email']]);
        if ($stmt->fetch()) throw new Exception("Gebruikersnaam of e-mailadres is al in gebruik.");

        $hash = password_hash($data['password'], PASSWORD_DEFAULT);
        $roleId = $data['role_id'] ?? 2;

        $stmt = $this->db->prepare("
            INSERT INTO users (username, email, first_name, last_name, password_hash, role_id, storage_quota) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['username'], 
            $data['email'], 
            $data['first_name'] ?? null, 
            $data['last_name'] ?? null, 
            $hash, 
            $roleId, 
            $data['storage_quota'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function updateUser($id, $data) {
        $fields = [];
        $params = [];

        if (!empty($data['password'])) {
            $fields[] = "password_hash = ?";
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        if (isset($data['email'])) { $fields[] = "email = ?"; $params[] = $data['email']; }
        if (isset($data['first_name'])) { $fields[] = "first_name = ?"; $params[] = $data['first_name']; }
        if (isset($data['last_name'])) { $fields[] = "last_name = ?"; $params[] = $data['last_name']; }
        if (isset($data['storage_quota'])) { $fields[] = "storage_quota = ?"; $params[] = $data['storage_quota']; }
        if (isset($data['role_id'])) { $fields[] = "role_id = ?"; $params[] = $data['role_id']; }

        if (empty($fields)) return true;

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function deleteUser($id) {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // =========================================================================
    // --- ROLES ---
    // =========================================================================

    public function getAllRoles() {
        $stmt = $this->db->query("SELECT * FROM roles ORDER BY id ASC");
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($roles as &$r) {
            $r['permissions'] = json_decode($r['permissions'], true);
        }
        return $roles;
    }

    public function createRole($data) {
        $stmt = $this->db->prepare("INSERT INTO roles (name, description, color, permissions, is_system) VALUES (?, ?, ?, ?, 0)");
        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : '{}';
        $stmt->execute([
            $data['name'], 
            $data['description'] ?? '', 
            $data['color'] ?? '#3b82f6', 
            $permissions
        ]);
        return $this->db->lastInsertId();
    }

    public function updateRole($id, $data) {
        $fields = [];
        $params = [];

        if (isset($data['name'])) { $fields[] = "name = ?"; $params[] = $data['name']; }
        if (isset($data['description'])) { $fields[] = "description = ?"; $params[] = $data['description']; }
        if (isset($data['color'])) { $fields[] = "color = ?"; $params[] = $data['color']; }
        if (isset($data['permissions'])) { $fields[] = "permissions = ?"; $params[] = json_encode($data['permissions']); }

        if (empty($fields)) return true;

        $params[] = $id;
        $sql = "UPDATE roles SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function deleteRole($id) {
        $stmt = $this->db->prepare("SELECT is_system FROM roles WHERE id = ?");
        $stmt->execute([$id]);
        $role = $stmt->fetch();
        if ($role && $role['is_system'] == 1) {
            throw new Exception("Systeemrollen kunnen niet worden verwijderd.");
        }

        $this->db->prepare("UPDATE users SET role_id = 2 WHERE role_id = ?")->execute([$id]);
        $stmt = $this->db->prepare("DELETE FROM roles WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // =========================================================================
    // --- SYSTEM, LOGS & STATS ---
    // =========================================================================

    public function getSystemSettings() {
        $stmt = $this->db->query("SELECT setting_key, setting_value FROM system_settings");
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }

    public function updateSystemSettings($settings) {
        $stmt = $this->db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        foreach ($settings as $key => $value) {
            $stmt->execute([$key, $value, $value]);
        }
        return true;
    }

    public function getAuditLogs($limit = 250) {
        $stmt = $this->db->prepare("
            SELECT a.id, a.action, a.description, a.ip_address, a.created_at, u.username, u.email 
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC LIMIT ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function logAction($userId, $action, $description) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $stmt = $this->db->prepare("INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$userId, $action, $description, $ip]);
    }

    public function getSystemStats() {
        $users = $this->db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $files = $this->db->query("SELECT COUNT(*) FROM files WHERE deleted_at IS NULL")->fetchColumn();
        $size = $this->db->query("SELECT SUM(size) FROM files WHERE deleted_at IS NULL")->fetchColumn();

        return [
            'total_users' => (int)$users,
            'total_files' => (int)$files,
            'total_size_bytes' => (int)$size,
            'php_version' => phpversion(),
            'server_os' => php_uname('s')
        ];
    }

    // =========================================================================
    // --- GOD MODE FEATURES (FASE 1 / FASE 2 FIXES) ---
    // =========================================================================

    public function bulkDeleteUsers($ids) {
        if (empty($ids) || !is_array($ids)) return 0;
        
        $currentUserId = $_SESSION['user_id'] ?? 0;
        $ids = array_filter($ids, function($id) use ($currentUserId) {
            return $id != 1 && $id != $currentUserId;
        });

        if (empty($ids)) return 0;

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("DELETE FROM users WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        return $stmt->rowCount();
    }

    public function scanGhostFiles() {
        try {
            $stmt = $this->db->query("SELECT storage_name FROM files WHERE deleted_at IS NULL AND storage_name IS NOT NULL");
            $dbFiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            $dbFiles = [];
        }
        
        $storageDir = realpath(__DIR__ . '/../../storage/uploads'); 
        $dbPathsNormalized = array_map(function($name) use ($storageDir) {
            $path = $storageDir . '/' . $name;
            return realpath($path) ?: $path;
        }, $dbFiles);

        $ghosts = [];
        
        if ($storageDir && is_dir($storageDir)) {
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($storageDir, RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($iterator as $fileInfo) {
                if ($fileInfo->isFile()) {
                    $physicalPath = $fileInfo->getPathname();
                    $filename = basename($physicalPath);
                    if ($filename === '.htaccess' || $filename === 'index.html' || $filename === '.DS_Store') continue;
                    
                    if (!in_array(realpath($physicalPath), $dbPathsNormalized)) {
                        $ghosts[] = $physicalPath;
                    }
                }
            }
        }
        return $ghosts;
    }

    public function deleteGhostFiles($files) {
        if (empty($files) || !is_array($files)) return 0;
        
        $deletedCount = 0;
        $safeStorageDir = realpath(__DIR__ . '/../../storage'); 
        
        foreach ($files as $file) {
            $realPath = realpath($file);
            if ($realPath && is_file($realPath)) {
                if (strpos($realPath, $safeStorageDir) === 0) {
                    @unlink($realPath);
                    $deletedCount++;
                }
            }
        }
        return $deletedCount;
    }

    public function getIpBlacklist() {
        try {
            $stmt = $this->db->query("SELECT * FROM ip_blacklist ORDER BY created_at DESC");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { return []; }
    }

    public function addIpBlacklist($ip, $reason) {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) throw new Exception("Ongeldig IP-adres formaat.");
        $stmt = $this->db->prepare("INSERT INTO ip_blacklist (ip_address, reason) VALUES (?, ?)");
        return $stmt->execute([$ip, $reason]);
    }

    public function removeIpBlacklist($id) {
        $stmt = $this->db->prepare("DELETE FROM ip_blacklist WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function sendBroadcast($title, $message, $type) {
        try {
            $users = $this->db->query("SELECT id FROM users")->fetchAll(PDO::FETCH_COLUMN);
            $stmt = $this->db->prepare("INSERT INTO notifications (user_id, title, message, type, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))");
            foreach ($users as $uid) {
                $stmt->execute([$uid, $title, $message, $type]);
            }
            return true;
        } catch (Exception $e) {
            throw new Exception("Kon database notificaties niet schrijven.");
        }
    }

    // =========================================================================
    // --- FASE 3: BATCH THUMBNAIL & VIDEO GENERATOR ---
    // =========================================================================

    public function generateMissingThumbnails() {
        // RAM vrijmaken voor zware media generatie
        ini_set('memory_limit', '512M');
        
        try {
            // Zoek ALLE media bestanden (Afbeeldingen EN Video's)
            $stmt = $this->db->query("
                SELECT id, storage_name, extension, mime_type 
                FROM files 
                WHERE deleted_at IS NULL 
                AND (mime_type LIKE 'image/%' OR mime_type LIKE 'video/%')
            ");
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $files = [];
        }
        
        $generatedCount = 0;
        $thumbDir = __DIR__ . '/../../storage/thumbs/';
        if (!is_dir($thumbDir)) @mkdir($thumbDir, 0755, true);
        $storageDir = __DIR__ . '/../../storage/uploads/';
        $ffmpegPath = __DIR__ . '/../../storage/bin/ffmpeg/ffmpeg'; // Zorg dat dit overeenkomt met de FileZilla locatie!

        // Forceer rechten op de bin map voor de zekerheid
        if (file_exists($ffmpegPath) && !is_executable($ffmpegPath)) {
            @chmod($ffmpegPath, 0755);
        }

        foreach ($files as $file) {
            $physicalPath = $storageDir . $file['storage_name'];
            if (!file_exists($physicalPath)) continue;
            
            $thumbPathJpg = $thumbDir . $file['storage_name'] . '.jpg';
            $thumbPathWebp = $thumbDir . $file['storage_name'] . '.webp';
            
            // Controleer of er al een versie van deze thumbnail bestaat
            if (!file_exists($thumbPathJpg) && !file_exists($thumbPathWebp)) {
                
                $isVideo = strpos($file['mime_type'], 'video/') === 0;

                if ($isVideo) {
                    // --- VIDEO THUMBNAIL LOGICA (FFMPEG) ---
                    if (file_exists($ffmpegPath) && is_executable($ffmpegPath)) {
                        // Pauzeer op 2s, maak 400px brede screenshot
                        $cmd = escapeshellcmd($ffmpegPath) . " -i " . escapeshellarg($physicalPath) . " -ss 00:00:02.000 -vframes 1 -vf scale=400:-1 " . escapeshellarg($thumbPathJpg) . " 2>&1";
                        exec($cmd, $output, $return_var);
                        
                        if ($return_var === 0 && file_exists($thumbPathJpg)) {
                            $generatedCount++;
                        }
                    }
                } else {
                    // --- AFBEELDING THUMBNAIL LOGICA (GD) ---
                    try {
                        if ($this->createThumbGD($physicalPath, $thumbPathJpg, $file['mime_type'])) {
                            $generatedCount++;
                        }
                    } catch (Exception $e) { 
                        continue; 
                    }
                }
            }
        }
        return $generatedCount;
    }

    private function createThumbGD($source, $dest, $mime) {
        $fileSize = @filesize($source);
        // Bescherming tegen Memory Exhaustion (slaat belachelijk grote foto's > 25MB over in de batch)
        if ($fileSize > (25 * 1024 * 1024)) return false;

        list($width, $height) = @getimagesize($source);
        if (!$width || !$height) return false;

        $thumbWidth = 250;
        $thumbHeight = (int) floor($height * ($thumbWidth / $width));
        
        $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);
        
        $src = null;
        switch($mime) {
            case 'image/jpeg': $src = @imagecreatefromjpeg($source); break;
            case 'image/png': 
                $src = @imagecreatefrompng($source); 
                imagealphablending($thumb, false);
                imagesavealpha($thumb, true);
                $transparent = imagecolorallocatealpha($thumb, 255, 255, 255, 127);
                imagefilledrectangle($thumb, 0, 0, $thumbWidth, $thumbHeight, $transparent);
                break;
            case 'image/gif': $src = @imagecreatefromgif($source); break;
            case 'image/webp': $src = @imagecreatefromwebp($source); break;
        }
        
        if ($src) {
            imagecopyresampled($thumb, $src, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $width, $height);
            imagejpeg($thumb, $dest, 85);
            imagedestroy($thumb);
            imagedestroy($src);
            return true;
        }
        return false;
    }

    // =========================================================================
    // --- ENTERPRISE PLATFORM BEHEER FEATURES (FASE F) ---
    // =========================================================================

    public function getAdvancedStats() {
        try {
            $topUsers = $this->db->query("SELECT u.username, SUM(f.size) as total_size FROM users u JOIN files f ON u.id = f.user_id WHERE f.deleted_at IS NULL GROUP BY u.id ORDER BY total_size DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
            
            $zombies = $this->db->query("SELECT u.id, u.username, u.email FROM users u WHERE u.id NOT IN (SELECT DISTINCT user_id FROM audit_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 6 MONTH))")->fetchAll(PDO::FETCH_ASSOC);
            
            $storageByType = $this->db->query("SELECT mime_type, COUNT(*) as count, SUM(size) as total_size FROM files WHERE deleted_at IS NULL GROUP BY mime_type ORDER BY total_size DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
            
            $growth = $this->db->query("SELECT DATE(created_at) as date, COUNT(*) as uploads FROM files WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC")->fetchAll(PDO::FETCH_ASSOC);

            return [
                'top_users' => $topUsers,
                'zombies' => $zombies,
                'storage_by_type' => $storageByType,
                'growth_30_days' => $growth
            ];
        } catch (Exception $e) {
            return ['top_users'=>[], 'zombies'=>[], 'storage_by_type'=>[], 'growth_30_days'=>[]];
        }
    }

    public function getGlobalFiles() {
        try {
            $stmt = $this->db->query("
                SELECT f.id, f.original_name, f.mime_type, f.size, f.created_at, f.is_quarantined, f.folder_id, u.username 
                FROM files f 
                LEFT JOIN users u ON f.user_id = u.id 
                WHERE f.deleted_at IS NULL 
                ORDER BY f.created_at DESC LIMIT 500
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $stmt = $this->db->query("
                SELECT f.id, f.original_name, f.mime_type, f.size, f.created_at, 0 as is_quarantined, f.folder_id, u.username 
                FROM files f 
                LEFT JOIN users u ON f.user_id = u.id 
                WHERE f.deleted_at IS NULL 
                ORDER BY f.created_at DESC LIMIT 500
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    public function quarantineFile($fileId, $status) {
        $val = $status ? 1 : 0;
        $stmt = $this->db->prepare("UPDATE files SET is_quarantined = ? WHERE id = ?");
        return $stmt->execute([$val, $fileId]);
    }

    public function transferOwnership($fromUserId, $toUserId) {
        $count = 0;
        $stmtF = $this->db->prepare("UPDATE files SET user_id = ? WHERE user_id = ?");
        $stmtF->execute([$toUserId, $fromUserId]);
        $count += $stmtF->rowCount();
        
        $stmtD = $this->db->prepare("UPDATE folders SET user_id = ? WHERE user_id = ?");
        $stmtD->execute([$toUserId, $fromUserId]);
        $count += $stmtD->rowCount();
        
        try {
            $stmtS = $this->db->prepare("UPDATE shares SET user_id = ? WHERE user_id = ?");
            $stmtS->execute([$toUserId, $fromUserId]);
        } catch(Exception $e) {} 
        
        return $count;
    }

    public function getGlobalLinks() {
        try {
            $stmt = $this->db->query("
                SELECT s.id, s.token, s.expires_at, s.created_at, s.password_hash, s.share_name as original_name, u.username 
                FROM shares s 
                LEFT JOIN users u ON s.user_id = u.id 
                ORDER BY s.created_at DESC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            return [];
        }
    }

    public function revokeGlobalLink($linkId) {
        $stmt = $this->db->prepare("DELETE FROM shares WHERE id = ?");
        return $stmt->execute([$linkId]);
    }

    public function getStorageTiers() {
        try {
            return $this->db->query("SELECT * FROM storage_tiers ORDER BY storage_limit ASC")->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) { return []; }
    }

    public function saveStorageTier($data) {
        if (!empty($data['id'])) {
            $stmt = $this->db->prepare("UPDATE storage_tiers SET name = ?, storage_limit = ?, price = ? WHERE id = ?");
            return $stmt->execute([$data['name'], $data['storage_limit'], $data['price'] ?? 0, $data['id']]);
        } else {
            $stmt = $this->db->prepare("INSERT INTO storage_tiers (name, storage_limit, price) VALUES (?, ?, ?)");
            return $stmt->execute([$data['name'], $data['storage_limit'], $data['price'] ?? 0]);
        }
    }

    public function deleteStorageTier($id) {
        $stmt = $this->db->prepare("DELETE FROM storage_tiers WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getLoginAttempts() {
        try {
            return $this->db->query("SELECT * FROM audit_logs WHERE action IN ('login_failed', 'login_success') ORDER BY created_at DESC LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) { return []; }
    }

    public function getMimeTypes() {
        try {
            return $this->db->query("SELECT * FROM mime_types ORDER BY extension ASC")->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) { return []; }
    }

    public function saveMimeType($data) {
        $stmt = $this->db->prepare("INSERT INTO mime_types (extension, mime_type, color, icon) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE mime_type = ?, color = ?, icon = ?");
        return $stmt->execute([$data['extension'], $data['mime_type'], $data['color'], $data['icon'], $data['mime_type'], $data['color'], $data['icon']]);
    }

    public function generateGdprExport($userId) {
        $user = $this->getUserById($userId);
        if (!$user) throw new Exception("Gebruiker niet gevonden.");
        
        $files = $this->db->query("SELECT * FROM files WHERE user_id = " . (int)$userId)->fetchAll(PDO::FETCH_ASSOC);
        $folders = $this->db->query("SELECT * FROM folders WHERE user_id = " . (int)$userId)->fetchAll(PDO::FETCH_ASSOC);
        $logs = $this->db->query("SELECT * FROM audit_logs WHERE user_id = " . (int)$userId)->fetchAll(PDO::FETCH_ASSOC);
        
        $exportData = [
            'user' => $user,
            'files' => $files,
            'folders' => $folders,
            'activity_logs' => $logs,
            'export_date' => date('Y-m-d H:i:s')
        ];
        
        $exportDir = __DIR__ . '/../../storage/exports/';
        if (!is_dir($exportDir)) @mkdir($exportDir, 0755, true);
        
        $fileName = 'gdpr_export_user_' . $userId . '_' . time() . '.json';
        $filePath = $exportDir . $fileName;
        
        file_put_contents($filePath, json_encode($exportData, JSON_PRETTY_PRINT));
        
        return '/storage/exports/' . $fileName;
    }

    public function getBranding() {
        $stmt = $this->db->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('site_title', 'logo_url', 'primary_color', 'welcome_message')");
        $brand = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $brand[$row['setting_key']] = $row['setting_value'];
        }
        return $brand;
    }

    public function saveBranding($data) {
        $stmt = $this->db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        foreach (['site_title', 'logo_url', 'primary_color', 'welcome_message'] as $key) {
            if (isset($data[$key])) {
                $stmt->execute([$key, $data[$key], $data[$key]]);
            }
        }
        return true;
    }

    // =========================================================================
    // --- NIEUWE FUNCTIES: DUBBELE BESTANDEN, HEATMAP & NOTIFICATIES ---
    // =========================================================================

    public function scanDuplicates() {
        $stmt = $this->db->query("
            SELECT original_name, size, COUNT(*) as c 
            FROM files 
            WHERE deleted_at IS NULL AND size > 0
            GROUP BY original_name, size 
            HAVING c > 1
            ORDER BY size DESC
        ");
        $dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = [];
        foreach ($dupes as $d) {
            $st = $this->db->prepare("
                SELECT f.id, f.original_name, f.size, f.created_at, u.username 
                FROM files f 
                LEFT JOIN users u ON f.user_id = u.id 
                WHERE f.original_name = ? AND f.size = ? AND f.deleted_at IS NULL
            ");
            $st->execute([$d['original_name'], $d['size']]);
            $results[] = [
                'name' => $d['original_name'],
                'size' => $d['size'],
                'files' => $st->fetchAll(PDO::FETCH_ASSOC)
            ];
        }
        return $results;
    }

    public function getHeatmapData($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT DATE(created_at) as date, COUNT(*) as count 
                FROM audit_logs 
                WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 365 DAY) 
                GROUP BY DATE(created_at)
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            return [];
        }
    }

    public function getUnreadNotifications($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM notifications 
                WHERE user_id = ? AND is_read = 0 AND (expires_at IS NULL OR expires_at > NOW()) 
                ORDER BY created_at DESC
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            return [];
        }
    }

    public function markNotificationsRead($userId) {
        try {
            $stmt = $this->db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            return $stmt->execute([$userId]);
        } catch(Exception $e) {
            return false;
        }
    }
}
?>