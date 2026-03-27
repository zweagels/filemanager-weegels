<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Media & Editor | FILE: app/Services/ConvertService.php */

require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/MimeTypes.php';
require_once __DIR__ . '/../Config/Constants.php';

class ConvertService {

    private $db;
    private $uploadsDir;

    public function __construct() {
        $this->db = Database::getConnection();
        
        // FASE 10 FIX: Kogelvrije pad-detectie. Hiermee voorkomen we "Bronbestand mist" fouten!
        $possiblePaths = [
            __DIR__ . '/../../storage/uploads/',
            $_SERVER['DOCUMENT_ROOT'] . '/storage/uploads/',
            defined('STORAGE_PATH') ? STORAGE_PATH . '/uploads/' : ''
        ];
        
        foreach ($possiblePaths as $p) {
            if (!empty($p) && is_dir($p)) {
                $this->uploadsDir = rtrim($p, '/') . '/';
                break;
            }
        }
        
        // Fallback als de map echt niet gevonden wordt
        if (!$this->uploadsDir) {
            $fallback = __DIR__ . '/../../storage/uploads/';
            @mkdir($fallback, 0755, true);
            $this->uploadsDir = $fallback;
        }
    }

    public function saveEditedImage($userId, $originalId, $folderId, $tmpPath, $newName, $size) {
        $hash = hash_file('sha256', $tmpPath);
        
        $storageName = hash('sha256', uniqid('edit_', true) . time() . $userId) . '.bin';
        $finalPath = $this->uploadsDir . $storageName;

        if (!move_uploaded_file($tmpPath, $finalPath)) {
            throw new Exception("Kon de bewerkte afbeelding niet fysiek opslaan op de server in map: " . $this->uploadsDir);
        }

        $stmtOld = $this->db->prepare("SELECT storage_name FROM files WHERE id = ? AND user_id = ?");
        $stmtOld->execute([$originalId, $userId]);
        $oldFile = $stmtOld->fetch(PDO::FETCH_ASSOC);

        $stmtUpdate = $this->db->prepare("
            UPDATE files 
            SET storage_name = ?, size = ?, file_hash = ?, updated_at = NOW() 
            WHERE id = ? AND user_id = ?
        ");
        $stmtUpdate->execute([$storageName, $size, $hash, $originalId, $userId]);

        if ($oldFile && file_exists($this->uploadsDir . $oldFile['storage_name'])) {
            @unlink($this->uploadsDir . $oldFile['storage_name']);
        }

        return $originalId;
    }

    public function convertFile($userId, $fileId, $targetFormat, $quality, $folderId) {
        $stmt = $this->db->prepare("SELECT * FROM files WHERE id = ? AND user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$fileId, $userId]);
        $originalFile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$originalFile) {
            throw new Exception("Origineel bestand niet gevonden in database.");
        }

        $sourcePath = $this->uploadsDir . $originalFile['storage_name'];
        if (!file_exists($sourcePath)) {
            throw new Exception("Bronbestand mist fysiek op de server. Gezocht op locatie: " . $sourcePath);
        }

        $targetFormat = strtolower($targetFormat);
        $newStorageName = hash('sha256', uniqid('conv_', true) . time() . $userId) . '.bin';
        $targetPath = $this->uploadsDir . $newStorageName;
        
        $newOriginalName = pathinfo($originalFile['original_name'], PATHINFO_FILENAME) . '.' . $targetFormat;

        $imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
        if (in_array($targetFormat, $imageFormats)) {
            if (!extension_loaded('imagick')) {
                throw new Exception("De 'Imagick' module is niet geïnstalleerd op de server. Conversie mislukt.");
            }

            try {
                $im = new Imagick($sourcePath);
                $im->setImageFormat($targetFormat === 'jpg' ? 'jpeg' : $targetFormat);
                
                if ($targetFormat !== 'png') {
                    $im->setImageCompressionQuality($quality);
                }
                
                $im->writeImage($targetPath);
                $im->clear();
                $im->destroy();
            } catch (Exception $e) {
                throw new Exception("Afbeelding conversie mislukt: " . $e->getMessage());
            }
        } 
        else if (in_array($targetFormat, ['mp4', 'webm', 'mp3'])) {
            $ffmpegCheck = @shell_exec('ffmpeg -version');
            if (!$ffmpegCheck) {
                throw new Exception("FFmpeg is niet geïnstalleerd op deze server. Video/Audio conversie is uitgeschakeld.");
            }

            $cmd = "";
            if ($targetFormat === 'mp4') {
                $cmd = "ffmpeg -i " . escapeshellarg($sourcePath) . " -vcodec libx264 -crf " . (51 - ($quality / 2)) . " -acodec aac -strict experimental " . escapeshellarg($targetPath) . " 2>&1";
            } elseif ($targetFormat === 'mp3') {
                $cmd = "ffmpeg -i " . escapeshellarg($sourcePath) . " -vn -ar 44100 -ac 2 -b:a 192k " . escapeshellarg($targetPath) . " 2>&1";
            } else {
                $cmd = "ffmpeg -i " . escapeshellarg($sourcePath) . " " . escapeshellarg($targetPath) . " 2>&1";
            }

            @shell_exec($cmd);

            if (!file_exists($targetPath) || filesize($targetPath) === 0) {
                if (file_exists($targetPath)) @unlink($targetPath);
                throw new Exception("Video conversie mislukt. Bestand is mogelijk corrupt of het formaat wordt niet ondersteund.");
            }
        } else {
            throw new Exception("Ondersteuning voor dit formaat ontbreekt.");
        }

        $newSize = filesize($targetPath);
        $newHash = hash_file('sha256', $targetPath);
        $mimeType = MimeTypes::getMimeType($targetFormat);
        $category = MimeTypes::getType($targetFormat);

        $stmtIns = $this->db->prepare("
            INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mimeType, size, file_hash, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmtIns->execute([
            $userId, 
            $folderId, 
            $newStorageName, 
            $newOriginalName, 
            $targetFormat, 
            $mimeType, 
            $newSize, 
            $newHash, 
            $category
        ]);

        return $this->db->lastInsertId();
    }

    // =========================================================================
    // --- FASE 4: SLIDESHOW EXPORT (FFMPEG BACKGROUND RENDER) ---
    // =========================================================================

    public function startSlideshowExport($slideshowId, $userId) {
        $ffmpegCheck = @shell_exec('ffmpeg -version');
        if (!$ffmpegCheck) {
            throw new Exception("FFmpeg is niet geïnstalleerd op de server. Server-side MP4 render is onmogelijk.");
        }

        // 1. Haal de items op
        $stmt = $this->db->prepare("
            SELECT si.duration, f.storage_name, f.mime_type 
            FROM slideshow_items si 
            LEFT JOIN files f ON si.file_id = f.id 
            WHERE si.slideshow_id = ? AND si.is_active = 1 
            ORDER BY si.sort_order ASC
        ");
        $stmt->execute([$slideshowId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($items)) {
            throw new Exception("Slideshow is leeg of heeft geen actieve dia's.");
        }

        // 2. Maak een tijdelijke werkmap
        $workDir = sys_get_temp_dir() . '/slideshow_export_' . $slideshowId . '_' . time() . '/';
        @mkdir($workDir, 0755, true);

        // 3. Bouw de FFmpeg 'concat' demuxer file
        $listFile = $workDir . 'files.txt';
        $listContent = "";

        foreach ($items as $item) {
            $filePath = $this->uploadsDir . $item['storage_name'];
            if (!file_exists($filePath)) continue; // Sla corrupte bestanden over

            // Escapen voor de tekstfile
            $safePath = str_replace("'", "'\\''", $filePath);
            $duration = (intval($item['duration']) > 0) ? intval($item['duration']) : 5; // Fallback 5 seconden

            $listContent .= "file '" . $safePath . "'\n";
            $listContent .= "duration " . $duration . "\n";
            
            // FFmpeg concat demuxer vereist dat het laatste bestand herhaald wordt zonder duur
            $lastFile = "file '" . $safePath . "'\n"; 
        }
        $listContent .= $lastFile;

        file_put_contents($listFile, $listContent);

        // 4. Output path voor de nieuwe video
        $outputStorageName = hash('sha256', uniqid('ss_export_', true) . time() . $userId) . '.mp4';
        $outputPath = $this->uploadsDir . $outputStorageName;

        // 5. Het FFmpeg commando (Draait in de achtergrond)
        // Let op: Dit gebruikt een basis demuxer. Complexe overgangen vereisen een heavy filtergraph.
        // > /dev/null 2>&1 & zorgt ervoor dat het proces op de achtergrond afsplitst.
        $cmd = "ffmpeg -f concat -safe 0 -i " . escapeshellarg($listFile) . " -vsync vfr -pix_fmt yuv420p " . escapeshellarg($outputPath) . " > /dev/null 2>&1 &";
        
        @shell_exec($cmd);

        // 6. Registreer alvast een database entry (gemarkeerd als processing, te vangen in een latere cronjob of file-check)
        // Voor nu slaan we in de logboeken op dat hij is gestart.
        $logStmt = $this->db->prepare("INSERT INTO slideshow_logs (slideshow_id, user_id, action, timestamp) VALUES (?, ?, ?, NOW())");
        $logStmt->execute([$slideshowId, $userId, "Server-side MP4 Export gestart op de achtergrond."]);

        return true;
    }
}
?>