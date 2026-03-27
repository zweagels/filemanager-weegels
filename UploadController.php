<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Upload | FILE: app/Controllers/UploadController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Services/UploadService.php';

class UploadController {
    
    private $uploadService;

    public function __construct() {
        // Start buffering om te voorkomen dat onverwachte PHP waarschuwingen de JSON output slopen
        ob_start();
        
        if (!Auth::check()) {
            $this->sendJson(['status' => 'error', 'message' => 'Niet geautoriseerd.'], 401);
        }
        $this->uploadService = new UploadService();
    }

    private function sendJson($data, $statusCode = 200) {
        if (ob_get_length()) ob_end_clean(); 
        header('Content-Type: application/json');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }

    private function getInput() {
        $json = json_decode(file_get_contents('php://input'), true);
        return $json ?: $_POST;
    }

    public function check() { 
        $this->checkChunk(); 
    }
    
    public function checkChunk() {
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        if (!Csrf::validate($token)) {
            $this->sendJson(['status' => 'error', 'message' => 'CSRF Token mismatch.'], 403);
        }
        
        $hash = $input['hash'] ?? '';
        $originalName = $input['original_name'] ?? '';
        $folderId = isset($input['folder_id']) && is_numeric($input['folder_id']) && $input['folder_id'] > 0 ? (int)$input['folder_id'] : null;
        
        try {
            $isDuplicate = $this->uploadService->checkDuplicate($hash, $originalName, Auth::id(), $folderId);
            // FIX: Geef de data exact terug zoals ChunkHandler.js (regel 56) het verwacht!
            $this->sendJson([
                'status' => 'success', 
                'exists' => ($isDuplicate !== false), 
                'file' => $isDuplicate
            ]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function chunk() {
        $input = $_POST;
        $token = $input['csrf_token'] ?? '';
        if (!Csrf::validate($token)) {
            $this->sendJson(['status' => 'error', 'message' => 'CSRF mismatch.'], 403);
        }
        
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $this->sendJson(['status' => 'error', 'message' => 'Upload fout of bestand te groot.'], 400);
        }
        
        $uuid = $input['uuid'] ?? '';
        $index = (int)($input['chunk_index'] ?? 0);
        
        try {
            $this->uploadService->saveChunk($uuid, $index, $_FILES['file']['tmp_name']);
            $this->sendJson(['status' => 'success', 'message' => "Chunk $index opgeslagen."]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function merge() {
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        if (!Csrf::validate($token)) {
            $this->sendJson(['status' => 'error', 'message' => 'CSRF mismatch.'], 403);
        }
        
        try {
            $userId = Auth::id();
            $uuid = $input['uuid'] ?? '';
            $totalChunks = (int)($input['total_chunks'] ?? 0);
            $originalName = $input['original_name'] ?? '';
            $hash = $input['hash'] ?? '';
            $folderId = isset($input['folder_id']) && is_numeric($input['folder_id']) && $input['folder_id'] > 0 ? (int)$input['folder_id'] : null;
            $totalSize = (int)($input['total_size'] ?? 0);
            $relativePath = $input['relative_path'] ?? '';
            
            // =========================================================================
            // FIX: Parameter volgorde is nu 100% gelijk aan de UploadService!
            // ($folderId, $userId, $totalSize, $relativePath)
            // =========================================================================
            $fileId = $this->uploadService->mergeChunks(
                $uuid, 
                $totalChunks, 
                $originalName, 
                $hash, 
                $folderId, 
                $userId, 
                $totalSize, 
                $relativePath
            );
            
            $this->sendJson(['status' => 'success', 'file_id' => $fileId]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}