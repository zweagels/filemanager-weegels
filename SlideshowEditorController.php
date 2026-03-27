<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: app/Controllers/SlideshowEditorController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Services/SlideshowService.php';

class SlideshowEditorController {
    
    private $service;

    public function __construct() {
        ob_start(); 
        if (!Auth::check()) {
            $this->sendJson(['status' => 'error', 'message' => 'Sessie verlopen, log opnieuw in.'], 401);
        }
        $this->service = new SlideshowService();
    }

    private function sendJson($data, $statusCode = 200) {
        if (ob_get_length()) ob_end_clean();
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ? $input : [];
    }

    private function validateCsrf($token) {
        if (!Csrf::validate($token)) {
            $this->sendJson(['status' => 'error', 'message' => 'Onveilige actie (CSRF mismatch).'], 403);
        }
    }

    public function create() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');
        
        try {
            $title = $input['title'] ?? 'Naamloze Presentatie';
            
            $albumIds = $input['album_ids'] ?? [];
            $foldersExact = $input['folder_ids_exact'] ?? []; 
            $foldersRecursive = $input['folder_ids_recursive'] ?? [];
            
            $data = $this->service->createSlideshow(Auth::id(), $title, $albumIds, $foldersExact, $foldersRecursive);
            $this->sendJson(['status' => 'success', 'data' => $data, 'message' => 'Slideshow aangemaakt.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function delete() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');
        
        try {
            $id = $input['id'] ?? 0;
            if (!$id) throw new Exception("Geen geldig ID opgegeven om te verwijderen.");
            
            $this->service->deleteSlideshow($id, Auth::id());
            $this->sendJson(['status' => 'success', 'message' => 'Slideshow succesvol verwijderd.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function load() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendJson(['status' => 'error', 'message' => 'Slideshow ID ontbreekt.'], 400);
        }

        try {
            $data = $this->service->getEditorData($id, Auth::id());
            $this->sendJson(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function save() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');
        
        $slideshowId = $input['slideshow_id'] ?? null;
        $settings = $input['settings'] ?? null;
        
        $items = $input['delta_items'] ?? null; 
        
        $logMessage = $input['log_message'] ?? null;

        if (!$slideshowId) {
            $this->sendJson(['status' => 'error', 'message' => 'Ongeldige payload.'], 400);
        }

        try {
            $settingsSaved = false;
            if ($settings) {
                $this->service->saveSettings($slideshowId, Auth::id(), $settings, $logMessage);
                $settingsSaved = true;
            }
            
            if ($items) {
                foreach ($items as &$item) {
                    if (isset($item['settings']) && is_array($item['settings'])) {
                        if (isset($item['settings']['layout_type'])) {
                            $item['layout_type'] = $item['settings']['layout_type'];
                        }
                        if (isset($item['settings']['focal_point'])) {
                            $item['focal_point'] = $item['settings']['focal_point'];
                        }
                        if (isset($item['settings']['background_id'])) {
                            $item['animation_bg'] = $item['settings']['background_id'];
                        }
                    }
                }
                unset($item);
                
                $itemLog = $settingsSaved ? null : $logMessage;
                $this->service->saveDeltaItems($slideshowId, Auth::id(), $items, $itemLog);
            }
            
            $this->sendJson(['status' => 'success', 'message' => 'Wijzigingen succesvol opgeslagen!']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function removeItems() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');
        
        try {
            $this->service->removeItems($input['slideshow_id'], Auth::id(), $input['item_ids'] ?? []);
            $this->sendJson(['status' => 'success']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function lock() {
        $input = $this->getJsonInput();
        try {
            $success = $this->service->lockSlideshow($input['slideshow_id'], Auth::id());
            $this->sendJson([
                'status' => $success ? 'success' : 'locked', 
                'message' => $success ? 'Locked' : 'In gebruik door iemand anders'
            ]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function unlock() {
        $input = $this->getJsonInput();
        try {
            $this->service->unlockSlideshow($input['slideshow_id'], Auth::id());
            $this->sendJson(['status' => 'success']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error'], 500);
        }
    }

    public function createSnapshot() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');

        try {
            $this->service->createSnapshot($input['slideshow_id'], Auth::id(), $input['title'] ?? 'Back-up', $input['subject'] ?? '');
            $this->sendJson(['status' => 'success', 'message' => 'Snapshot veilig weggeschreven!']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function restoreSnapshot() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');

        try {
            $this->service->restoreSnapshot($input['slideshow_id'], Auth::id(), $input['snapshot_id']);
            $this->sendJson(['status' => 'success', 'message' => 'Snapshot succesvol hersteld.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function addCollaborator() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');

        try {
            $this->service->addCollaborator($input['slideshow_id'], Auth::id(), $input['target_user_id'], $input['role']);
            $this->sendJson(['status' => 'success', 'message' => 'Samenwerker toegevoegd.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function removeCollaborator() {
        $input = $this->getJsonInput();
        $this->validateCsrf($input['csrf_token'] ?? '');

        try {
            $this->service->removeCollaborator($input['slideshow_id'], Auth::id(), $input['target_user_id']);
            $this->sendJson(['status' => 'success', 'message' => 'Samenwerker verwijderd.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function heartbeat() {
        $input = $this->getJsonInput();
        try {
            $data = $this->service->processHeartbeat(
                $input['slideshow_id'] ?? 0, 
                Auth::id(), 
                $input['cursor_x'] ?? 0, 
                $input['cursor_y'] ?? 0, 
                $input['action'] ?? null
            );
            $this->sendJson(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function export() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $this->sendJson(['status' => 'error', 'message' => 'Slideshow ID ontbreekt.'], 400);
        }

        try {
            require_once __DIR__ . '/../Services/ConvertService.php';
            $convertService = new ConvertService();
            $convertService->startSlideshowExport($id, Auth::id());
            
            $this->sendJson(['status' => 'success', 'message' => 'Export gestart op de achtergrond. Dit kan enkele minuten duren.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    
    public function getSnapshotDiff() {
        $id = $_GET['id'] ?? null;
        $snapshotId = $_GET['snapshot_id'] ?? null;
        
        try {
            $diff = $this->service->getSnapshotDiff($id, $snapshotId, Auth::id());
            $this->sendJson(['status' => 'success', 'data' => $diff]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }
}
?>