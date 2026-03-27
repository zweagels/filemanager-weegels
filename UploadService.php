<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: app/Services/UploadService.php */

require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/MimeTypes.php';
require_once __DIR__ . '/../Config/Constants.php';
require_once __DIR__ . '/FileService.php';

class UploadService {

    private $db;
    private $chunksDir;
    private $uploadsDir;
    private $fileService;
    // FASE 4 FIX: Veilige basis whitelist (wordt gecombineerd met jouw Admin Paneel instellingen)
    private $allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'svg', 'bmp', 'ico', 'tiff',
        'mp4', 'm4v', 'mov', 'avi', 'wmv', 'mkv', 'webm', 'flv',
        'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'md', 'csv',
        'zip', 'rar', '7z', 'tar', 'gz', 'iso', 'dmg'
    ];

    public function __construct() {
        $this->db = Database::getConnection();
        $this->fileService = new FileService();
        
        $this->chunksDir = STORAGE_PATH . '/chunks/';
        $this->uploadsDir = STORAGE_PATH . '/uploads/';

        if (!file_exists($this->chunksDir)) {
            @mkdir($this->chunksDir, 0755, true);
        }
        if (!file_exists($this->uploadsDir)) {
            @mkdir($this->uploadsDir, 0755, true);
        }
    }

    public function checkDuplicate($hash, $originalName, $userId, $folderId, $relativePath = "") {
        $targetFolderId = $folderId;
        
        if (!empty($relativePath)) {
            // FASE 4 FIX: Voorkom Directory Traversal hacks via de relatieve paden
            $safePath = str_replace(['../', '..\\'], '', $relativePath);
            $targetFolderId = $this->getFolderIdByPath($safePath, $folderId, $userId);
            if ($targetFolderId === -1) return false;
        }

        $sql = "SELECT id, original_name FROM files WHERE (file_hash = ? OR original_name = ?) AND user_id = ? AND deleted_at IS NULL ";
        $params = [$hash, $originalName, $userId];
        
        if ($targetFolderId === null) {
            $sql .= "AND folder_id IS NULL";
        } else {
            $sql .= "AND folder_id = ?";
            $params[] = (int)$targetFolderId;
        }
        
        $sql .= " LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveChunk($uuid, $chunkIndex, $tmpName) {
        $chunkPath = $this->chunksDir . $uuid . '_part_' . $chunkIndex;
        if (!move_uploaded_file($tmpName, $chunkPath)) {
            throw new Exception("Server kon de chunk niet wegschrijven naar de tijdelijke schijf.");
        }
        return true;
    }

    public function mergeChunks($uuid, $totalChunks, $originalName, $hash, $folderId, $userId, $totalSize, $relativePath = "") {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $this->validateExtension($ext);

        $storageName = hash('sha256', uniqid($uuid, true) . time() . $userId);
        $finalPath = $this->uploadsDir . $storageName;

        $out = fopen($finalPath, 'wb');
        if (!$out) {
            throw new Exception("Kon doelbestand niet openen om samen te voegen.");
        }

        // FASE 4 FIX: File Lock toevoegen om corruptie door gelijktijdige uploads te voorkomen
        if (!flock($out, LOCK_EX)) {
            fclose($out);
            throw new Exception("Systeem was niet in staat om het bestand veilig te vergrendelen.");
        }

        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkPath = $this->chunksDir . $uuid . '_part_' . $i;
            
            if (!file_exists($chunkPath)) {
                flock($out, LOCK_UN);
                fclose($out);
                if (file_exists($finalPath)) @unlink($finalPath);
                throw new Exception("Ontbrekende bestandspartitie (Deel $i). Upload is corrupt of afgebroken.");
            }
            
            $in = fopen($chunkPath, 'rb');
            while ($buff = fread($in, 8192)) {
                fwrite($out, $buff);
            }
            fclose($in);
            
            @unlink($chunkPath);
        }
        
        // FASE 4 FIX: Lock vrijgeven zodra merge klaar is
        flock($out, LOCK_UN);
        fclose($out);

        $actualSize = filesize($finalPath);
        if ($actualSize != $totalSize) {
            @unlink($finalPath);
            throw new Exception("Bestandsgrootte komt niet overeen na samenvoegen ($actualSize vs $totalSize bytes).");
        }

        $actualHash = hash_file('sha256', $finalPath);
        if ($actualHash !== $hash) {
            @unlink($finalPath);
            throw new Exception("Bestand is beschadigd tijdens overdracht (Hash mismatch).");
        }

        $mimeType = MimeTypes::getMimeType($ext);
        $category = MimeTypes::getType($ext);

        $finalFolderId = $folderId;
        if (!empty($relativePath)) {
            $safePath = str_replace(['../', '..\\'], '', $relativePath);
            $finalFolderId = $this->createFolderStructure($safePath, $folderId, $userId);
        }

        $stmtDel = $this->db->prepare("UPDATE files SET deleted_at = NOW() WHERE (file_hash = ? OR original_name = ?) AND user_id = ? AND (folder_id = ? OR (folder_id IS NULL AND ? IS NULL))");
        $stmtDel->execute([$actualHash, $originalName, $userId, $finalFolderId, $finalFolderId]);

        $stmt = $this->db->prepare("
            INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mime_type, size, file_hash, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $userId, 
            $finalFolderId, 
            $storageName, 
            $originalName, 
            $ext, 
            $mimeType, 
            $totalSize, 
            $actualHash, 
            $category
        ]);

        return $this->db->lastInsertId();
    }

    private function validateExtension($ext) {
        $blacklist = ['exe', 'bat', 'sh', 'php', 'js', 'phtml', 'cgi', 'php5', 'phar']; 
        
        // 1. Haal de instellingen uit het Admin Paneel op (Functionaliteit hersteld!)
        try {
            // Compatibiliteit met je originele instellingen
            $stmt = $this->db->prepare("SELECT value FROM settings WHERE key_name = 'upload_blacklist'");
            $stmt->execute();
            $setting = $stmt->fetch();
            
            // Als hij in de nieuwe tabel staat
            if (!$setting) {
                $stmt2 = $this->db->prepare("SELECT setting_value as value FROM system_settings WHERE setting_key = 'upload_blacklist'");
                $stmt2->execute();
                $setting = $stmt2->fetch();
            }
            
            if ($setting && !empty($setting['value'])) {
                $customBlacklist = array_map('trim', explode(',', strtolower($setting['value'])));
                $blacklist = array_merge($blacklist, $customBlacklist);
            }
        } catch (Exception $e) {}

        // 2. Eerst blokkeren we expliciet wat de admin heeft verboden
        if (in_array($ext, $blacklist)) {
            throw new Exception("Het uploaden van '." . $ext . "' bestanden is geblokkeerd door de beheerder.");
        }

        // 3. Dan controleren we of het een algemeen toegestaan bestand is (Hybride beveiliging)
        if (!in_array($ext, $this->allowedExtensions)) {
            throw new Exception("Het uploaden van '." . $ext . "' bestanden wordt niet ondersteund. Alleen veilige media en documenten zijn toegestaan.");
        }
    }

    private function getFolderIdByPath($relativePath, $baseFolderId, $userId) {
        $parts = explode('/', $relativePath);
        array_pop($parts); 
        $currentId = $baseFolderId;

        foreach ($parts as $name) {
            $name = trim($name);
            if (empty($name)) continue;
            
            $sql = "SELECT id FROM folders WHERE name = ? AND user_id = ? AND deleted_at IS NULL ";
            $params = [$name, $userId];
            if ($currentId === null) {
                $sql .= "AND parent_id IS NULL";
            } else {
                $sql .= "AND parent_id = ?";
                $params[] = (int)$currentId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $currentId = $row['id'];
            } else {
                return -1; 
            }
        }
        return $currentId;
    }

    private function createFolderStructure($relativePath, $baseFolderId, $userId) {
        $parts = explode('/', $relativePath);
        array_pop($parts); 
        $currentId = $baseFolderId;

        foreach ($parts as $name) {
            $name = trim($name);
            if (empty($name)) continue;
            
            $sql = "SELECT id FROM folders WHERE name = ? AND user_id = ? AND deleted_at IS NULL ";
            $params = [$name, $userId];
            if ($currentId === null) {
                $sql .= "AND parent_id IS NULL";
            } else {
                $sql .= "AND parent_id = ?";
                $params[] = (int)$currentId;
            }
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $currentId = $row['id'];
            } else {
                $currentId = $this->fileService->createFolder($name, $currentId, $userId);
            }
        }
        return $currentId;
    }
}
?>