<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Media & Editor | FILE: app/Controllers/ConvertController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/Constants.php';
require_once __DIR__ . '/../Config/MimeTypes.php';
require_once __DIR__ . '/../Services/ConvertService.php';

class ConvertController {
    
    private $convertService;
    private $db;

    public function __construct() {
        ob_start();
        if (!Auth::check()) {
            $this->sendJson(['status' => 'error', 'message' => 'Niet geautoriseerd.'], 401);
        }
        $this->convertService = new ConvertService();
        $this->db = Database::getConnection();
    }

    private function sendJson($data, $statusCode = 200) {
        if (ob_get_length()) ob_end_clean();
        header('Content-Type: application/json');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }

    public function index() {
        $action = $_POST['action'] ?? '';
        $token = $_POST['csrf_token'] ?? '';
        if (!Csrf::validate($token)) {
            $this->sendJson(['status' => 'error', 'message' => 'CSRF validatie mislukt.'], 403);
        }

        if ($action === 'save_edit') {
            $this->saveEdit();
        } elseif ($action === 'convert') {
            $this->convertFile();
        } else {
            $this->sendJson(['status' => 'error', 'message' => 'Onbekende actie.'], 400);
        }
    }

    private function saveEdit() {
        try {
            $userId = Auth::id();
            
            // Filter Folder ID zodat hij netjes in de hoofdmap terechtkomt als folder leeg is
            $folderId = isset($_POST['folder_id']) && is_numeric($_POST['folder_id']) && $_POST['folder_id'] > 0 
                        ? (int)$_POST['folder_id'] : null;

            $newName = $_POST['new_name'] ?? 'bewerkt.jpg';

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("Geen geldig bestand ontvangen. Controleer upload limieten op de server.");
            }

            $tmpPath = $_FILES['file']['tmp_name'];
            $size = filesize($tmpPath);

            // =========================================================================
            // FIX: FYSIEK BESTAND OPSLAAN (Gegarandeerde methode zonder omwegen)
            // =========================================================================
            $ext = strtolower(pathinfo($newName, PATHINFO_EXTENSION));
            $hash = hash_file('sha256', $tmpPath);
            $storageName = bin2hex(random_bytes(32)) . '.bin'; // Harde veiligheid
            
            $uploadDir = STORAGE_PATH . '/uploads/';
            if (!file_exists($uploadDir)) {
                @mkdir($uploadDir, 0755, true);
            }
            
            $targetPath = $uploadDir . $storageName;
            
            // We verplaatsen het eerst. Als dit mislukt stopt hij, en maakt hij GEEN spook-bestand in de database aan!
            if (!move_uploaded_file($tmpPath, $targetPath)) {
                throw new Exception("Server weigert het bestand fysiek op te slaan (Check map rechten).");
            }

            // =========================================================================
            // DATABASE UPDATE (Alleen als de foto écht op de schijf staat)
            // =========================================================================
            $mime = MimeTypes::getMimeType($ext);
            $category = MimeTypes::getType($ext);

            $stmtIns = $this->db->prepare("
                INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mime_type, size, file_hash, category, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmtIns->execute([
                $userId, $folderId, $storageName, $newName, $ext, $mime, $size, $hash, $category
            ]);
            
            $newId = $this->db->lastInsertId();

            $this->sendJson([
                'status' => 'success', 
                'message' => 'Bewerking succesvol opgeslagen.', 
                'new_id' => $newId
            ]);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function convertFile() {
        try {
            $userId = Auth::id();
            $fileId = isset($_POST['file_id']) ? (int)$_POST['file_id'] : 0;
            $targetFormat = $_POST['target_format'] ?? '';
            $quality = isset($_POST['quality']) ? (int)$_POST['quality'] : 85;
            $folderId = isset($_POST['folder_id']) && is_numeric($_POST['folder_id']) && $_POST['folder_id'] > 0 
                        ? (int)$_POST['folder_id'] : null;

            if (empty($fileId) || empty($targetFormat)) {
                throw new Exception("Ontbrekende gegevens voor conversie.");
            }

            $allowedFormats = ['jpg', 'webp', 'png', 'mp4', 'webm', 'mp3'];
            if (!in_array(strtolower($targetFormat), $allowedFormats)) {
                throw new Exception("Doelformaat is niet toegestaan.");
            }

            $this->convertService->convertMedia($userId, $fileId, $folderId, $targetFormat, $quality);

            $this->sendJson(['status' => 'success', 'message' => 'Conversie voltooid.']);
        } catch (Exception $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}