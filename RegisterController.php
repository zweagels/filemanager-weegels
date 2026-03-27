<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Auth | FILE: app/Controllers/RegisterController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Config/Constants.php';
require_once __DIR__ . '/../Config/Database.php'; 

class RegisterController {
    
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    // FASE 4: Publieke status check of registratie open is
    public function status() {
        header('Content-Type: application/json');
        try {
            $stmt = $this->db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'allow_registration'");
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            $isOpen = $res ? $res['setting_value'] : '1'; // Standaard altijd open
            echo json_encode(['status' => 'success', 'allow_registration' => $isOpen]);
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'allow_registration' => '0']);
        }
        exit;
    }

    public function register() {
        // SLIMME ROUTING FIX: Als het een GET request is, stuur hem door naar status()
        // Hierdoor hoef je geen nieuwe routes in je backend router aan te maken!
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $this->status();
            return;
        }

        header('Content-Type: application/json');

        // 1. Input lezen
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $email = trim($input['email'] ?? '');
        $pass = $input['password'] ?? '';
        $token = $input['csrf_token'] ?? '';
        $avatarBase64 = $input['avatar'] ?? null; 

        // 2. CSRF Validatie
        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen.']);
            exit;
        }

        // FASE 4: Harde check of de beheerder registratie niet heeft dichtgegooid!
        $stmtStatus = $this->db->query("SELECT setting_value FROM system_settings WHERE setting_key = 'allow_registration'");
        $resStatus = $stmtStatus->fetch(PDO::FETCH_ASSOC);
        if ($resStatus && $resStatus['setting_value'] === '0') {
            echo json_encode(['status' => 'error', 'message' => 'Registratie is momenteel gesloten door de beheerder.']);
            exit;
        }

        // 3. Input Validatie
        if (empty($username) || empty($email) || empty($pass)) {
            echo json_encode(['status' => 'error', 'message' => 'Vul alle verplichte velden in.']);
            exit;
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['status' => 'error', 'message' => 'Ongeldig e-mailadres.']);
            exit;
        }

        if (strlen($pass) < 8) {
            echo json_encode(['status' => 'error', 'message' => 'Wachtwoord moet minimaal 8 tekens bevatten.']);
            exit;
        }

        // 4. Check Uniekheid
        $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Gebruikersnaam of e-mail is al in gebruik.']);
            exit;
        }

        // 5. Avatar Verwerking (Opslaan als bestand)
        $avatarPath = null;
        if ($avatarBase64) {
            $avatarPath = $this->saveAvatar($avatarBase64, $username);
        }

        // 6. Opslaan in DB (FASE 2: Argon2id Hashing)
        try {
            $hash = password_hash($pass, PASSWORD_ARGON2ID);
            $stmt = $this->db->prepare("INSERT INTO users (username, email, password_hash, role, avatar_path, created_at) VALUES (?, ?, ?, 'user', ?, NOW())");
            $stmt->execute([$username, $email, $hash, $avatarPath]);

            echo json_encode(['status' => 'success', 'message' => 'Account aangemaakt! Je kunt nu inloggen.']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => 'Database fout: ' . $e->getMessage()]);
        }
        exit;
    }

    private function saveAvatar($base64, $username) {
        if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
            $base64 = substr($base64, strpos($base64, ',') + 1);
            $type = strtolower($type[1]); 
            
            if (!in_array($type, ['jpg', 'jpeg', 'png', 'webp'])) {
                return null; 
            }
            
            $base64 = base64_decode($base64);
            if ($base64 === false) {
                return null;
            }

            $uploadDir = STORAGE_PATH . '/uploads/avatars/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $filename = md5($username . time()) . '.' . $type;
            file_put_contents($uploadDir . $filename, $base64);

            return 'storage/uploads/avatars/' . $filename;
        }
        return null;
    }
}
?>