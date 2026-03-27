<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Dashboard | FILE: app/Services/DashboardService.php */

require_once __DIR__ . '/../Config/Database.php';

class DashboardService {
    
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getDashboardData($userId) {
        return [
            'storage' => $this->getStorageStats($userId),
            'activity' => $this->getRecentActivity($userId),
            'fileTypes' => $this->getFileTypeStats($userId),
            'shortcuts' => $this->getShortcuts($userId),
            'trash_count' => $this->getTrashCount($userId),
            'active_shares' => $this->getActiveSharesCount($userId),
            'shared_with_me' => $this->getRecentSharedWithMe($userId),
            'settings' => $this->getSettings($userId),
            'activity_chart' => $this->getActivityChart($userId),
            'top_folders' => $this->getTopFolders($userId),
            'file_requests' => $this->getFileRequests($userId),
            
            // FASE F: Gewijzigd en toegevoegd voor Notificaties en Heatmap
            'sys_notices' => $this->getSystemNotifications($userId),
            'heatmap' => $this->getHeatmap($userId)
        ];
    }

    public function getWidgetData($userId, $widgetType) {
        switch($widgetType) {
            case 'settings': return $this->getSettings($userId);
            case 'storage': return $this->getStorageStats($userId);
            case 'activity': return $this->getRecentActivity($userId);
            case 'types': return $this->getFileTypeStats($userId);
            case 'shortcuts': return $this->getShortcuts($userId);
            case 'trash': return ['trash_count' => $this->getTrashCount($userId)];
            case 'active_links': return ['active_shares' => $this->getActiveSharesCount($userId)];
            case 'shared_with_me': return $this->getRecentSharedWithMe($userId);
            case 'activity_chart': return $this->getActivityChart($userId);
            case 'top_folders': return $this->getTopFolders($userId);
            case 'file_requests': return $this->getFileRequests($userId);
            
            // FASE F toegevoegd:
            case 'sys_notices': return $this->getSystemNotifications($userId);
            case 'heatmap': return $this->getHeatmap($userId);
            
            default: return null;
        }
    }

    public function saveLayout($userId, $layoutJson) {
        try {
            $stmt = $this->db->prepare("INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, 'dashboard_layout', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()");
            return $stmt->execute([$userId, $layoutJson]);
        } catch (Exception $e) { return false; }
    }

    public function getLayout($userId) {
        try {
            $stmt = $this->db->prepare("SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = 'dashboard_layout'");
            $stmt->execute([$userId]);
            $res = $stmt->fetchColumn();
            return $res ? json_decode($res, true) : null;
        } catch (Exception $e) { return null; }
    }

    public function updateSettings($userId, $field, $data) {
        if (!in_array($field, ['todos', 'bookmarks', 'banner_layout', 'banner_font', 'banner_effect', 'banner_type', 'banner_color', 'banner_image', 'banner_overlay', 'banner_glass', 'banner_clock', 'banner_subtitle'])) {
            throw new Exception('Ongeldig instellingenveld.');
        }

        $currentSettings = $this->getSettings($userId);
        $currentSettings[$field] = $data;

        $stmt = $this->db->prepare("INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, 'dashboard_settings', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()");
        $stmt->execute([$userId, json_encode($currentSettings)]);
    }

    private function getSettings($userId) {
        try {
            $stmt = $this->db->prepare("SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = 'dashboard_settings'");
            $stmt->execute([$userId]);
            $res = $stmt->fetchColumn();
            return $res ? json_decode($res, true) : [];
        } catch (Exception $e) { return []; }
    }

    private function getStorageStats($userId) {
        try {
            $stmt = $this->db->prepare("SELECT SUM(size) as total FROM files WHERE user_id = ? AND deleted_at IS NULL");
            $stmt->execute([$userId]);
            $usedBytes = (int)$stmt->fetchColumn();

            $stmtQ = $this->db->prepare("SELECT storage_quota FROM users WHERE id = ?");
            $stmtQ->execute([$userId]);
            $quotaBytes = (int)$stmtQ->fetchColumn();
            if ($quotaBytes <= 0) $quotaBytes = 5368709120; // 5GB fallback

            $percentage = ($usedBytes / $quotaBytes) * 100;
            return [
                'used_bytes' => $usedBytes,
                'used_formatted' => $this->formatBytes($usedBytes),
                'total_bytes' => $quotaBytes,
                'total_formatted' => $this->formatBytes($quotaBytes),
                'percentage' => round($percentage, 1)
            ];
        } catch (Exception $e) {
            return ['used_bytes'=>0, 'used_formatted'=>'0 B', 'total_bytes'=>5368709120, 'total_formatted'=>'5 GB', 'percentage'=>0];
        }
    }

