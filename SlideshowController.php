<?php
// Pad: app/Controllers/SlideshowController.php

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: app/Controllers/SlideshowController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/Constants.php';
require_once __DIR__ . '/../Services/SlideshowService.php';

class SlideshowController {
    
    private $service;
    private $db;

    public function __construct() {
        $this->service = new SlideshowService();
        $this->db = Database::getConnection();
    }

    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ? $input : [];
    }

    private function requireAuth() {
        if (!Auth::check()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Niet ingelogd']);
            exit;
        }
    }

    public function create() {
        $this->requireAuth();
        header('Content-Type: application/json');
        $input = $this->getJsonInput();
        
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Onveilige actie (CSRF mismatch).']);
            return;
        }
        
        try {
            $title = $input['title'] ?? 'Naamloze Presentatie';
            
            $albumIds = $input['album_ids'] ?? [];
            if (isset($input['album_id']) && !in_array($input['album_id'], $albumIds)) {
                $albumIds[] = $input['album_id']; 
            }
            
            $foldersExact = $input['folders_exact'] ?? [];
            $foldersRecursive = $input['folders_recursive'] ?? [];

            $data = $this->service->createSlideshow(Auth::id(), $title, $albumIds, $foldersExact, $foldersRecursive);
            
            echo json_encode(['status' => 'success', 'data' => $data, 'message' => 'Slideshow aangemaakt.']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Fout bij aanmaken: ' . $e->getMessage()]);
        }
    }

    public function autoPlay() {
        $this->requireAuth();
        header('Content-Type: application/json');
        $input = $this->getJsonInput();

        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Onveilige actie (CSRF mismatch).']);
            return;
        }

        try {
            $sourceType = $input['source_type'] ?? ''; 
            $sourceId = $input['source_id'] ?? 0;

            if (!$sourceType || !$sourceId) {
                throw new Exception("Bron type en ID zijn verplicht.");
            }

            $uuid = $this->service->createAutoPlaySlideshow(Auth::id(), $sourceType, $sourceId);
            echo json_encode(['status' => 'success', 'data' => ['uuid' => $uuid], 'message' => 'Auto-play slideshow gestart.']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Fout bij starten auto-play: ' . $e->getMessage()]);
        }
    }

    public function delete() {
        $this->requireAuth();
        header('Content-Type: application/json');
        $input = $this->getJsonInput();
        
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Onveilige actie (CSRF mismatch).']);
            return;
        }
        
        try {
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Geen geldig ID opgegeven om te verwijderen.");
            
            $this->service->deleteSlideshow($id, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Slideshow succesvol verwijderd.']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Fout bij verwijderen: ' . $e->getMessage()]);
        }
    }

    public function overview() {
        $this->requireAuth();
        header('Content-Type: application/json');
        try {
            $data = $this->service->getOverview(Auth::id());
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getPlayData() {
        header('Content-Type: application/json');
        $uuid = $_GET['token'] ?? '';
        $ip = $_SERVER['REMOTE_ADDR'];

        if (empty($uuid)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Geen token opgegeven']);
            exit;
        }

        try {
            $stmt = $this->db->prepare("SELECT * FROM slideshows WHERE uuid = ? LIMIT 1");
            $stmt->execute([$uuid]);
            $slideshow = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$slideshow) {
                throw new Exception("Presentatie niet gevonden of is verwijderd.");
            }

            $rateLimit = $this->checkRateLimit($ip);
            if ($rateLimit['blocked']) {
                $this->logAccess($slideshow['id'], $ip, 'failed');
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'Te veel mislukte pogingen. Vanaf dit netwerk ben je 15 minuten geblokkeerd.',
                    'requires_pin' => true
                ]);
                exit;
            }

            if (!empty($slideshow['pincode_hash'])) {
                if (session_status() === PHP_SESSION_NONE) {
                    session_start();
                }
                
                $sessionKey = 'ss_auth_' . $slideshow['id'];
                $isAuthorized = isset($_SESSION[$sessionKey]) && $_SESSION[$sessionKey] === true;

                if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    $input = $this->getJsonInput();
                    $pinAttempt = $input['pincode'] ?? '';
                    
                    if (password_verify($pinAttempt, $slideshow['pincode_hash'])) {
                        $_SESSION[$sessionKey] = true;
                        $this->logAccess($slideshow['id'], $ip, 'success');
                        $this->clearAttempts($ip);
                        $isAuthorized = true;
                    } else {
                        $this->logAttempt($ip);
                        $this->logAccess($slideshow['id'], $ip, 'failed');
                        echo json_encode(['status' => 'error', 'message' => 'Onjuiste pincode. Probeer opnieuw.']);
                        exit;
                    }
                }

                if (!$isAuthorized) {
                    echo json_encode([
                        'status' => 'requires_pin', 
                        'message' => 'Deze Enterprise presentatie is beveiligd met een pincode.'
                    ]);
                    exit;
                }
            }

            // FASE 2 (DEEL 3) FIX: De LEFT JOIN bestanden tabel en de URL formattering zijn hersteld!
            $stmtItems = $this->db->prepare("
                SELECT si.*, f.storage_name, f.original_name, f.extension, f.mime_type, f.size 
                FROM slideshow_items si
                LEFT JOIN files f ON si.file_id = f.id
                WHERE si.slideshow_id = ? AND si.is_active = 1 
                ORDER BY si.sort_order ASC
            ");
            $stmtItems->execute([$slideshow['id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                if (!empty($item['settings']) && is_string($item['settings'])) {
                    $decoded = json_decode($item['settings'], true);
                    $item['settings'] = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : new stdClass();
                } else {
                    $item['settings'] = new stdClass();
                }

                if (($item['layout_type'] ?? '') === 'full') {
                    $item['layout_type'] = null;
                }

                // FIX: Bouw het juiste bestandspad en detecteer Video Media!
                if (!empty($item['storage_name'])) {
                    $item['file_url'] = '/storage/uploads/' . $item['storage_name'];
                } else {
                    $item['file_url'] = '/api/files/download?id=' . $item['file_id'] . '&view=1';
                }
                
                $item['type'] = (!empty($item['mime_type']) && strpos($item['mime_type'], 'video') !== false) ? 'video' : 'image';
            }
            unset($item);

            $dbSettings = new stdClass();
            if (!empty($slideshow['settings']) && is_string($slideshow['settings'])) {
                $decodedDb = json_decode($slideshow['settings'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decodedDb)) {
                    $dbSettings = $decodedDb;
                }
            }
            
            $mergedSettings = array_merge([
                'id' => $slideshow['id'],
                'title' => $slideshow['title'],
                'theme_mode' => $slideshow['theme_mode'],
                'allow_video' => $slideshow['allow_video'],
                'show_progress_bar' => $slideshow['show_progress_bar'] ?? 1,
                'enable_vignette' => $slideshow['enable_vignette'] ?? 1
            ], (array)$dbSettings);

            $radio = $slideshow['radio_station_id'] ? $this->db->query("SELECT * FROM sys_radios WHERE id = " . $slideshow['radio_station_id'])->fetch(PDO::FETCH_ASSOC) : null;
            $clock = $slideshow['clock_id'] ? $this->db->query("SELECT * FROM sys_clocks WHERE id = " . $slideshow['clock_id'])->fetch(PDO::FETCH_ASSOC) : null;
            
            $transitions = $this->db->query("SELECT id, css_class FROM sys_transitions WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
            $backgrounds = $this->db->query("SELECT id, name, css_animation FROM sys_backgrounds WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'settings' => $mergedSettings,
                    'items' => $items,
                    'radio' => $radio,
                    'clock' => $clock,
                    'dictionaries' => [
                        'transitions' => $transitions,
                        'backgrounds' => $backgrounds
                    ]
                ]
            ]);

        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getAccessLogs() {
        $this->requireAuth();
        header('Content-Type: application/json');
        $slideshowId = $_GET['id'] ?? 0;

        try {
            $stmtOwner = $this->db->prepare("SELECT user_id FROM slideshows WHERE id = ?");
            $stmtOwner->execute([$slideshowId]);
            $ownerId = $stmtOwner->fetchColumn();

            if ($ownerId != Auth::id() && !Auth::can('admin_settings')) {
                throw new Exception("Geen toegang tot deze veiligheidslogs.");
            }

            $stmt = $this->db->prepare("
                SELECT ip_address, status, timestamp 
                FROM slideshow_access_logs 
                WHERE slideshow_id = ? 
                ORDER BY timestamp DESC LIMIT 50
            ");
            $stmt->execute([$slideshowId]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $logs]);
        } catch (Throwable $e) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function trackAnalytics() {
        header('Content-Type: application/json');
        $input = $this->getJsonInput();
        
        $slideshowId = $input['slideshow_id'] ?? null;
        $itemId = $input['item_id'] ?? null; 
        $watchTime = $input['watch_time'] ?? 10; 

        if ($slideshowId) {
            try {
                $this->service->trackItemView($slideshowId, $itemId, $watchTime);
                echo json_encode(['status' => 'success']);
            } catch (Throwable $e) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Geen geldige presentatie ID.']);
        }
    }

    private function checkRateLimit($ip) {
        if (session_status() === PHP_SESSION_NONE) session_start();
        $key = 'ss_bf_' . md5($ip);
        $time = time();

        if (isset($_SESSION[$key])) {
            if ($_SESSION[$key]['count'] >= 5) {
                $timeSinceFirst = $time - $_SESSION[$key]['first_attempt_in_window'];
                if ($timeSinceFirst < 900) {
                    return ['blocked' => true];
                } else {
                    $_SESSION[$key]['count'] = 0;
                    return ['blocked' => false];
                }
            }
        }
        return ['blocked' => false];
    }

    private function logAttempt($ip) {
        if (session_status() === PHP_SESSION_NONE) session_start();
        $key = 'ss_bf_' . md5($ip);
        $time = time();

        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = ['count' => 1, 'last_attempt' => $time, 'first_attempt_in_window' => $time];
        } else {
            if ($time > ($_SESSION[$key]['last_attempt'] + 900)) {
                $_SESSION[$key]['count'] = 1;
                $_SESSION[$key]['first_attempt_in_window'] = $time;
            } else {
                $_SESSION[$key]['count']++;
            }
            $_SESSION[$key]['last_attempt'] = $time;
        }
    }

    private function clearAttempts($ip) {
        if (session_status() === PHP_SESSION_NONE) session_start();
        $key = 'ss_bf_' . md5($ip);
        if (isset($_SESSION[$key])) {
            unset($_SESSION[$key]);
        }
    }
    
    private function logAccess($slideshowId, $ip, $status) {
        try {
            $stmt = $this->db->prepare("INSERT INTO slideshow_access_logs (slideshow_id, ip_address, status, timestamp) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$slideshowId, $ip, $status]);
        } catch(Exception $e) {}
    }
}
?>