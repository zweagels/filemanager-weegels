<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Share/Slideshow | FILE: app/Controllers/PublicController.php */

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../Core/Response.php';
require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/MimeTypes.php';
require_once __DIR__ . '/../Services/ShareService.php';
require_once __DIR__ . '/../Services/FileService.php';
require_once __DIR__ . '/../Services/SlideshowService.php'; // TOEGEVOEGD: Slideshow Service

class PublicController {
    private $shareService;
    private $fileService;
    private $slideshowService; // TOEGEVOEGD

    public function __construct() {
        try {
            $this->shareService = new ShareService();
            $this->fileService = new FileService();
            $this->slideshowService = new SlideshowService(); // TOEGEVOEGD
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => 'Systeemfout bij laden van services.']);
            exit;
        }
    }

    private function getShare($token) {
        $shareData = $this->shareService->getShareByToken($token);
        if (!$shareData['valid']) {
            return null; // AANGEPAST: Geen exit; meer, maar null teruggeven voor slideshow fallback
        }
        return $shareData['share'];
    }

    private function checkAuth($share) {
        if (empty($share['password_hash'])) return true;
        if (session_status() === PHP_SESSION_NONE) session_start();
        return isset($_SESSION['share_auth_' . $share['token']]) && $_SESSION['share_auth_' . $share['token']] === true;
    }

    // FASE 11 FIX: Beveiligde controle of een opgevraagde (sub)map daadwerkelijk binnen de gedeelde map valt
    private function isDescendant($childId, $rootId) {
        $db = Database::getConnection();
        $current = $childId;
        $limit = 20; // Voorkom oneindige loops in de database
        while ($current != null && $limit > 0) {
            if ($current == $rootId) return true;
            $stmt = $db->prepare("SELECT parent_id FROM folders WHERE id = ?");
            $stmt->execute([$current]);
            $res = $stmt->fetchColumn();
            $current = $res ? $res : null;
            $limit--;
        }
        return false;
    }

    public function info() {
        try {
            $token = $_GET['token'] ?? '';
            $checkOnly = isset($_GET['check_only']) && $_GET['check_only'] === 'true';

            // --- TOEGEVOEGD: SLIDESHOW CHECK ---
            $db = Database::getConnection();
            $stmtSS = $db->prepare("SELECT id, updated_at, status FROM slideshows WHERE uuid = ?");
            $stmtSS->execute([$token]);
            $slideshow = $stmtSS->fetch(PDO::FETCH_ASSOC);

            if ($slideshow) {
                if ($slideshow['status'] !== 'active' && $slideshow['status'] !== 'draft') {
                    Response::json(['status' => 'error', 'message' => 'Deze presentatie is niet langer actief.']);
                    return;
                }
                if ($checkOnly) {
                    Response::json(['status' => 'success', 'updated_at' => $slideshow['updated_at']]);
                    return;
                }
                $data = $this->slideshowService->getEditorData($slideshow['id'], 0);
                $this->slideshowService->trackView($slideshow['id'], 0);
                Response::json(['status' => 'success', 'data' => $data]);
                return;
            }
            // -----------------------------------

            // --- ORIGINELE CODE ONGEWIJZIGD ---
            $share = $this->getShare($token);
            if (!$share) { // TOEGEVOEGD: Foutafhandeling omdat getShare nu null kan teruggeven
                Response::json(['status' => 'error', 'message' => 'Deze link bestaat niet of is verwijderd.']);
                exit;
            }
            
            if (!$this->checkAuth($share)) {
                Response::json([
                    'status' => 'locked', 
                    'message' => 'Deze link is beveiligd met een wachtwoord.',
                    'target_type' => $share['target_type']
                ]);
                return;
            }

            $ownerName = 'Onbekend';
            $stmtOwner = $db->prepare("SELECT first_name, last_name, username FROM users WHERE id = ?");
            $stmtOwner->execute([$share['user_id']]);
            $owner = $stmtOwner->fetch(PDO::FETCH_ASSOC);
            if ($owner) {
                $ownerName = trim($owner['first_name'] . ' ' . $owner['last_name']);
                if (empty($ownerName)) $ownerName = $owner['username'];
            }

            // FIX: Als het een album is, vertellen we de PublicView.js dat het een map is
            // Hierdoor snapt de frontend het direct en tekent hij het overzicht zonder fouten.
            $frontendType = $share['target_type'];
            if ($frontendType === 'album') {
                $frontendType = 'folder'; 
            }

            $data = [
                'type' => $frontendType,
                'original_type' => $share['target_type'],
                'name' => $share['share_name'],
                'is_preview_only' => (bool)$share['is_preview_only'],
                'watermark' => $share['watermark_text'],
                'theme' => $share['theme'] ?? 'dark',
                'owner' => $ownerName,
                'expires_at' => $share['expires_at'] 
            ];

            if ($share['target_type'] === 'file') {
                $stmt = $db->prepare("SELECT original_name, extension, size, mime_type FROM files WHERE id = ? AND deleted_at IS NULL");
                $stmt->execute([$share['target_id']]);
                $file = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($file) {
                    $data['file'] = $file;
                    $data['file']['formatted_size'] = $this->fileService->formatSize($file['size']);
                    $data['file']['icon'] = MimeTypes::getIcon($file['extension']);
                    if (empty($data['name'])) $data['name'] = $file['original_name'];
                } else {
                    Response::json(['status' => 'error', 'message' => 'Dit bestand is verwijderd door de eigenaar.']); return;
                }
            } else if ($share['target_type'] === 'folder' || $share['target_type'] === 'request') {
                $stmt = $db->prepare("SELECT name FROM folders WHERE id = ? AND deleted_at IS NULL");
                $stmt->execute([$share['target_id']]);
                $folder = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($folder) {
                    if (empty($data['name'])) $data['name'] = $folder['name'];
                } else {
                    Response::json(['status' => 'error', 'message' => 'Deze map is verwijderd door de eigenaar.']); return;
                }
            } else if ($share['target_type'] === 'album') {
                $stmt = $db->prepare("SELECT name FROM albums WHERE id = ?");
                $stmt->execute([$share['target_id']]);
                $album = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($album) {
                    if (empty($data['name'])) $data['name'] = $album['name'];
                } else {
                    Response::json(['status' => 'error', 'message' => 'Dit album is verwijderd door de eigenaar.']); return;
                }
            }

            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $this->shareService->logView($share['id'], $ip, $ua);

            Response::json(['status' => 'success', 'share' => $data]);
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function authenticate() {
        try {
            $token = $_POST['token'] ?? '';
            $password = $_POST['password'] ?? '';

            if (empty($token) || empty($password)) {
                Response::json(['status' => 'error', 'message' => 'Vul een wachtwoord in.']);
                return;
            }

            $share = $this->getShare($token);
            if (!$share) { Response::json(['status' => 'error', 'message' => 'Link niet gevonden.']); return; } // TOEGEVOEGD

            if (password_verify($password, $share['password_hash'])) {
                if (session_status() === PHP_SESSION_NONE) session_start();
                $_SESSION['share_auth_' . $token] = true;
                Response::json(['status' => 'success', 'message' => 'Toegang verleend.']);
            } else {
                Response::json(['status' => 'error', 'message' => 'Onjuist wachtwoord.']);
            }
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => 'Fout: ' . $e->getMessage()]);
        }
    }

    public function folder() {
        try {
            $token = $_GET['token'] ?? '';
            $dirId = isset($_GET['dir']) ? (int)$_GET['dir'] : null;
            $share = $this->getShare($token);
            
            if (!$share) { Response::json(['status' => 'error', 'message' => 'Link niet gevonden.']); return; } // TOEGEVOEGD
            if (!$this->checkAuth($share)) { Response::json(['status' => 'error', 'message' => 'Geen toegang.']); return; }
            
            // FIX: Accepteer ook albums, omdat de frontend denkt dat dit mappen zijn
            if ($share['target_type'] !== 'folder' && $share['target_type'] !== 'album') { 
                Response::json(['status' => 'error', 'message' => 'Dit is geen map of album.']); return; 
            }

            $db = Database::getConnection();
            $rootId = $share['target_id'];

            // --- LOGICA VOOR ALBUMS ---
            if ($share['target_type'] === 'album') {
                $stmt = $db->prepare("
                    SELECT f.id, f.original_name as name, f.extension, f.size, f.created_at 
                    FROM files f 
                    INNER JOIN album_files af ON f.id = af.file_id 
                    WHERE af.album_id = ? AND f.deleted_at IS NULL 
                    ORDER BY f.original_name ASC
                ");
                $stmt->execute([$rootId]);
                $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach($files as &$f) { 
                    $f['formatted_size'] = $this->fileService->formatSize($f['size']); 
                    $f['icon'] = MimeTypes::getIcon($f['extension']); 
                }
                
                $breadcrumbs = [['id' => $rootId, 'name' => !empty($share['share_name']) ? $share['share_name'] : 'Gedeeld Album']];
                
                Response::json(['status' => 'success', 'folders' => [], 'files' => $files, 'breadcrumbs' => $breadcrumbs]);
                return;
            }

            // --- LOGICA VOOR MAPPEN ---
            $currentFolderId = $dirId ? $dirId : $rootId;

            // Beveiligingscheck: Ligt de opgevraagde map wel in de boomstructuur van de gedeelde map?
            if ($currentFolderId !== $rootId && !$this->isDescendant($currentFolderId, $rootId)) {
                Response::json(['status' => 'error', 'message' => 'Geen toegang tot deze (sub)map.']); 
                return;
            }

            // Ophalen Submappen
            $stmt = $db->prepare("SELECT id, name, created_at FROM folders WHERE parent_id = ? AND deleted_at IS NULL ORDER BY name ASC");
            $stmt->execute([$currentFolderId]);
            $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Ophalen Bestanden
            $stmt = $db->prepare("SELECT id, original_name as name, extension, size, created_at FROM files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY original_name ASC");
            $stmt->execute([$currentFolderId]);
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach($files as &$f) { 
                $f['formatted_size'] = $this->fileService->formatSize($f['size']); 
                $f['icon'] = MimeTypes::getIcon($f['extension']); 
            }

            // Broodkruimels (Breadcrumbs) genereren voor navigatie
            $breadcrumbs = [];
            $curr = $currentFolderId;
            while ($curr != null) {
                $stmt = $db->prepare("SELECT id, name, parent_id FROM folders WHERE id = ?");
                $stmt->execute([$curr]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    array_unshift($breadcrumbs, ['id' => $row['id'], 'name' => $row['name']]);
                    if ($curr == $rootId) break; 
                    $curr = $row['parent_id'];
                } else {
                    break;
                }
            }

            // Overschrijf de naam van de rootmap met de "Gedeelde Naam" (indien aanwezig)
            if (!empty($breadcrumbs) && $breadcrumbs[0]['id'] == $rootId && !empty($share['share_name'])) {
                $breadcrumbs[0]['name'] = $share['share_name'];
            }

            Response::json(['status' => 'success', 'folders' => $folders, 'files' => $files, 'breadcrumbs' => $breadcrumbs]);
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function download() {
        try {
            $token = $_GET['token'] ?? '';
            $fileId = $_GET['id'] ?? 0;
            $dirId = isset($_GET['dir']) ? (int)$_GET['dir'] : null;
            
            $shareData = $this->shareService->getShareByToken($token);
            if (!$shareData['valid']) die($shareData['error']);
            $share = $shareData['share'];

            if (!$this->checkAuth($share)) die("Geen toegang: Wachtwoord vereist.");

            $db = Database::getConnection();

            if (($share['target_type'] === 'folder' || $share['target_type'] === 'album') && isset($_GET['zip']) && $_GET['zip'] == '1') {
                if ($share['is_preview_only']) die("De eigenaar heeft downloaden uitgeschakeld.");
                
                $rootId = $share['target_id'];
                $currentFolderId = $dirId ? $dirId : $rootId;

                if ($share['target_type'] === 'folder' && $currentFolderId !== $rootId && !$this->isDescendant($currentFolderId, $rootId)) {
                    die("Geen toegang tot deze (sub)map.");
                }

                $specificFiles = isset($_GET['files']) ? explode(',', $_GET['files']) : [];
                $files = [];

                if ($share['target_type'] === 'album') {
                    if (!empty($specificFiles)) {
                        $placeholders = implode(',', array_fill(0, count($specificFiles), '?'));
                        $sql = "SELECT f.storage_name, f.original_name FROM files f INNER JOIN album_files af ON f.id = af.file_id WHERE af.album_id = ? AND f.id IN ($placeholders) AND f.deleted_at IS NULL";
                        $params = array_merge([$rootId], $specificFiles);
                        $stmt = $db->prepare($sql);
                        $stmt->execute($params);
                        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    } else {
                        $stmt = $db->prepare("SELECT f.storage_name, f.original_name FROM files f INNER JOIN album_files af ON f.id = af.file_id WHERE af.album_id = ? AND f.deleted_at IS NULL");
                        $stmt->execute([$rootId]);
                        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                } else {
                    if (!empty($specificFiles)) {
                        $placeholders = implode(',', array_fill(0, count($specificFiles), '?'));
                        $sql = "SELECT storage_name, original_name FROM files WHERE folder_id = ? AND id IN ($placeholders) AND deleted_at IS NULL";
                        $params = array_merge([$currentFolderId], $specificFiles);
                        $stmt = $db->prepare($sql);
                        $stmt->execute($params);
                        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    } else {
                        $stmt = $db->prepare("SELECT storage_name, original_name FROM files WHERE folder_id = ? AND deleted_at IS NULL");
                        $stmt->execute([$currentFolderId]);
                        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                }

                if (empty($files)) die("Geen bestanden gevonden om in te pakken.");

                $zipPath = tempnam(sys_get_temp_dir(), 'zip');
                $zip = new ZipArchive();
                if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                    die("Kan ZIP bestand niet aanmaken op de server.");
                }

                foreach ($files as $f) {
                    $p = STORAGE_PATH . '/uploads/' . $f['storage_name'];
                    if (file_exists($p)) {
                        $zip->addFile($p, $f['original_name']);
                    }
                }
                $zip->close();

                $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
                $this->shareService->logDownload($share['id'], $ip, $ua);

                if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
                if (ob_get_length()) ob_end_clean();

                $zipName = empty($specificFiles) ? basename($share['share_name'] ?: 'Gedeelde_Map') . '.zip' : 'Selectie_' . date('Ymd_His') . '.zip';

                header('Content-Type: application/zip');
                header('Content-Disposition: attachment; filename="' . $zipName . '"');
                header('Content-Length: ' . filesize($zipPath));
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                readfile($zipPath);
                @unlink($zipPath);
                exit;
            }
            
            // Losse file download
            if ($share['target_type'] === 'file') {
                $fileId = $share['target_id'];
            } else if ($share['target_type'] === 'folder') {
                $stmt = $db->prepare("SELECT folder_id FROM files WHERE id = ? AND deleted_at IS NULL");
                $stmt->execute([$fileId]);
                $fCheck = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$fCheck) die("Bestand niet gevonden.");
                
                // Beveiligingscheck
                if ($fCheck['folder_id'] !== $share['target_id'] && !$this->isDescendant($fCheck['folder_id'], $share['target_id'])) {
                    die("Bestand bevindt zich buiten de gedeelde machtigingen.");
                }
            } else if ($share['target_type'] === 'album') {
                $stmt = $db->prepare("SELECT 1 FROM album_files WHERE album_id = ? AND file_id = ?");
                $stmt->execute([$share['target_id'], $fileId]);
                if (!$stmt->fetch()) die("Bestand bevindt zich buiten het gedeelde album.");
            } else {
                die("Ongeldige actie voor dit type link.");
            }

            if ($share['is_preview_only'] && (!isset($_GET['preview']) || $_GET['preview'] !== '1')) {
                die("De eigenaar heeft downloaden uitgeschakeld. Je mag dit bestand alleen bekijken.");
            }

            $stmt = $db->prepare("SELECT storage_name, original_name, mime_type FROM files WHERE id = ?");
            $stmt->execute([$fileId]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$file) die("Bestand is niet meer beschikbaar.");

            $path = STORAGE_PATH . '/uploads/' . $file['storage_name'];
            if (!file_exists($path)) die("Fysiek bestand ontbreekt op de server.");

            if (!isset($_GET['preview']) || $_GET['preview'] !== '1') {
                $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
                $this->shareService->logFileDownload($share['id'], $fileId, $ip, $ua);
            }

            $disposition = (isset($_GET['preview']) && $_GET['preview'] == '1') ? 'inline' : 'attachment';

            if (!empty($share['watermark_text']) && in_array($file['mime_type'], ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
                $image = @imagecreatefromstring(file_get_contents($path));
                if ($image) {
                    $width = imagesx($image);
                    $height = imagesy($image);
                    $text = $share['watermark_text'];
                    
                    $font = 5;
                    $charWidth = imagefontwidth($font);
                    $charHeight = imagefontheight($font);
                    $textWidth = strlen($text) * $charWidth;
                    
                    $scale = ($width * 0.7) / $textWidth;
                    if ($scale < 1) $scale = 1; 
                    
                    $newTextWidth = (int)($textWidth * $scale);
                    $newTextHeight = (int)($charHeight * $scale);
                    
                    $tmp = imagecreatetruecolor($textWidth, $charHeight);
                    imagealphablending($tmp, false);
                    imagesavealpha($tmp, true);
                    $transparent = imagecolorallocatealpha($tmp, 0, 0, 0, 127);
                    imagefill($tmp, 0, 0, $transparent);
                    
                    $white = imagecolorallocatealpha($tmp, 255, 255, 255, 50); 
                    $black = imagecolorallocatealpha($tmp, 0, 0, 0, 80); 
                    
                    imagestring($tmp, $font, 1, 1, $text, $black);
                    imagestring($tmp, $font, 0, 0, $text, $white);
                    
                    $dst_x = ($width - $newTextWidth) / 2;
                    $dst_y = ($height - $newTextHeight) / 2;
                    
                    imagecopyresampled($image, $tmp, $dst_x, $dst_y, 0, 0, $newTextWidth, $newTextHeight, $textWidth, $charHeight);
                    imagedestroy($tmp);

                    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
                    if (ob_get_length()) ob_end_clean();

                    header('Content-Type: ' . $file['mime_type']);
                    header('Content-Disposition: ' . $disposition . '; filename="watermarked_' . basename($file['original_name']) . '"');
                    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                    
                    if ($file['mime_type'] === 'image/jpeg') imagejpeg($image, null, 90);
                    elseif ($file['mime_type'] === 'image/png') imagepng($image);
                    elseif ($file['mime_type'] === 'image/gif') imagegif($image);
                    elseif ($file['mime_type'] === 'image/webp') imagewebp($image, null, 90);
                    
                    imagedestroy($image);
                    exit;
                }
            }

            if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
            if (ob_get_length()) ob_end_clean();

            header('Content-Type: ' . $file['mime_type']);
            header('Content-Disposition: ' . $disposition . '; filename="' . basename($file['original_name']) . '"');
            
            // Byte-Range Streaming voor Media
            $size = filesize($path);
            $length = $size;
            $start = 0;
            $end = $size - 1;

            header('Accept-Ranges: bytes');
            
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
        } catch (Throwable $e) {
            die("Systeemfout: " . $e->getMessage());
        }
    }

    public function uploadRequest() {
        try {
            $token = $_POST['token'] ?? '';
            $share = $this->getShare($token);
            
            if (!$share) { Response::json(['status'=>'error', 'message'=>'Link ongeldig.']); return; } // TOEGEVOEGD
            if (!$this->checkAuth($share)) { Response::json(['status'=>'error', 'message'=>'Wachtwoord vereist.']); return; }
            if ($share['target_type'] !== 'request') { Response::json(['status'=>'error', 'message'=>'Deze link staat geen uploads toe.']); return; }

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                Response::json(['status'=>'error', 'message'=>'Geen geldig bestand ontvangen.']); return;
            }

            $folderId = $share['target_id'];
            $userId = $share['user_id']; 

            $tmpPath = $_FILES['file']['tmp_name'];
            $originalName = $_FILES['file']['name'];
            $size = filesize($tmpPath);
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $hash = bin2hex(random_bytes(32));
            $storageName = $hash . '.bin';

            $uploadDir = STORAGE_PATH . '/uploads/';
            if (!file_exists($uploadDir)) @mkdir($uploadDir, 0755, true);

            $dest = $uploadDir . $storageName;
            if (!move_uploaded_file($tmpPath, $dest)) {
                Response::json(['status'=>'error', 'message'=>'Server kon het bestand niet fysiek opslaan.']); return;
            }

            $db = Database::getConnection();
            $mime = MimeTypes::getMimeType($ext);
            
            $guestName = "Gast_" . date('His') . "_" . $originalName;

            $stmt = $db->prepare("INSERT INTO files (user_id, folder_id, storage_name, original_name, extension, mime_type, size, file_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$userId, $folderId, $storageName, $guestName, $ext, $mime, $size, $hash]);

            Response::json(['status'=>'success', 'message'=>'Bestand succesvol veilig afgeleverd!']);
        } catch (Throwable $e) {
            Response::json(['status'=>'error', 'message'=>'Upload fout: ' . $e->getMessage()]);
        }
    }
}
?>