    private function getRecentActivity($userId) {
        try {
            $stmt = $this->db->prepare("SELECT action, details, created_at, target_id as id, target_type as category FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { return []; }
    }

    private function getFileTypeStats($userId) {
        try {
            $stmt = $this->db->prepare("SELECT category, COUNT(*) as count FROM files WHERE user_id = ? AND deleted_at IS NULL GROUP BY category");
            $stmt->execute([$userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $types = ['image'=>0, 'video'=>0, 'doc'=>0, 'audio'=>0, 'archive'=>0, 'other'=>0];
            foreach ($rows as $row) {
                $cat = $row['category'] ?? 'other';
                if (isset($types[$cat])) $types[$cat] = (int)$row['count'];
                else $types['other'] += (int)$row['count'];
            }
            return $types;
        } catch (Exception $e) { return []; }
    }

    private function getShortcuts($userId) {
        try {
            $stmtF = $this->db->prepare("SELECT id, name, color, 'folder' as type FROM folders WHERE user_id = ? AND is_favorite = 1 AND deleted_at IS NULL LIMIT 4");
            $stmtF->execute([$userId]);
            $folders = $stmtF->fetchAll(PDO::FETCH_ASSOC);

            $stmtFi = $this->db->prepare("SELECT id, original_name as name, extension, 'file' as type, created_at FROM files WHERE user_id = ? AND is_favorite = 1 AND deleted_at IS NULL LIMIT 4");
            $stmtFi->execute([$userId]);
            $files = $stmtFi->fetchAll(PDO::FETCH_ASSOC);

            return array_slice(array_merge($folders, $files), 0, 4);
        } catch (Exception $e) { return []; }
    }

    private function getTrashCount($userId) {
        try {
            $f = $this->db->prepare("SELECT COUNT(*) FROM files WHERE user_id = ? AND deleted_at IS NOT NULL");
            $f->execute([$userId]);
            $fc = (int)$f->fetchColumn();

            $d = $this->db->prepare("SELECT COUNT(*) FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL");
            $d->execute([$userId]);
            $dc = (int)$d->fetchColumn();

            return $fc + $dc;
        } catch (Exception $e) { return 0; }
    }

    private function getActiveSharesCount($userId) {
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM share_links WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())");
            $stmt->execute([$userId]);
            return (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            try {
                $stmt = $this->db->prepare("SELECT COUNT(*) FROM shares WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())");
                $stmt->execute([$userId]);
                return (int)$stmt->fetchColumn();
            } catch (Exception $e2) { return 0; }
        }
    }

    private function getRecentSharedWithMe($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT c.target_id as id, c.target_type, c.role, u.username 
                FROM collaborations c 
                JOIN users u ON c.owner_id = u.id 
                WHERE c.user_id = ? AND (c.expires_at IS NULL OR c.expires_at > NOW())
                ORDER BY c.created_at DESC LIMIT 5
            ");
            $stmt->execute([$userId]);
            $collabs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($collabs as &$c) {
                if ($c['target_type'] === 'file') {
                    $s = $this->db->prepare("SELECT original_name as name FROM files WHERE id = ?");
                    $s->execute([$c['id']]);
                    $c['name'] = $s->fetchColumn();
                } else {
                    $s = $this->db->prepare("SELECT name FROM folders WHERE id = ?");
                    $s->execute([$c['id']]);
                    $c['name'] = $s->fetchColumn();
                }
            }
            return $collabs;
        } catch (Exception $e) { return []; }
    }

    private function getActivityChart($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT DATE(created_at) as date, COUNT(*) as count 
                FROM audit_logs 
                WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) 
                GROUP BY DATE(created_at) ORDER BY date ASC
            ");
            $stmt->execute([$userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            for($i = 6; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $data[$d] = 0;
            }
            foreach($rows as $row) {
                $data[$row['date']] = (int)$row['count'];
            }
            
            $labels = [];
            $days = ['Zon','Maa','Din','Woe','Don','Vri','Zat'];
            foreach(array_keys($data) as $d) {
                $labels[] = $days[date('w', strtotime($d))];
            }
            return ['labels' => $labels, 'values' => array_values($data)];
        } catch (Exception $e) { return ['labels'=>['Maa','Din','Woe','Don','Vri','Zat','Zon'], 'values'=>[0,0,0,0,0,0,0]]; }
    }

    private function getTopFolders($userId) {
        try {
            $stmt = $this->db->prepare("SELECT folder_id, SUM(size) as total_size FROM files WHERE user_id = ? AND folder_id IS NOT NULL AND deleted_at IS NULL GROUP BY folder_id ORDER BY total_size DESC LIMIT 5");
            $stmt->execute([$userId]);
            $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($folders as &$folder) {
                $s = $this->db->prepare("SELECT name, color FROM folders WHERE id = ?");
                $s->execute([$folder['folder_id']]);
                $fInfo = $s->fetch(PDO::FETCH_ASSOC);
                
                $folder['name'] = $fInfo ? $fInfo['name'] : 'Map';
                $folder['color'] = $fInfo ? $fInfo['color'] : null;
                $folder['id'] = $folder['folder_id'];
                
                $bytes = (int)$folder['total_size'];
                $folder['formatted_size'] = $this->formatBytes($bytes);
            }
            return $folders;
        } catch (Exception $e) { return []; }
    }
    
    private function formatBytes($bytes) {
        if ($bytes <= 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = floor(log($bytes, 1024));
        return round($bytes / pow(1024, $power), 2) . ' ' . $units[$power];
    }

    private function getFileRequests($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, created_at, expires_at 
                FROM share_links 
                WHERE created_by = ? AND type = 'request' AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY created_at DESC LIMIT 5
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { return []; }
    }

    // FASE F: Oplossing voor het inladen van de persoonlijke Broadcast Notificaties (Belletje)
    private function getSystemNotifications($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, title, message, created_at, type, is_read 
                FROM notifications 
                WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW()) 
                ORDER BY created_at DESC LIMIT 10
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) { return []; }
    }

    // FASE F: Oplossing voor de 12 Maanden Activiteit Heatmap Data
    private function getHeatmap($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT DATE(created_at) as date, COUNT(*) as count 
                FROM audit_logs 
                WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 365 DAY) 
                GROUP BY DATE(created_at)
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) { return []; }
    }
}
?>