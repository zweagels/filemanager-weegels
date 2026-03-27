<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Auth | FILE: app/Core/Session.php */

class Session {
    
    /**
     * Start een veilige sessie die werkt in Incognito en moderne browsers.
     * Implementeert SameSite=Strict en HttpOnly.
     */
    public static function start() {
        if (session_status() === PHP_SESSION_NONE) {
            
            // Garbage collection instellingen (1 dag geldig)
            ini_set('session.gc_maxlifetime', 86400);
            
            // Veilige controle voor HTTPS
            $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
            
            // Cookie parameters instellen VOOR start
            session_set_cookie_params([
                'lifetime' => 86400,
                'path' => '/',
                'domain' => $_SERVER['HTTP_HOST'] ?? '',
                'secure' => $isSecure, // Alleen true bij HTTPS
                'httponly' => true, // Niet toegankelijk via JS (XSS protectie)
                'samesite' => 'Strict' // Voorkomt CSRF
            ]);
            
            session_start();
        }
    }

    /**
     * Set een variabele in de sessie.
     */
    public static function set($key, $value) {
        self::start();
        $_SESSION[$key] = $value;
    }

    /**
     * Haal een variabele op.
     */
    public static function get($key, $default = null) {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    /**
     * Check of sleutel bestaat.
     */
    public static function has($key) {
        self::start();
        return isset($_SESSION[$key]);
    }

    /**
     * Verwijder een variabele.
     */
    public static function remove($key) {
        self::start();
        if (isset($_SESSION[$key])) {
            unset($_SESSION[$key]);
        }
    }

    /**
     * Vernietig de hele sessie (Logout).
     */
    public static function destroy() {
        self::start();
        $_SESSION = [];
        
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        session_destroy();
    }

    /**
     * Regenereer Session ID (tegen Session Fixation attacks).
     * Moet aangeroepen worden na succesvolle login.
     */
    public static function regenerate() {
        self::start();
        session_regenerate_id(true);
    }
}