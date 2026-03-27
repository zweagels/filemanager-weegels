<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Share | FILE: app/Controllers/ShareController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Services/ShareService.php';

class ShareController {
    
    private $shareService;

    public function __construct() {
        ob_start();
        if (!Auth::check()) {
            $this->sendJson(['status' => 'error', 'message' => 'Niet geautoriseerd'], 401);
        }
        $this->shareService = new ShareService();
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

    public function index() {
        try {
            $shares = $this->shareService->getUserShares(Auth::id());
            $this->sendJson(['status' => 'success', 'data' => $shares]); 
        } catch (Throwable $e) { 
            // Forceer een 200 response zodat we de exacte foutmelding op je scherm zien i.p.v. een console crash
            $this->sendJson(['status' => 'error', 'message' => 'API Fout: ' . $e->getMessage()], 200); 
        }
    }

    public function create() {
        $input = $this->getInput();
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            $this->sendJson(['status' => 'error', 'message' => 'Ongeldige veiligheidstoken.'], 403);
        }

        try {
            $token = $this->shareService->createShare(
                Auth::id(),
                $input['target_type'] ?? 'file',
                (int)($input['target_id'] ?? 0),
                $input['name'] ?? $input['share_name'] ?? null,
                $input['password'] ?? null,
                $input['expires_at'] ?? null,
                $input['max_downloads'] ?? null,
                isset($input['is_burn_link']) ? (int)$input['is_burn_link'] : 0,
                isset($input['notify_on_download']) ? (int)$input['notify_on_download'] : 0,
                $input['watermark_text'] ?? null,
                isset($input['is_preview_only']) ? (int)$input['is_preview_only'] : 0,
                $input['theme'] ?? 'dark',
                isset($input['include_subfolders']) ? (int)$input['include_subfolders'] : 1,
                $input['allowed_types'] ?? 'all'
            );
            $this->sendJson(['status' => 'success', 'share_url' => BASE_URL . '/s/' . $token]);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200);
        }
    }

    public function revoke() {
        $input = $this->getInput();
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            $this->sendJson(['status' => 'error', 'message' => 'Ongeldige token.'], 403);
        }

        try {
            $id = $input['id'] ?? 0;
            $this->shareService->revokeShare($id, Auth::id());
            $this->sendJson(['status' => 'success', 'message' => 'Link ingetrokken.']);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200);
        }
    }

    public function check() {
        try {
            $targetType = $_GET['target_type'] ?? '';
            $targetId = (int)($_GET['target_id'] ?? 0);
            $share = $this->shareService->getShareByTarget($targetType, $targetId, Auth::id());
            
            if ($share) {
                $this->sendJson(['status' => 'exists', 'share' => $share]);
            } else {
                $this->sendJson(['status' => 'not_found']);
            }
        } catch (Throwable $e) { 
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200); 
        }
    }

    public function stats() {
        try {
            $shareId = (int)($_GET['id'] ?? $_GET['share_id'] ?? 0);
            $stats = $this->shareService->getShareStats($shareId, Auth::id());
            
            if ($stats) {
                $this->sendJson(['status' => 'success', 'stats' => $stats]);
            } else {
                $this->sendJson(['status' => 'error', 'message' => 'Geen toegang tot deze statistieken.'], 404);
            }
        } catch (Throwable $e) { 
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200); 
        }
    }

    public function searchUsers() { 
        try {
            $input = $this->getInput();
            $searchTerm = $_GET['q'] ?? $_GET['search'] ?? $_GET['query'] ?? $input['q'] ?? '';
            if (strlen(trim($searchTerm)) < 2) {
                $this->sendJson(['status' => 'success', 'users' => []]);
            }
            $users = $this->shareService->searchUsers($searchTerm, Auth::id());
            $this->sendJson(['status' => 'success', 'users' => $users]);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200);
        }
    }

    public function collaborators() {
        try {
            // Pakt data op via zowel GET als POST requests
            $input = $this->getInput();
            $targetType = $_GET['target_type'] ?? $input['target_type'] ?? '';
            $targetId = (int)($_GET['target_id'] ?? $input['target_id'] ?? 0);
            
            $collabs = $this->shareService->getCollaborators($targetType, $targetId);
            $this->sendJson(['status' => 'success', 'data' => $collabs]);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => 'Laden mislukt: ' . $e->getMessage()], 200);
        }
    }

    public function addCollaborator() {
        $input = $this->getInput();
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            $this->sendJson(['status' => 'error', 'message' => 'Sessie verlopen'], 403);
        }

        try {
            $targetType = $input['target_type'] ?? '';
            $targetId = (int)($input['target_id'] ?? 0);
            $userId = (int)($input['user_id'] ?? 0);
            $role = $input['role'] ?? 'viewer';

            $this->shareService->addCollaborator($targetType, $targetId, $userId, $role, Auth::id());
            $this->sendJson(['status' => 'success', 'message' => 'Gebruiker succesvol toegevoegd.']);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200);
        }
    }

    public function removeCollaborator() {
        $input = $this->getInput();
        if (!Csrf::validate($input['csrf_token'] ?? '')) {
            $this->sendJson(['status' => 'error', 'message' => 'Sessie verlopen'], 403);
        }

        try {
            $collabId = (int)($input['collab_id'] ?? 0);
            $this->shareService->removeCollaborator($collabId, Auth::id());
            $this->sendJson(['status' => 'success', 'message' => 'Toegang verwijderd.']);
        } catch (Throwable $e) {
            $this->sendJson(['status' => 'error', 'message' => $e->getMessage()], 200);
        }
    }
}