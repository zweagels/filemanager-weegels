<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Auth | FILE: app/Core/Csrf.php */

require_once __DIR__ . '/Session.php';

class Csrf {
    
    /**
     * Genereert een token als die er nog niet is.
     */
    public static function getToken() {
        Session::start();
        if (!Session::has('csrf_token')) {
            self::generateNewToken();
        }
        return Session::get('csrf_token');
    }

    /**
     * Valideert de token uit een POST request.
     */
    public static function validate($token) {
        Session::start();
        $stored = Session::get('csrf_token');
        
        if (!$stored || !$token) {
            return false;
        }
        
        // Timing-attack veilige vergelijking
        return hash_equals($stored, $token);
    }
    
    /**
     * Vernieuwt de token (bijv. na login).
     */
    public static function refresh() {
        Session::start();
        self::generateNewToken();
    }

    /**
     * Helper functie om veilig een token te genereren
     * met een fallback voor Strato's random_bytes limitaties.
     */
    private static function generateNewToken() {
        try {
            $token = bin2hex(random_bytes(32));
        } catch (Throwable $e) {
            $token = bin2hex(openssl_random_pseudo_bytes(32));
        }
        Session::set('csrf_token', $token);
    }
}