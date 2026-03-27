<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: app/Controllers/FileController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Config/Constants.php';
require_once __DIR__ . '/../Services/FileService.php';
require_once __DIR__ . '/../Services/TagService.php';
require_once __DIR__ . '/../Services/AlbumService.php';
require_once __DIR__ . '/../Services/ConvertService.php';

class FileController {

    private $fileService;
    private $tagService;
    private $albumService;
    private $convertService;

    public function __construct() {
        if (!Auth::check()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Niet ingelogd']);
            exit;
        }

        $this->fileService = new FileService();
        $this->tagService = new TagService();
        $this->albumService = new AlbumService();
        $this->convertService = new ConvertService();
    }

    private function getInput() {
        $json = json_decode(file_get_contents('php://input'), true);
        return is_array($json) ? $json : $_POST;
    }

    public function index() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $postAction = $_POST['action'] ?? '';
            
            $input = $this->getInput();
            if (!$postAction && isset($input['action'])) {
                $postAction = $input['action'];
            }

            if ($postAction === 'convert') {
                $this->convertFile();
            } elseif ($postAction === 'save_edit') {
                $this->saveEdit();
            } elseif ($postAction === 'save_preferences') {
                $this->savePreferences();
            } elseif ($postAction === 'save_thumb') {
                $this->saveThumb();
            } elseif ($postAction === 'verify_pincode') {
                $this->verifyAlbumPincode($input);
            }
        }

        if (isset($_GET['action']) && $_GET['action'] === 'download') {
            $this->downloadFile();
        }
        
        if (isset($_GET['action']) && $_GET['action'] === 'zip') {
            $this->downloadZip();
        }

        if (isset($_GET['action']) && $_GET['action'] === 'preferences') {
            $this->getPreferences();
        }

        if (isset($_GET['action']) && $_GET['action'] === 'thumb') {
            try {
                $id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0;
                $userId = Auth::id();
                
                if (session_status() === PHP_SESSION_ACTIVE) {
                    session_write_close();
                }
                
                if (ob_get_length()) ob_clean(); 
                
                $this->fileService->serveThumbnail($id, $userId);
            } catch (Throwable $e) {
                $this->fileService->serveErrorSvg("Crash: " . $e->getMessage());
            }
            exit;
        }

        header('Content-Type: application/json');

        try {
            $userId = Auth::id();
            $action = $_GET['action'] ?? '';

            if ($action === 'recent') {
                $data = $this->fileService->getRecentFiles($userId);
            } elseif ($action === 'recent_rich') {
                $data = $this->fileService->getRecentDashboardData($userId);
            } elseif ($action === 'album_ping') {
                $data = $this->pingAlbum();
            } elseif ($action === 'favorites') {
                $data = $this->fileService->getFavoriteItems($userId);
            } elseif ($action === 'tag' && !empty($_GET['name'])) {
                $data = $this->fileService->getItemsByTag($_GET['name'], $userId);
            } elseif ($action === 'shared_with_me') {
                $data = $this->fileService->getSharedWithMe($userId);
            } elseif ($action === 'search' && isset($_GET['q'])) {
                $searchResults = $this->fileService->searchItems($_GET['q'], $userId);
                
                $folders = [];
                $files = [];
                
                foreach ($searchResults as $item) {
                    if ($item['type'] === 'file') {
                        $files[] = $item;
                    } else {
                        $folders[] = $item;
                    }
                }
                
                $data = [
                    'breadcrumbs' => [['id' => 'search', 'name' => 'Zoekresultaten voor: "' . htmlspecialchars($_GET['q']) . '"']],
                    'folders' => $folders,
                    'files' => $files,
                    'current_role' => 'owner'
                ];
            } else {
                $folderId = isset($_GET['folder']) && is_numeric($_GET['folder']) ? (int)$_GET['folder'] : null;
                $data = $this->fileService->getContents($folderId, $userId);
            }

            echo json_encode([
                'status' => 'success',
                'data' => $data
            ]);

        } catch (Exception $e) {
            // FASE 4 FIX: Geen HTTP-Code errors meer (JavaScript kan dit nu netjes tonen als notificatie)
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function pingAlbum() {
        $albumId = isset($_GET['album_id']) ? (int)$_GET['album_id'] : 0;
        $userId = Auth::id();

        if ($albumId <= 0) return [];

        $db = Database::getConnection();

        try { 
            $db->query("SELECT current_album_id, last_ping FROM users LIMIT 1"); 
        } catch (Exception $e) { 
            @$db->query("ALTER TABLE users ADD COLUMN current_album_id INT NULL, ADD COLUMN last_ping DATETIME NULL"); 
        }

        $stmtUpdate = $db->prepare("UPDATE users SET current_album_id = ?, last_ping = NOW() WHERE id = ?");
        $stmtUpdate->execute([$albumId, $userId]);

        $stmtUsers = $db->prepare("
            SELECT id, first_name, last_name, avatar_file_id 
            FROM users 
            WHERE current_album_id = ? AND last_ping >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
        ");
        $stmtUsers->execute([$albumId]);
        
        return $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPreferences() {
        header('Content-Type: application/json');
        try {
            $userId = Auth::id();
            
            $prefs = $this->fileService->getUserSettings($userId);

            $daysToKeep = isset($prefs['auto_clear_trash_days']) ? (int)$prefs['auto_clear_trash_days'] : 30;
            if ($daysToKeep > 0) {
                $this->fileService->autoClearTrash($userId, $daysToKeep);
            }

            echo json_encode(['status' => 'success', 'data' => $prefs]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => 'Fout bij ophalen voorkeuren: ' . $e->getMessage()]);
        }
        exit;
    }

    public function savePreferences() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $prefs = $input['preferences'] ?? [];

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen of ongeldig veiligheidstoken. Ververs de pagina.']);
            exit;
        }

        if (empty($prefs) || !is_array($prefs)) {
            echo json_encode(['status' => 'error', 'message' => 'Geen geldige instellingen ontvangen.']);
            exit;
        }

        try {
            $userId = Auth::id();
            $this->fileService->saveUserSettings($userId, $prefs);
            echo json_encode(['status' => 'success', 'message' => 'Instellingen succesvol en veilig opgeslagen.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => 'Database Fout: ' . $e->getMessage()]);
        }
        exit;
    }

    private function saveThumb() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;
        $base64 = $input['base64'] ?? '';

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        if ($fileId <= 0 || empty($base64)) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->fileService->saveVideoThumbnail($fileId, $base64, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Video thumbnail opgeslagen!']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createFolder() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $name = $input['name'] ?? '';
        $parentId = isset($input['parent_id']) && is_numeric($input['parent_id']) ? (int)$input['parent_id'] : null;

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen, ververs de pagina.']);
            exit;
        }

        try {
            $userId = Auth::id();
            $newId = $this->fileService->createFolder($name, $parentId, $userId);
            echo json_encode(['status' => 'success', 'message' => 'Map aangemaakt', 'id' => $newId]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function rename() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? ''; 
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $newName = $input['name'] ?? '';

        if (!Csrf::validate($token) || !in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen of ongeldige actie.']);
            exit;
        }

        try {
            $this->fileService->renameItem($type, $id, $newName, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Naam gewijzigd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function folderSize() {
        header('Content-Type: application/json');
        try {
            $folderId = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;
            $sizeBytes = $this->fileService->calculateFolderSize($folderId, Auth::id());
            echo json_encode(['status' => 'success', 'size_bytes' => $sizeBytes, 'formatted' => $this->fileService->formatSize($sizeBytes)]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function quota() {
        header('Content-Type: application/json');
        try {
            echo json_encode(['status' => 'success', 'data' => $this->fileService->getStorageQuota(Auth::id())]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createText() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $name = $input['name'] ?? '';
        $folderId = isset($input['folder_id']) && is_numeric($input['folder_id']) ? (int)$input['folder_id'] : null;

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $newId = $this->fileService->createTextFile($name, $folderId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Tekstbestand aangemaakt', 'id' => $newId]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function move() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $newFolderId = isset($input['new_folder_id']) && is_numeric($input['new_folder_id']) ? (int)$input['new_folder_id'] : null;

        if (!Csrf::validate($token) || !in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen of ongeldige actie.']);
            exit;
        }

        try {
            $this->fileService->moveItem($type, $id, $newFolderId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Succesvol verplaatst.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function moveBulk() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileIds = $input['file_ids'] ?? [];
        $folderIds = $input['folder_ids'] ?? [];
        $newFolderId = isset($input['new_folder_id']) && is_numeric($input['new_folder_id']) ? (int)$input['new_folder_id'] : null;

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen of ongeldig token.']);
            exit;
        }

        if (empty($fileIds) && empty($folderIds)) {
            echo json_encode(['status' => 'error', 'message' => 'Geen items geselecteerd om te verplaatsen.']);
            exit;
        }

        try {
            $this->fileService->moveBulkItems($fileIds, $folderIds, $newFolderId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Succesvol verplaatst.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function copy() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $newFolderId = isset($input['new_folder_id']) && is_numeric($input['new_folder_id']) ? (int)$input['new_folder_id'] : null;

        if (!Csrf::validate($token) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $newId = $this->fileService->copyFile($id, $newFolderId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Bestand gekopieerd.', 'id' => $newId]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function style() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $color = $input['color'] ?? null;
        $icon = $input['icon'] ?? null;

        if (!Csrf::validate($token) || !in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $this->fileService->updateAppearance($type, $id, $color, $icon, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Weergave bijgewerkt.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleFavorite() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $status = isset($input['is_favorite']) ? (bool)$input['is_favorite'] : false;

        if (!Csrf::validate($token) || !in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $this->fileService->toggleFavorite($type, $id, $status, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Favoriet status bijgewerkt.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function properties() {
        header('Content-Type: application/json');
        $type = $_GET['type'] ?? '';
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $data = $this->fileService->getItemProperties($type, $id, Auth::id());
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function trashList() {
        header('Content-Type: application/json');
        try {
            echo json_encode(['status' => 'success', 'data' => $this->fileService->getTrashContents(Auth::id())]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function delete() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;

        if (!Csrf::validate($token) || !in_array($type, ['file', 'folder']) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $this->fileService->softDelete($type, $id, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Verplaatst naar prullenbak.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function restore() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }
        
        try {
            $this->fileService->restoreItem($type, $id, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Item succesvol hersteld.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function forceDelete() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $type = $input['type'] ?? '';
        $id = isset($input['id']) ? (int)$input['id'] : 0;

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }
        
        try {
            $this->fileService->forceDelete($type, $id, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Item permanent verwijderd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function emptyTrash() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }
        
        try {
            $this->fileService->emptyTrash(Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Prullenbak is volledig geleegd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getTags() {
        header('Content-Type: application/json');
        try {
            echo json_encode(['status' => 'success', 'data' => $this->tagService->getTags(Auth::id())]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $name = $input['name'] ?? '';
        $color = $input['color'] ?? '#3b82f6';
        $icon = $input['icon'] ?? 'none'; 

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $id = $this->tagService->createTag(Auth::id(), $name, $color, $icon);
            echo json_encode(['status' => 'success', 'message' => 'Tag aangemaakt.', 'data' => ['id' => $id, 'name' => $name, 'color' => $color, 'icon' => $icon]]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $tagId = isset($input['id']) ? (int)$input['id'] : 0;
        $name = $input['name'] ?? '';
        $color = $input['color'] ?? '#3b82f6';
        $icon = $input['icon'] ?? 'none'; 

        if (!Csrf::validate($token) || $tagId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige actie.']);
            exit;
        }

        try {
            $this->tagService->updateTag($tagId, Auth::id(), $name, $color, $icon);
            echo json_encode(['status' => 'success', 'message' => 'Tag bijgewerkt.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $tagId = isset($input['id']) ? (int)$input['id'] : 0;

        if (!Csrf::validate($token) || $tagId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige actie.']);
            exit;
        }

        try {
            $this->tagService->deleteTag($tagId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Tag verwijderd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function assignTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;
        $tagId = isset($input['tag_id']) ? (int)$input['tag_id'] : 0;

        if (!Csrf::validate($token) || $fileId <= 0 || $tagId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $perms = $this->fileService->getPermissions('file', $fileId, Auth::id());
            if (!$perms['role'] || $perms['role'] === 'viewer') {
                throw new Exception("Je mag geen tags toewijzen aan dit bestand.");
            }
            
            $this->tagService->assignFileToTag($fileId, $tagId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Tag toegewezen.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function removeTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;
        $tagName = $input['tag_name'] ?? '';

        if (!Csrf::validate($token) || $fileId <= 0 || empty($tagName)) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $perms = $this->fileService->getPermissions('file', $fileId, Auth::id());
            if (!$perms['role'] || $perms['role'] === 'viewer') {
                throw new Exception("Je mag geen tags verwijderen van dit bestand.");
            }
            
            $tags = $this->tagService->getTags(Auth::id());
            $tagId = 0;
            foreach($tags as $t) {
                if ($t['name'] === $tagName) { $tagId = $t['id']; break; }
            }
            
            if ($tagId > 0) {
                $this->tagService->removeFileFromTag($fileId, $tagId, Auth::id());
            }
            echo json_encode(['status' => 'success', 'message' => 'Tag verwijderd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function nestTag() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $childId = isset($input['child_id']) ? (int)$input['child_id'] : 0;
        $parentId = isset($input['parent_id']) ? (int)$input['parent_id'] : 0;

        if (!Csrf::validate($token) || $childId <= 0 || $parentId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->tagService->nestTag($childId, $parentId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Label succesvol genest.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getAlbums() {
        header('Content-Type: application/json');
        try {
            echo json_encode(['status' => 'success', 'data' => $this->albumService->getAlbums(Auth::id())]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createAlbum() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $name = $input['name'] ?? '';
        $color = $input['color'] ?? '#3b82f6';
        $icon = $input['icon'] ?? 'none';

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $id = $this->albumService->createAlbum(Auth::id(), $name, $color, $icon);
            echo json_encode(['status' => 'success', 'message' => 'Album aangemaakt.', 'id' => $id]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateAlbum() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $albumId = isset($input['id']) ? (int)$input['id'] : 0;
        $name = $input['name'] ?? '';
        $color = $input['color'] ?? '#3b82f6';
        $icon = $input['icon'] ?? 'none';

        if (!Csrf::validate($token) || $albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige actie of sessie verlopen.']);
            exit;
        }

        try {
            $this->albumService->updateAlbum($albumId, Auth::id(), $name, $color, $icon);
            echo json_encode(['status' => 'success', 'message' => 'Album succesvol bewerkt.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function assignToAlbum() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;

        if (!Csrf::validate($token) || $fileId <= 0 || $albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->albumService->assignFileToAlbum($fileId, $albumId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Toegevoegd aan album.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function albumContents() {
        header('Content-Type: application/json');
        $albumId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldig album geselecteerd.']);
            exit;
        }
        
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT pincode, user_id FROM albums WHERE id = ?");
            $stmt->execute([$albumId]);
            $albumRow = $stmt->fetch();
            
            if ($albumRow && !empty($albumRow['pincode'])) {
                if ($albumRow['user_id'] != Auth::id() && !isset($_SESSION['album_unlocked_'.$albumId])) {
                    echo json_encode(['status' => 'locked', 'message' => 'Dit album is beveiligd met een pincode.']);
                    exit;
                }
            }

            echo json_encode(['status' => 'success', 'data' => $this->fileService->getAlbumContents($albumId, Auth::id())]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function verifyAlbumPincode($input) {
        header('Content-Type: application/json');
        $token = $input['csrf_token'] ?? '';
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;
        $pincode = $input['pincode'] ?? '';

        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT pincode FROM albums WHERE id = ?");
            $stmt->execute([$albumId]);
            $albumRow = $stmt->fetch();

            if ($albumRow && $albumRow['pincode'] === $pincode) {
                $_SESSION['album_unlocked_'.$albumId] = true;
                echo json_encode(['status' => 'success', 'message' => 'Album ontgrendeld.']);
            } else {
                throw new Exception("Onjuiste pincode.");
            }
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function removeFromAlbum() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;

        if (!Csrf::validate($token) || $fileId <= 0 || $albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->albumService->removeFileFromAlbum($fileId, $albumId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Bestand uit album verwijderd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteAlbum() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;

        if (!Csrf::validate($token) || $albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->albumService->deleteAlbum($albumId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Album is verwijderd.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function setAlbumCover() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : 0;

        if (!Csrf::validate($token) || $albumId <= 0 || $fileId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters.']);
            exit;
        }

        try {
            $this->albumService->setCover($albumId, $fileId, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Cover foto ingesteld!']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function setAlbumPincode() {
        header('Content-Type: application/json');
        $input = $this->getInput();
        $token = $input['csrf_token'] ?? '';
        $albumId = isset($input['album_id']) ? (int)$input['album_id'] : 0;
        $pincode = $input['pincode'] ?? '';

        if (!Csrf::validate($token) || $albumId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldige parameters of sessie.']);
            exit;
        }

        try {
            $this->albumService->setPincode($albumId, $pincode, Auth::id());
            echo json_encode(['status' => 'success', 'message' => 'Pincode is opgeslagen.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function downloadFile() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $userId = Auth::id();

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM files WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$file) {
            http_response_code(404);
            die("Bestand niet gevonden.");
        }

        // FASE F: Quarantaine Check (Blokkeer voor non-admins)
        $isAdmin = (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') || Auth::isAdmin();
        if (!empty($file['is_quarantined']) && $file['is_quarantined'] == 1 && !$isAdmin) {
            http_response_code(403);
            die("Toegang geweigerd: Dit bestand staat momenteel in quarantaine wegens veiligheidsredenen.");
        }

        $perms = $this->fileService->getPermissions('file', $id, $userId);
        if (!$perms['role']) {
            http_response_code(403);
            die("Geen toegang tot dit bestand.");
        }

        $disposition = isset($_GET['download']) && $_GET['download'] == '1' ? true : false;

        // FASE 2 FIX: We forceren `serveFileWithWatermarkCheck` om video's en afbeeldingen NIET via readfile() 
        // door het geheugen te pushen, maar direct via de fysieke map als de frontend dit toestaat.
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        if (ob_get_length()) ob_end_clean();

        // Als de request om 'view=1' vraagt (zoals jouw TV speler fallback), en het is video, gebruik dan directe stream
        if (isset($_GET['view']) && strpos($file['mime_type'], 'video/') === 0) {
            $physicalPath = STORAGE_PATH . '/uploads/' . $file['storage_name'];
            if (file_exists($physicalPath)) {
                $this->fileService->outputFileDirect($physicalPath, $file['original_name'], $file['mime_type'], false);
                exit;
            }
        }

        $this->fileService->serveFileWithWatermarkCheck($id, $userId, $disposition);
        exit;
    }

    private function convertFile() {
        header('Content-Type: application/json');
        try {
            $userId = Auth::id();
            $fileId = isset($_POST['file_id']) ? (int)$_POST['file_id'] : 0;
            $targetFormat = $_POST['target_format'] ?? '';
            $quality = isset($_POST['quality']) ? (int)$_POST['quality'] : 85;
            
            $folderIdRaw = $_POST['folder_id'] ?? '';
            $folderId = (!empty($folderIdRaw) && $folderIdRaw !== 'root' && $folderIdRaw !== '0') ? (int)$folderIdRaw : null;

            if (empty($fileId) || empty($targetFormat)) {
                throw new Exception("Ontbrekende gegevens voor conversie. Selecteer een geldig formaat.");
            }

            $allowedFormats = ['jpg', 'webp', 'png', 'mp4', 'webm', 'mp3'];
            if (!in_array(strtolower($targetFormat), $allowedFormats)) {
                throw new Exception("Doelformaat is niet toegestaan of wordt niet ondersteund.");
            }

            $permsFile = $this->fileService->getPermissions('file', $fileId, $userId);
            if (!$permsFile['role'] || $permsFile['role'] === 'viewer') throw new Exception("Je mag dit bestand niet converteren.");
            
            if ($folderId) {
                $permsFolder = $this->fileService->getPermissions('folder', $folderId, $userId);
                if (!$permsFolder['role'] || $permsFolder['role'] === 'viewer') throw new Exception("Je mag niet naar deze map opslaan.");
            }

            $newId = $this->convertService->convertFile($userId, $fileId, $targetFormat, $quality, $folderId);

            echo json_encode([
                'status' => 'success', 
                'message' => 'Bestand succesvol geconverteerd.', 
                'new_id' => $newId
            ]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function saveEdit() {
        header('Content-Type: application/json');
        try {
            $userId = Auth::id();
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("Geen geldig bestand ontvangen vanaf de editor.");
            }

            $originalId = isset($_POST['original_id']) ? (int)$_POST['original_id'] : 0;
            
            $folderIdRaw = $_POST['folder_id'] ?? '';
            $folderId = (!empty($folderIdRaw) && $folderIdRaw !== 'root' && $folderIdRaw !== '0') ? (int)$folderIdRaw : null;
            
            $tmpPath = $_FILES['file']['tmp_name'];
            $newName = $_FILES['file']['name']; 
            $size = filesize($tmpPath);

            if ($originalId === 0) {
                throw new Exception("Origineel bestands-ID ontbreekt.");
            }

            $permsFile = $this->fileService->getPermissions('file', $originalId, $userId);
            if (!$permsFile['role'] || $permsFile['role'] === 'viewer') throw new Exception("Je mag dit bestand niet overschrijven.");
            
            if ($folderId) {
                $permsFolder = $this->fileService->getPermissions('folder', $folderId, $userId);
                if (!$permsFolder['role'] || $permsFolder['role'] === 'viewer') throw new Exception("Je mag niet naar deze map opslaan.");
            }

            $newId = $this->convertService->saveEditedImage($userId, $originalId, $folderId, $tmpPath, $newName, $size);

            echo json_encode([
                'status' => 'success', 
                'message' => 'Bewerking succesvol opgeslagen.', 
                'new_id' => $newId
            ]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    private function downloadZip() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $idsParam = isset($_GET['ids']) ? $_GET['ids'] : '';
        $type = isset($_GET['type']) ? $_GET['type'] : 'folder';
        $userId = Auth::id();

        if ($id <= 0 && empty($idsParam)) {
            http_response_code(400);
            die("Ongeldige parameters voor ZIP download.");
        }

        try {
            if (!empty($idsParam)) {
                $ids = explode(',', $idsParam);
                $zipData = $this->fileService->createZipForFiles($ids, $userId);
            } else {
                if ($type === 'album') {
                    $zipData = $this->fileService->createZipForAlbum($id, $userId);
                } else {
                    $zipData = $this->fileService->createZipForFolder($id, $userId);
                }
            }

            if (!$zipData || !file_exists($zipData['path'])) {
                http_response_code(500);
                die("Fout bij het genereren van het ZIP bestand.");
            }

            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }
            if (ob_get_length()) ob_end_clean();

            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . basename($zipData['name']) . '"');
            header('Content-Length: ' . filesize($zipData['path']));
            header('Cache-Control: public, max-age=0');
            header('Access-Control-Allow-Origin: *');
            
            readfile($zipData['path']);
            
            @unlink($zipData['path']); 
            exit;
        } catch (Exception $e) {
            http_response_code(403);
            die($e->getMessage());
        }
    }
}
?>