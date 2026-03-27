<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Share | FILE: app/Services/ShareService.php */

require_once __DIR__ . '/../Config/Database.php';

class ShareService {
    
    private $db;
    private $maxAttempts = 5; 
    private $lockoutTime = 60;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function generateToken() {
        return bin2hex(random_bytes(8)); 
    }

    public function createShare($userId, $targetType, $targetId, $shareName, $password, $expiresAt, $maxDownloads, $isBurnLink, $notifyOnDownload = 0, $watermarkText = null, $isPreviewOnly = 0, $theme = 'dark', $includeSubfolders = 1, $allowedTypes = 'all') {
        $token = $this->generateToken();
        $passwordHash = null;
        if (!empty(trim($password))) $passwordHash = password_hash(trim($password), PASSWORD_ARGON2ID);
        if ($isBurnLink) $maxDownloads = 1;

        try {
            $stmt = $this->db->prepare("
                INSERT INTO shares 
                (token, share_name, target_type, target_id, password_hash, expires_at, max_downloads, downloads_count, views_count, is_burn_link, notify_on_download, watermark_text, is_preview_only, include_subfolders, allowed_types, theme, user_id, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $token, $shareName, $targetType, $targetId, $passwordHash, $expiresAt ?: null, $maxDownloads ?: null, 
                $isBurnLink ? 1 : 0, $notifyOnDownload ? 1 : 0, $watermarkText, $isPreviewOnly ? 1 : 0, 
                $includeSubfolders ? 1 : 0, $allowedTypes, $theme, $userId
            ]);
        } catch (Throwable $e) {
            $stmt = $this->db->prepare("
                INSERT INTO shares 
                (token, name, target_type, target_id, password_hash, expires_at, max_downloads, is_burn_link, notify_on_download, watermark_text, is_preview_only, include_subfolders, allowed_types, theme, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $token, $shareName, $targetType, $targetId, $passwordHash, $expiresAt ?: null, $maxDownloads ?: null, 
                $isBurnLink ? 1 : 0, $notifyOnDownload ? 1 : 0, $watermarkText, $isPreviewOnly ? 1 : 0, 
                $includeSubfolders ? 1 : 0, $allowedTypes, $theme, $userId
            ]);
        }
        return $token;
    }

