<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: app/Core/Auth.php */

require_once __DIR__ . '/Session.php';
require_once __DIR__ . '/../Config/Database.php';

class Auth {
    
    private $db;

    public function __construct() {
        // Gebruik de centrale Database class (Singleton)
        // Dit voorkomt dubbele code en zorgt voor 1 connectie
        $this->db = Database::getConnection();
    }

    /**
     * Checkt inloggegevens en laadt permissies (FASE 14 + FASE 1 IP Blacklist)
     */
    public function attempt($usernameOrEmail, $password) {
        // FASE 1: IP Blacklist Controle (God Mode)
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (!empty($ip)) {
            $stmtIp = $this->db->prepare("SELECT id FROM ip_blacklist WHERE ip_address = ?");
            $stmtIp->execute([$ip]);
            if ($stmtIp->fetch()) {
                throw new Exception("Toegang vanaf jouw netwerk is permanent geblokkeerd.");
            }
        }

        // FASE 14: JOIN met roles tabel om dynamische permissies en badge-kleuren op te halen
        $stmt = $this->db->prepare("
            SELECT u.*, r.name as role_name, r.color as role_color, r.permissions 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.email = ? OR u.username = ? 
            LIMIT 1
        ");
        $stmt->execute([$usernameOrEmail, $usernameOrEmail]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            // Login succes
            Session::regenerate(); // Belangrijk: voorkom session fixation
            
            // Standaard velden
            Session::set('user_id', $user['id']);
            Session::set('user_role', $user['role'] ?? 'user'); // Fallback
            Session::set('user_name', $user['username']);
            Session::set('user_avatar', $user['avatar_file_id'] ?? $user['avatar_path'] ?? null);
            Session::set('user_email', $user['email'] ?? '');
            Session::set('user_first_name', $user['first_name'] ?? '');
            Session::set('user_last_name', $user['last_name'] ?? '');
            
            // --- FASE 14: RBAC DATA ---
            Session::set('user_role_id', $user['role_id']);
            Session::set('user_role_name', $user['role_name'] ?? 'Gebruiker');
            Session::set('user_role_color', $user['role_color'] ?? '#3b82f6');
            $perms = !empty($user['permissions']) ? json_decode($user['permissions'], true) : [];
            Session::set('user_permissions', $perms);

            // --- FASE 1: Optie 2 Fysieke Tabel Check ---
            // Zorg dat er een record in user_settings is voor deze gebruiker
            $stmtCheckSettings = $this->db->prepare("SELECT user_id FROM user_settings WHERE user_id = ?");
            $stmtCheckSettings->execute([$user['id']]);
            if (!$stmtCheckSettings->fetch()) {
                $stmtInsert = $this->db->prepare("INSERT IGNORE INTO user_settings (user_id) VALUES (?)");
                $stmtInsert->execute([$user['id']]);
            }
            
            // Check voor self-destruct van install map
            $this->checkInstallCleanup();
            
            return true;
        }

        return false;
    }

    /**
     * Is de gebruiker ingelogd?
     */
    public static function check() {
        Session::start();
        return Session::has('user_id');
    }

    /**
     * Haal huidige user ID op
     */
    public static function id() {
        Session::start();
        return Session::get('user_id');
    }

    /**
     * Haal huidige user data op (Inclusief RBAC data voor de frontend)
     */
    public static function user() {
        Session::start();
        return [
            'id' => Session::get('user_id'),
            'username' => Session::get('user_name'),
            'role' => Session::get('user_role'),
            'avatar' => Session::get('user_avatar'),
            'email' => Session::get('user_email'),
            'first_name' => Session::get('user_first_name'),
            'last_name' => Session::get('user_last_name'),
            // FASE 14 Toevoegingen:
            'role_id' => Session::get('user_role_id'),
            'role_name' => Session::get('user_role_name'),
            'role_color' => Session::get('user_role_color'),
            'permissions' => Session::get('user_permissions') ?? []
        ];
    }

    /**
     * Logout
     */
    public function logout() {
        Session::start();
        Session::remove('impersonator_id');
        Session::remove('impersonator_user');
        Session::destroy();
    }
    
    /**
     * Helper: Verwijder install map na succesvolle login
     */
    private function checkInstallCleanup() {
        $installPath = realpath(__DIR__ . '/../../install');
        if ($installPath && is_dir($installPath)) {
            $this->deleteDirectory($installPath);
        }
    }
    
    private function deleteDirectory($dir) {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') continue;
            if (!$this->deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }

    // =========================================================================
    // --- FASE 14: ADMIN, IMPERSONATION & RBAC (ROLE-BASED ACCESS CONTROL) ---
    // =========================================================================

    /**
     * Controleert of de huidige gebruiker een specifiek recht heeft (De "Wall")
     */
    public static function can($permissionKey) {
        Session::start();
        
        // --- FIX: SUPER ADMIN OVERRIDE ---
        // Een Super Admin (role_id 1) of iemand met de legacy 'admin' status 
        // mag altijd alles. Dit voorkomt dat beheerders zichzelf buitensluiten.
        if (Session::get('user_role_id') == 1 || Session::get('user_role') === 'admin') {
            return true;
        }
        // ---------------------------------

        $perms = Session::get('user_permissions');
        
        // Als de permissie bestaat in de array én op true staat, geef toegang
        if (is_array($perms) && isset($perms[$permissionKey])) {
            return $perms[$permissionKey] === true;
        }
        
        // Standaard veiligheidsbeleid: Geen specifiek recht = Geen toegang.
        return false; 
    }

    /**
     * Controleer of de huidige gebruiker beheerder is (voor legacy compatibiliteit & admin panel)
     */
    public static function isAdmin() {
        return self::can('admin_access') || (Session::get('user_role') === 'admin');
    }

    /**
     * Start een impersonatie sessie (Login als andere gebruiker voor support)
     */
    public static function impersonate($adminUser, $targetUser) {
        Session::start();
        
        // Check of de huidige sessie het recht heeft om te impersoneren
        if (!self::can('admin_impersonate') && Session::get('user_role') !== 'admin') {
            throw new Exception("Geen rechten om te impersoneren.");
        }
        
        // 1. Bewaar de huidige admin gegevens in een veilige kluis in de sessie
        Session::set('impersonator_id', Session::get('user_id'));
        Session::set('impersonator_user', [
            'user_id' => Session::get('user_id'),
            'user_role' => Session::get('user_role'),
            'user_name' => Session::get('user_name'),
            'user_avatar' => Session::get('user_avatar'),
            'user_email' => Session::get('user_email'),
            'user_first_name' => Session::get('user_first_name'),
            'user_last_name' => Session::get('user_last_name'),
            'user_role_id' => Session::get('user_role_id'),
            'user_role_name' => Session::get('user_role_name'),
            'user_role_color' => Session::get('user_role_color'),
            'user_permissions' => Session::get('user_permissions')
        ]);
        
        // 2. Overschrijf de actieve sessie met de gegevens van het doelwit
        Session::set('user_id', $targetUser['id']);
        Session::set('user_role', $targetUser['role'] ?? 'user');
        Session::set('user_name', $targetUser['username']);
        Session::set('user_avatar', $targetUser['avatar_file_id'] ?? null);
        Session::set('user_email', $targetUser['email'] ?? '');
        Session::set('user_first_name', $targetUser['first_name'] ?? '');
        Session::set('user_last_name', $targetUser['last_name'] ?? '');
        
        // 3. Zet ook de rechten en rol van het doelwit
        Session::set('user_role_id', $targetUser['role_id'] ?? null);
        Session::set('user_role_name', $targetUser['role_name'] ?? 'Gebruiker');
        Session::set('user_role_color', $targetUser['role_color'] ?? '#3b82f6');
        $perms = !empty($targetUser['permissions']) ? (is_string($targetUser['permissions']) ? json_decode($targetUser['permissions'], true) : $targetUser['permissions']) : [];
        Session::set('user_permissions', $perms);
    }

    /**
     * Controleer of de Admin momenteel "vermomd" is als iemand anders
     */
    public static function isImpersonating() {
        Session::start();
        return Session::has('impersonator_id');
    }

    /**
     * Stop impersonatie en ga terug naar het originele admin account
     */
    public static function stopImpersonating() {
        Session::start();
        if (self::isImpersonating()) {
            $originalAdmin = Session::get('impersonator_user');
            
            // Gooi de vermomming weg
            Session::remove('impersonator_id');
            Session::remove('impersonator_user');
            
            // Zet de admin weer terug in de bestuurdersstoel
            if ($originalAdmin) {
                Session::set('user_id', $originalAdmin['user_id']);
                Session::set('user_role', $originalAdmin['user_role']);
                Session::set('user_name', $originalAdmin['user_name']);
                Session::set('user_avatar', $originalAdmin['user_avatar']);
                Session::set('user_email', $originalAdmin['user_email']);
                Session::set('user_first_name', $originalAdmin['user_first_name']);
                Session::set('user_last_name', $originalAdmin['user_last_name']);
                
                Session::set('user_role_id', $originalAdmin['user_role_id']);
                Session::set('user_role_name', $originalAdmin['user_role_name']);
                Session::set('user_role_color', $originalAdmin['user_role_color']);
                Session::set('user_permissions', $originalAdmin['user_permissions']);
                return true;
            }
        }
        return false;
    }
}
?>