<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Admin | FILE: app/Controllers/AdminController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Services/AdminService.php';

class AdminController {
    
    private $adminService;

    public function __construct() {
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        
        $isBypassed = false;
        
        if (strpos($uri, 'branding') !== false && $_SERVER['REQUEST_METHOD'] === 'GET') {
            $isBypassed = true;
        }
        
        if (strpos($uri, 'impersonate/stop') !== false || strpos($uri, 'stopImpersonate') !== false) {
            $isBypassed = true;
        }

        if (!$isBypassed) {
            if (!Auth::check() || !Auth::isAdmin()) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Toegang geweigerd: Admin rechten vereist']);
                exit;
            }
        }
        
        $this->adminService = new AdminService();
    }

    private function checkRoleAccess() {
        // FASE 3 FIX: Consistente role checks via Auth object ipv $_SESSION
        if (!Auth::can('admin_roles') && !Auth::isAdmin()) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Toegang geweigerd: Je hebt geen rechten om rollen te beheren.']);
            exit;
        }
    }

    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }

    // =========================================================================
    // --- BASIS DASHBOARD & INSTELLINGEN ---
    // =========================================================================

    public function stats() {
        try {
            $data = $this->adminService->getSystemStats();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function users() {
        try {
            $data = $this->adminService->getAllUsers();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function settings() {
        try {
            $data = $this->adminService->getSystemSettings();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function logs() {
        try {
            $data = $this->adminService->getAuditLogs(100);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function saveSettings() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten om instellingen te wijzigen']); 
            return;
        }

        $input = $this->getJsonInput();
        if (empty($input)) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => 'Geen data ontvangen']); 
            return;
        }

        try {
            if ($this->adminService->updateSystemSettings($input)) {
                $this->adminService->logAction(Auth::id(), 'admin_settings_update', 'Systeeminstellingen gewijzigd');
                echo json_encode(['status' => 'success', 'message' => 'Instellingen opgeslagen']);
            } else {
                throw new Exception('Fout bij opslaan in database.');
            }
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // =========================================================================
    // --- USERS CRUD ---
    // =========================================================================

    public function createUser() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten om gebruikers aan te maken']); 
            return;
        }

        $input = $this->getJsonInput();
        try {
            if(empty($input['username']) || empty($input['password']) || empty($input['email'])) {
                throw new Exception("Vul alle verplichte velden in.");
            }
            
            if (isset($input['role']) && !isset($input['role_id'])) {
                $input['role_id'] = ($input['role'] === 'admin') ? 1 : 2;
            }

            $input['role_id'] = (int)$input['role_id'];

            $userId = $this->adminService->createUser($input);
            $this->adminService->logAction(Auth::id(), 'user_create', "Gebruiker aangemaakt: " . $input['username']);
            echo json_encode(['status' => 'success', 'message' => 'Gebruiker succesvol aangemaakt']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function updateUser() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten om gebruikers te wijzigen']); 
            return;
        }

        $input = $this->getJsonInput();
        $userId = isset($input['id']) ? (int)$input['id'] : null;
        
        if (!$userId) { 
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => 'Geen ID opgegeven']); 
            return; 
        }

        try {
            if (isset($input['role']) && !isset($input['role_id'])) {
                $input['role_id'] = ($input['role'] === 'admin') ? 1 : 2;
            }

            $input['role_id'] = (int)$input['role_id'];

            $this->adminService->updateUser($userId, $input);
            $this->adminService->logAction(Auth::id(), 'user_update', "Gebruiker bijgewerkt ID: " . $userId);
            echo json_encode(['status' => 'success', 'message' => 'Gebruiker succesvol bijgewerkt']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function deleteUser() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten om gebruikers te verwijderen']); 
            return;
        }

        $input = $this->getJsonInput();
        $userId = isset($input['id']) ? (int)$input['id'] : null;

        if ($userId == Auth::id()) {
            http_response_code(403); 
            echo json_encode(['status' => 'error', 'message' => 'Je kunt jezelf niet verwijderen']); 
            return;
        }

        try {
            $this->adminService->deleteUser($userId);
            $this->adminService->logAction(Auth::id(), 'user_delete', "Gebruiker verwijderd ID: " . $userId);
            echo json_encode(['status' => 'success', 'message' => 'Gebruiker succesvol verwijderd']);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => 'Fout bij verwijderen: ' . $e->getMessage()]);
        }
    }

    // =========================================================================
    // --- ROLES CRUD ---
    // =========================================================================

    public function roles() {
        try {
            $data = $this->adminService->getAllRoles();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function createRole() {
        $this->checkRoleAccess();
        $input = $this->getJsonInput();
        
        try {
            if(empty($input['name'])) {
                throw new Exception("Vul een rolnaam in.");
            }
            $this->adminService->createRole($input);
            $this->adminService->logAction(Auth::id(), 'role_create', "Rol aangemaakt: " . $input['name']);
            echo json_encode(['status' => 'success', 'message' => 'Rol succesvol aangemaakt']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function updateRole() {
        $this->checkRoleAccess();
        $input = $this->getJsonInput();
        $roleId = isset($input['id']) ? (int)$input['id'] : null;
        
        if (!$roleId) { 
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => 'Geen ID opgegeven']); 
            return; 
        }

        try {
            $this->adminService->updateRole($roleId, $input);
            $this->adminService->logAction(Auth::id(), 'role_update', "Rol bijgewerkt ID: " . $roleId);
            echo json_encode(['status' => 'success', 'message' => 'Rol succesvol bijgewerkt']);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function deleteRole() {
        $this->checkRoleAccess();
        $input = $this->getJsonInput();
        $roleId = isset($input['id']) ? (int)$input['id'] : null;

        try {
            $this->adminService->deleteRole($roleId);
            $this->adminService->logAction(Auth::id(), 'role_delete', "Rol verwijderd ID: " . $roleId);
            echo json_encode(['status' => 'success', 'message' => 'Rol succesvol verwijderd. Gekoppelde gebruikers zijn teruggezet naar Standaard Gebruiker.']);
        } catch (Exception $e) {
            http_response_code(403); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // =========================================================================
    // --- IMPERSONATION ---
    // =========================================================================

    public function impersonate() {
        $input = $this->getJsonInput();
        $targetId = isset($input['user_id']) ? (int)$input['user_id'] : null;
        
        if (!$targetId) { 
            http_response_code(400); 
            echo json_encode(['status'=>'error','message'=>'Geen gebruiker geselecteerd']); 
            return; 
        }

        $targetUser = $this->adminService->getUserById($targetId);
        if (!$targetUser) { 
            http_response_code(404); 
            echo json_encode(['status'=>'error','message'=>'Gebruiker niet gevonden']); 
            return; 
        }

        if ($targetUser['role_id'] == 1 && $targetUser['id'] !== Auth::id()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Je kunt niet inloggen als een Super Admin']); 
            return;
        }

        try {
            Auth::impersonate(Auth::user(), $targetUser);
            $this->adminService->logAction(Auth::id(), 'impersonate_start', "Inloggen als gebruiker ID: {$targetId}");
            echo json_encode(['status' => 'success', 'message' => 'Succesvol ingelogd als ' . $targetUser['username']]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function stopImpersonate() {
        if (Auth::stopImpersonating()) {
            echo json_encode(['status' => 'success', 'message' => 'Teruggekeerd naar admin account']);
        } else {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => 'Geen actieve impersonatie sessie']);
        }
    }

    // =========================================================================
    // --- OUDE GOD MODE FEATURES (FASE E1) ---
    // =========================================================================

    public function bulkDeleteUsers() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor bulk acties']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $ids = $input['ids'] ?? [];
        
        if (empty($ids) || !is_array($ids)) { 
            http_response_code(400); 
            echo json_encode(['status'=>'error','message'=>'Geen geldige gebruikers geselecteerd']); 
            return; 
        }
        
        try {
            $this->adminService->bulkDeleteUsers($ids);
            $this->adminService->logAction(Auth::id(), 'bulk_user_delete', count($ids) . ' gebruikers in bulk verwijderd.');
            echo json_encode(['status'=>'success', 'message'=> count($ids) . ' gebruikers succesvol verwijderd.']);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function scanGhostFiles() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor systeemanalyse']); 
            return;
        }
        
        try {
            $ghostFiles = $this->adminService->scanGhostFiles();
            echo json_encode(['status'=>'success', 'data'=>$ghostFiles]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function deleteGhostFiles() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor bestandsverwijdering']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $files = $input['files'] ?? [];
        
        try {
            $deletedCount = $this->adminService->deleteGhostFiles($files);
            $this->adminService->logAction(Auth::id(), 'ghost_cleanup', $deletedCount . ' weesbestanden fysiek verwijderd van schijf.');
            echo json_encode(['status'=>'success', 'message'=> $deletedCount . ' bestanden permanent verwijderd.']);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function getBlacklist() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        try {
            $data = $this->adminService->getIpBlacklist();
            echo json_encode(['status'=>'success', 'data'=>$data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function addBlacklist() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        
        try {
            $this->adminService->addIpBlacklist($input['ip'] ?? '', $input['reason'] ?? '');
            $this->adminService->logAction(Auth::id(), 'ip_blacklist_add', 'IP geblokkeerd: ' . $input['ip']);
            echo json_encode(['status'=>'success', 'message'=>'IP adres succesvol geblokkeerd.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function removeBlacklist() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : null;
        
        try {
            $this->adminService->removeIpBlacklist($id);
            $this->adminService->logAction(Auth::id(), 'ip_blacklist_remove', 'IP blokkade opgeheven ID: ' . $id);
            echo json_encode(['status'=>'success', 'message'=>'Blokkade succesvol opgeheven.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function sendBroadcast() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        
        try {
            $this->adminService->sendBroadcast($input['title'] ?? 'Systeem Mededeling', $input['message'] ?? '', $input['type'] ?? 'info');
            $this->adminService->logAction(Auth::id(), 'broadcast_sent', 'Globale netwerk broadcast verzonden: ' . $input['title']);
            echo json_encode(['status'=>'success', 'message'=>'Mededeling wordt nu uitgestuurd naar alle actieve gebruikers.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    public function generateThumbnails() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor intensieve servertaken']); 
            return;
        }
        
        try {
            // FASE 3 FIX: Kogelvrije achtergrondverwerking zonder 504 Timeouts
            set_time_limit(0); 
            ignore_user_abort(true); 

            $count = $this->adminService->generateMissingThumbnails();
            
            $this->adminService->logAction(Auth::id(), 'thumb_generate', $count . ' ontbrekende thumbnails gegenereerd via Admin Job');
            echo json_encode(['status'=>'success', 'message'=> $count . ' ontbrekende miniaturen zijn succesvol gegenereerd!']);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status'=>'error', 'message'=>$e->getMessage()]);
        }
    }

    // =========================================================================
    // --- PLATFORM BEHEER FEATURES (FASE F) ---
    // =========================================================================

    public function advancedStats() {
        try {
            $data = $this->adminService->getAdvancedStats();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function globalFiles() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor Global Files']); 
            return;
        }
        
        try {
            $data = $this->adminService->getGlobalFiles();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function quarantineFile() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $fileId = isset($input['file_id']) ? (int)$input['file_id'] : null;
        $status = isset($input['quarantine_status']) ? (int)$input['quarantine_status'] : 0;
        
        try {
            $this->adminService->quarantineFile($fileId, $status);
            $this->adminService->logAction(Auth::id(), 'file_quarantine', "Bestand " . $fileId . " quarantaine status gewijzigd.");
            echo json_encode(['status' => 'success', 'message' => 'Quarantaine status succesvol gewijzigd.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function transferOwnership() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $fromId = isset($input['from_user_id']) ? (int)$input['from_user_id'] : null;
        $toId = isset($input['to_user_id']) ? (int)$input['to_user_id'] : null;
        
        try {
            $count = $this->adminService->transferOwnership($fromId, $toId);
            $this->adminService->logAction(Auth::id(), 'transfer_ownership', "Data van user {$fromId} overgedragen aan {$toId}");
            echo json_encode(['status' => 'success', 'message' => "$count items succesvol overgedragen naar nieuwe eigenaar."]);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function globalLinks() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        try {
            $data = $this->adminService->getGlobalLinks();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function revokeGlobalLink() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $linkId = isset($input['link_id']) ? (int)$input['link_id'] : null;
        
        try {
            $this->adminService->revokeGlobalLink($linkId);
            $this->adminService->logAction(Auth::id(), 'link_revoke', "Publieke link " . $linkId . " geforceerd ingetrokken.");
            echo json_encode(['status' => 'success', 'message' => 'Link definitief ingetrokken.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getTiers() {
        try {
            $data = $this->adminService->getStorageTiers();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function saveTier() {
        $this->checkRoleAccess();
        $input = $this->getJsonInput();
        
        try {
            $this->adminService->saveStorageTier($input);
            $this->adminService->logAction(Auth::id(), 'tier_saved', "Opslagpakket opgeslagen: " . $input['name']);
            echo json_encode(['status' => 'success', 'message' => 'Pakket opgeslagen.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function deleteTier() {
        $this->checkRoleAccess();
        $input = $this->getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : null;
        
        try {
            $this->adminService->deleteStorageTier($id);
            $this->adminService->logAction(Auth::id(), 'tier_deleted', "Opslagpakket verwijderd ID: " . $id);
            echo json_encode(['status' => 'success', 'message' => 'Pakket verwijderd.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getLoginAttempts() {
        if (!Auth::can('admin_logs') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        try {
            $data = $this->adminService->getLoginAttempts();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getMimeTypes() {
        try {
            $data = $this->adminService->getMimeTypes();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function saveMimeType() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        
        try {
            $this->adminService->saveMimeType($input);
            $this->adminService->logAction(Auth::id(), 'mime_updated', "Mime-Type/Badge aangepast: " . $input['extension']);
            echo json_encode(['status' => 'success', 'message' => 'Extensie badge opgeslagen.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function exportUserData() {
        if (!Auth::can('admin_users') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        $targetId = isset($input['user_id']) ? (int)$input['user_id'] : null;
        
        try {
            $downloadLink = $this->adminService->generateGdprExport($targetId);
            $this->adminService->logAction(Auth::id(), 'gdpr_export', "GDPR export gegenereerd voor gebruiker ID: " . $targetId);
            echo json_encode(['status' => 'success', 'message' => 'Export gereed.', 'download_url' => $downloadLink]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getBranding() {
        try {
            $data = $this->adminService->getBranding();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function saveBranding() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten']); 
            return;
        }
        
        $input = $this->getJsonInput();
        
        try {
            $this->adminService->saveBranding($input);
            $this->adminService->logAction(Auth::id(), 'branding_update', "Applicatie branding bijgewerkt.");
            echo json_encode(['status' => 'success', 'message' => 'Branding opgeslagen. Refresh de pagina om wijzigingen te zien.']);
        } catch (Exception $e) {
            http_response_code(400); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // =========================================================================
    // --- NIEUWE FUNCTIES: DUBBELE BESTANDEN SCANNER ---
    // =========================================================================

    public function scanDuplicates() {
        if (!Auth::can('admin_settings') && !Auth::isAdmin()) {
            http_response_code(403); 
            echo json_encode(['status'=>'error','message'=>'Geen rechten voor duplicaten scanner']); 
            return;
        }
        
        try {
            $data = $this->adminService->scanDuplicates();
            $this->adminService->logAction(Auth::id(), 'duplicate_scan', "Duplicaten scanner uitgevoerd.");
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
?>