    public function updateShare($shareId, $userId, $shareName, $password, $expiresAt, $maxDownloads, $isBurnLink, $notifyOnDownload = 0, $watermarkText = null, $isPreviewOnly = 0, $theme = 'dark', $includeSubfolders = 1, $allowedTypes = 'all') {
        $stmtCheck = $this->db->prepare("SELECT password_hash FROM shares WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$shareId, $userId]);
        $current = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        if (!$current) return false;

        $passwordHash = $current['password_hash'];
        if ($password === 'REMOVE_PASSWORD') $passwordHash = null; 
        elseif (!empty(trim($password))) $passwordHash = password_hash(trim($password), PASSWORD_ARGON2ID);
        if ($isBurnLink) $maxDownloads = 1;

        try {
            $stmt = $this->db->prepare("
                UPDATE shares SET share_name = ?, password_hash = ?, expires_at = ?, max_downloads = ?, is_burn_link = ?, notify_on_download = ?, watermark_text = ?, is_preview_only = ?, include_subfolders = ?, allowed_types = ?, theme = ? WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([
                $shareName, $passwordHash, $expiresAt ?: null, $maxDownloads ?: null, $isBurnLink ? 1 : 0, 
                $notifyOnDownload ? 1 : 0, $watermarkText, $isPreviewOnly ? 1 : 0, 
                $includeSubfolders ? 1 : 0, $allowedTypes, $theme, $shareId, $userId
            ]);
        } catch(Throwable $e) {
            $stmt = $this->db->prepare("
                UPDATE shares SET name = ?, password_hash = ?, expires_at = ?, max_downloads = ?, is_burn_link = ?, notify_on_download = ?, watermark_text = ?, is_preview_only = ?, include_subfolders = ?, allowed_types = ?, theme = ? WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([
                $shareName, $passwordHash, $expiresAt ?: null, $maxDownloads ?: null, $isBurnLink ? 1 : 0, 
                $notifyOnDownload ? 1 : 0, $watermarkText, $isPreviewOnly ? 1 : 0, 
                $includeSubfolders ? 1 : 0, $allowedTypes, $theme, $shareId, $userId
            ]);
        }
        return true;
    }

    public function getUserShares($userId) {
        $results = [];

        // 1. Haal de normale Deellinks op via jouw exacte query structuur
        try {
            $stmt = $this->db->prepare("
                SELECT s.id, s.token, s.share_name, s.target_type, s.target_id, s.expires_at, s.max_downloads, s.downloads_count, s.views_count, s.is_burn_link, s.notify_on_download, s.watermark_text, s.is_preview_only, s.include_subfolders, s.allowed_types, s.theme,
                       CASE WHEN s.password_hash IS NOT NULL THEN 1 ELSE 0 END as is_protected,
                       f.original_name as file_name,
                       d.name as folder_name,
                       a.name as album_name,
                       ss.title as slideshow_name,
                       s.created_at
                FROM shares s
                LEFT JOIN files f ON s.target_type = 'file' AND s.target_id = f.id
                LEFT JOIN folders d ON (s.target_type = 'folder' OR s.target_type = 'request') AND s.target_id = d.id
                LEFT JOIN albums a ON s.target_type = 'album' AND s.target_id = a.id
                LEFT JOIN slideshows ss ON s.target_type = 'slideshow' AND s.target_id = ss.id
                WHERE s.user_id = ?
                ORDER BY s.id DESC
            ");
            $stmt->execute([$userId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {}

        // 2. Haal ALLE Slideshows op en verpak ze exact zoals een Share zodat ze nooit onzichtbaar zijn
        try {
            $stmt2 = $this->db->prepare("SELECT * FROM slideshows WHERE user_id = ?");
            $stmt2->execute([$userId]);
            $slideshows = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            foreach($slideshows as $ss) {
                // Zoek de token ongeacht hoe de kolom heet
                $token = $ss['share_token'] ?? $ss['token'] ?? null;
                if (empty($token)) continue;

                $views = 0;
                try {
                    $vStmt = $this->db->prepare("SELECT views FROM slideshow_analytics WHERE slideshow_id = ? LIMIT 1");
                    $vStmt->execute([$ss['id']]);
                    $views = (int)$vStmt->fetchColumn();
                } catch(Throwable $e) {}

                $results[] = [
                    'id' => (int)(1000000 + $ss['id']), // Forceer een INTEGER om JS Render bugs te voorkomen!
                    'token' => $token,
                    'share_name' => $ss['title'],
                    'target_type' => 'slideshow',
                    'target_id' => $ss['id'],
                    'expires_at' => null,
                    'max_downloads' => null,
                    'downloads_count' => 0,
                    'views_count' => $views,
                    'is_burn_link' => 0,
                    'notify_on_download' => 0,
                    'watermark_text' => null,
                    'is_preview_only' => 1,
                    'include_subfolders' => 1,
                    'allowed_types' => 'all',
                    'theme' => 'dark',
                    'is_protected' => 0,
                    'file_name' => null,
                    'folder_name' => null,
                    'album_name' => null,
                    'slideshow_name' => $ss['title'],
                    'created_at' => $ss['created_at'] ?? null
                ];
            }
        } catch (Throwable $e) {}

        // Sorteer de gecombineerde lijst netjes op datum
        usort($results, function($a, $b) {
            $timeA = isset($a['created_at']) ? strtotime($a['created_at']) : 0;
            $timeB = isset($b['created_at']) ? strtotime($b['created_at']) : 0;
            return $timeB - $timeA;
        });

        return $results;
    }

    public function getShareByTarget($targetType, $targetId, $userId) {
        try {
            $stmt = $this->db->prepare("SELECT *, (password_hash IS NOT NULL) as has_password FROM shares WHERE target_type = ? AND target_id = ? AND user_id = ? LIMIT 1");
            $stmt->execute([$targetType, $targetId, $userId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) { return null; }
    }

    public function getShareById($shareId, $userId) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM shares WHERE id = ? AND user_id = ? LIMIT 1");
            $stmt->execute([$shareId, $userId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) { return null; }
    }

    public function getShareByToken($token) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM shares WHERE token = ? LIMIT 1");
            $stmt->execute([$token]);
            $share = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$share) return ['valid' => false, 'error' => 'Deze link bestaat niet of is verwijderd.'];
            if (!empty($share['expires_at']) && strtotime($share['expires_at']) < time()) return ['valid' => false, 'error' => 'Deze link is verlopen.'];
            
            $downloadCount = $share['downloads_count'] ?? $share['download_count'] ?? 0;
            if (!empty($share['max_downloads']) && $downloadCount >= $share['max_downloads']) return ['valid' => false, 'error' => 'Het maximale aantal downloads is bereikt.'];

            return ['valid' => true, 'share' => $share];
        } catch (Throwable $e) {
            return ['valid' => false, 'error' => 'Database Fout.'];
        }
    }

    public function revokeShare($shareId, $userId) {
        // Herken onze toegevoegde 1000000 offset voor slideshows
        if (is_numeric($shareId) && $shareId > 900000) {
            $ssId = $shareId - 1000000;
            try { $this->db->prepare("UPDATE slideshows SET share_token = NULL WHERE id = ? AND user_id = ?")->execute([$ssId, $userId]); } catch(Throwable $e) {}
            try { $this->db->prepare("UPDATE slideshows SET token = NULL WHERE id = ? AND user_id = ?")->execute([$ssId, $userId]); } catch(Throwable $e) {}
            return true;
        } else {
            $stmt = $this->db->prepare("DELETE FROM shares WHERE id = ? AND user_id = ?");
            $stmt->execute([$shareId, $userId]);
            return $stmt->rowCount() > 0;
        }
    }

    public function verifyPassword($token, $password) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $throttleKey = 'share_auth_' . md5($ip . '_' . $token);
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (isset($_SESSION[$throttleKey]) && is_array($_SESSION[$throttleKey])) {
            $data = $_SESSION[$throttleKey];
            if ($data['count'] >= $this->maxAttempts) {
                if (time() - $data['last_attempt'] < $this->lockoutTime) return false; 
                else unset($_SESSION[$throttleKey]);
            }
        }

        $shareData = $this->getShareByToken($token);
        if (!$shareData['valid']) return false;
        $share = $shareData['share'];
        if (empty($share['password_hash'])) return true;

        $isValid = password_verify($password, $share['password_hash']);

        if (!$isValid) {
            if (!isset($_SESSION[$throttleKey])) $_SESSION[$throttleKey] = ['count' => 1, 'last_attempt' => time()];
            else { $_SESSION[$throttleKey]['count']++; $_SESSION[$throttleKey]['last_attempt'] = time(); }
        } else {
            unset($_SESSION[$throttleKey]);
        }
        return $isValid;
    }

    public function logView($shareId, $ipAddress, $userAgent) {
        try { $this->db->prepare("UPDATE shares SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?")->execute([$shareId]); } 
        catch(Throwable $e) { @$this->db->prepare("UPDATE shares SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?")->execute([$shareId]); }
    }

    public function logFileDownload($shareId, $fileId, $ipAddress, $userAgent) {
        try {
            $stmt = $this->db->prepare("INSERT INTO share_file_downloads (share_id, file_id, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$shareId, $fileId, $ipAddress, $userAgent]);
        } catch(Throwable $e) {}
        $this->logDownload($shareId, $ipAddress, $userAgent);
    }

    public function logDownload($shareId, $ipAddress, $userAgent) {
        try { $this->db->prepare("UPDATE shares SET downloads_count = COALESCE(downloads_count,0) + 1 WHERE id = ?")->execute([$shareId]); } 
        catch (Throwable $e) { @$this->db->prepare("UPDATE shares SET download_count = COALESCE(download_count,0) + 1 WHERE id = ?")->execute([$shareId]); }

        try {
            $stmtLog = $this->db->prepare("INSERT INTO share_logs (share_id, ip_address, user_agent, action, timestamp) VALUES (?, ?, ?, 'download', NOW())");
            $stmtLog->execute([$shareId, $ipAddress, $userAgent]);
        } catch (Throwable $e) {}

        try {
            $stmtCheck = $this->db->prepare("SELECT user_id, share_name, notify_on_download FROM shares WHERE id = ?");
            $stmtCheck->execute([$shareId]);
            $check = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            if ($check && $check['notify_on_download'] == 1) {
                $this->sendDownloadNotification($check['user_id'], $check['share_name'], $ipAddress);
            }
        } catch(Throwable $e) {}
    }

    private function sendDownloadNotification($userId, $shareName, $ip) {
        $stmt = $this->db->prepare("SELECT email, first_name FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && !empty($user['email'])) {
            $to = $user['email'];
            $subject = "Jouw deellink is zojuist gedownload";
            $message = "Hallo " . $user['first_name'] . ",\n\nGoed nieuws! Een bezoeker heeft zojuist bestanden gedownload via jouw deellink: '" . $shareName . "'.\nIP Adres bezoeker: " . $ip . "\n\nMet vriendelijke groet,\nFileManager";
            $headers = "From: noreply@" . ($_SERVER['HTTP_HOST'] ?? 'filemanager.info') . "\r\nReply-To: noreply@" . ($_SERVER['HTTP_HOST'] ?? 'filemanager.info') . "\r\nX-Mailer: PHP/" . phpversion();
            @mail($to, $subject, $message, $headers);
        }
    }

    public function getShareStats($shareId, $userId) {
        $stmtCheck = $this->db->prepare("SELECT target_type, target_id FROM shares WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$shareId, $userId]);
        $share = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        if (!$share) return null;

        $stats = ['views' => 0, 'total_downloads' => 0, 'top_files' => [], 'top_folders' => []];
        try {
            $stmtC = $this->db->prepare("SELECT views_count, downloads_count FROM shares WHERE id = ?");
            $stmtC->execute([$shareId]);
            $c = $stmtC->fetch(PDO::FETCH_ASSOC);
            if ($c) { $stats['views'] = (int)($c['views_count'] ?? 0); $stats['total_downloads'] = (int)($c['downloads_count'] ?? 0); }
        } catch(Throwable $e) {}

        if ($share['target_type'] === 'folder' || $share['target_type'] === 'request') {
            try {
                $stmtTop = $this->db->prepare("SELECT f.original_name as name, COUNT(sfd.id) as dl_count FROM share_file_downloads sfd JOIN files f ON sfd.file_id = f.id WHERE sfd.share_id = ? GROUP BY sfd.file_id ORDER BY dl_count DESC LIMIT 5");
                $stmtTop->execute([$shareId]);
                $stats['top_files'] = $stmtTop->fetchAll(PDO::FETCH_ASSOC);

                $stmtTopDirs = $this->db->prepare("SELECT d.name as name, COUNT(sfd.id) as dl_count FROM share_file_downloads sfd JOIN files f ON sfd.file_id = f.id JOIN folders d ON f.folder_id = d.id WHERE sfd.share_id = ? AND f.folder_id != ? GROUP BY f.folder_id ORDER BY dl_count DESC LIMIT 5");
                $stmtTopDirs->execute([$shareId, $share['target_id']]);
                $stats['top_folders'] = $stmtTopDirs->fetchAll(PDO::FETCH_ASSOC);
            } catch(Throwable $e) {}
        }
        return $stats;
    }

    public function searchUsers($query, $excludeUserId) {
        $searchTerm = '%' . trim($query) . '%';
        try {
            $stmt = $this->db->prepare("SELECT id, username, email, avatar_path FROM users WHERE (username LIKE ? OR email LIKE ?) AND id != ? LIMIT 10");
            $stmt->execute([$searchTerm, $searchTerm, (int)$excludeUserId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Throwable $e) {
            // Als avatar_path ontbreekt in db, negeer het.
            $stmt = $this->db->prepare("SELECT id, username, email FROM users WHERE (username LIKE ? OR email LIKE ?) AND id != ? LIMIT 10");
            $stmt->execute([$searchTerm, $searchTerm, (int)$excludeUserId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($results as &$r) { $r['avatar_path'] = null; }
            return $results;
        }
    }

    public function getCollaborators($targetType, $targetId) {
        try {
            // Jouw exacte originele query
            $stmt = $this->db->prepare("
                SELECT c.id as collab_id, c.user_id, c.role, c.created_at, u.username, u.email, u.avatar_path 
                FROM collaborations c 
                JOIN users u ON c.user_id = u.id 
                WHERE c.target_type = ? AND c.target_id = ?
                ORDER BY c.created_at ASC
            ");
            $stmt->execute([$targetType, $targetId]);
            $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return $res;
        } catch (Throwable $e) {
            try {
                // Veiligheids-Fallback voor als avatar_path in Users tabel mist
                $stmt = $this->db->prepare("
                    SELECT c.id as collab_id, c.user_id, c.role, c.created_at, u.username, u.email 
                    FROM collaborations c 
                    JOIN users u ON c.user_id = u.id 
                    WHERE c.target_type = ? AND c.target_id = ?
                    ORDER BY c.created_at ASC
                ");
                $stmt->execute([$targetType, $targetId]);
                $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach($res as &$r) { $r['avatar_path'] = null; }
                return $res;
            } catch (Throwable $e2) {
                // Gooi de fout actief terug naar Controller zodat de UI dit laat zien
                throw $e2;
            }
        }
    }

    public function addCollaborator($targetType, $targetId, $userId, $role, $currentUserId) {
        $stmt = $this->db->prepare("INSERT INTO collaborations (target_type, target_id, user_id, role, created_by) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = ?");
        return $stmt->execute([$targetType, $targetId, $userId, $role, $currentUserId, $role]);
    }

    public function removeCollaborator($collabId) {
        try {
            $stmt = $this->db->prepare("DELETE FROM collaborations WHERE id = ?");
            return $stmt->execute([$collabId]);
        } catch (Throwable $e) { return false; }
    }
}
?>