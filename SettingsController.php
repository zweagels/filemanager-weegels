<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Settings | FILE: app/Controllers/SettingsController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Config/Database.php';

class SettingsController {
    
    private $db;

    public function __construct() {
        ob_start();
        
        if (!Auth::check()) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Niet geautoriseerd']);
            exit;
        }
        
        $this->db = Database::getConnection();
    }

    /**
     * Haal alle instellingen van de huidige gebruiker op
     */
    public function get() {
        try {
            $userId = Auth::id();
            
            // 1. Haal basis data op
            $stmt = $this->db->prepare("
                SELECT id, username, email, first_name, last_name, avatar_file_id, header_file_id, role
                FROM users 
                WHERE id = ?
            ");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                // 2. Haal de instellingen dynamisch uit de Key-Value store
                $stmtSet = $this->db->prepare("SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?");
                $stmtSet->execute([$userId]);
                $settingsRows = $stmtSet->fetchAll(PDO::FETCH_ASSOC);
                
                // Fallbacks (zodat de UI nooit crasht)
                $prefs = [
                    'theme' => 'light',
                    'sidebar_compact' => false,
                    'sidebar_autoclose' => false
                ];
                
                // Overschrijf met database waarden
                foreach($settingsRows as $row) {
                    if ($row['setting_key'] === 'theme') $prefs['theme'] = $row['setting_value'];
                    if ($row['setting_key'] === 'sidebar_compact') $prefs['sidebar_compact'] = filter_var($row['setting_value'], FILTER_VALIDATE_BOOLEAN);
                    if ($row['setting_key'] === 'sidebar_autoclose') $prefs['sidebar_autoclose'] = filter_var($row['setting_value'], FILTER_VALIDATE_BOOLEAN);
                }

                $user['preferences'] = $prefs;

                echo json_encode(['status' => 'success', 'data' => $user]);
            } else {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Gebruiker niet gevonden']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database Fout: ' . $e->getMessage()]);
        }
    }

    /**
     * Update profiel en algemene voorkeuren in de Key-Value store
     */
    public function update() {
        $userId = Auth::id();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Geen data ontvangen']);
            return;
        }

        $firstName = $input['first_name'] ?? null;
        $lastName = $input['last_name'] ?? null;
        $email = $input['email'] ?? null;
        
        // 1. Update de basis gebruikerstabel
        $stmt = $this->db->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?");
        $userSuccess = $stmt->execute([$firstName, $lastName, $email, $userId]);

        // 2. Update de key-value user_settings tabel
        $settingsSuccess = true;
        if (isset($input['preferences'])) {
            $prefs = $input['preferences'];
            $theme = $prefs['theme'] ?? 'light';
            $compact = isset($prefs['sidebar_compact']) && $prefs['sidebar_compact'] ? 'true' : 'false';
            $autoclose = isset($prefs['sidebar_autoclose']) && $prefs['sidebar_autoclose'] ? 'true' : 'false';

            $stmtSettings = $this->db->prepare("
                INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES 
                (?, 'theme', ?),
                (?, 'sidebar_compact', ?),
                (?, 'sidebar_autoclose', ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            
            $settingsSuccess = $stmtSettings->execute([
                $userId, $theme,
                $userId, $compact,
                $userId, $autoclose
            ]);
        }

        if ($userSuccess && $settingsSuccess) {
            // Update sessie data
            $user = Auth::user();
            $user['first_name'] = $firstName;
            $user['last_name'] = $lastName;
            $user['email'] = $email;
            $_SESSION['user'] = $user;

            echo json_encode(['status' => 'success', 'message' => 'Instellingen opgeslagen']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Kon instellingen niet opslaan']);
        }
    }

    /**
     * Methode specifiek voor het opslaan van UI voorkeuren via JS
     */
    public function savePreferences() {
        $userId = Auth::id();
        $input = json_decode(file_get_contents('php://input'), true);
        $prefs = $input['preferences'] ?? [];

        $theme = $prefs['theme'] ?? 'light';
        $compact = isset($prefs['sidebar_compact']) && $prefs['sidebar_compact'] ? 'true' : 'false';
        $autoclose = isset($prefs['sidebar_autoclose']) && $prefs['sidebar_autoclose'] ? 'true' : 'false';

        $stmt = $this->db->prepare("
            INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES 
            (?, 'theme', ?),
            (?, 'sidebar_compact', ?),
            (?, 'sidebar_autoclose', ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        
        if ($stmt->execute([
            $userId, $theme,
            $userId, $compact,
            $userId, $autoclose
        ])) {
            echo json_encode(['status' => 'success', 'message' => 'Voorkeuren opgeslagen']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Fout bij opslaan voorkeuren']);
        }
    }

    /**
     * Wachtwoord wijzigen (vereist oud wachtwoord)
     */
    public function changePassword() {
        $userId = Auth::id();
        $input = json_decode(file_get_contents('php://input'), true);

        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (empty($oldPassword) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Vul alle velden in']);
            return;
        }

        // Haal huidige hash op
        $stmt = $this->db->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();

        if (!password_verify($oldPassword, $hash)) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Huidige wachtwoord is onjuist']);
            return;
        }

        // Sla nieuw wachtwoord op
        $newHash = password_hash($newPassword, PASSWORD_ARGON2ID);
        $updateStmt = $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        
        if ($updateStmt->execute([$newHash, $userId])) {
            echo json_encode(['status' => 'success', 'message' => 'Wachtwoord succesvol gewijzigd']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Systeemfout bij opslaan wachtwoord']);
        }
    }

    /**
     * Koppel avatar of header afbeelding (op basis van file_id)
     */
    public function setProfileImage() {
        $userId = Auth::id();
        $input = json_decode(file_get_contents('php://input'), true);

        $type = $input['type'] ?? 'avatar'; // 'avatar' of 'header'
        $fileId = $input['file_id'] ?? null;

        if ($type === 'avatar') {
            $stmt = $this->db->prepare("UPDATE users SET avatar_file_id = ? WHERE id = ?");
        } else {
            $stmt = $this->db->prepare("UPDATE users SET header_file_id = ? WHERE id = ?");
        }

        if ($stmt->execute([$fileId, $userId])) {
            echo json_encode(['status' => 'success', 'message' => 'Afbeelding opgeslagen']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Kon afbeelding niet opslaan']);
        }
    }
}
?>