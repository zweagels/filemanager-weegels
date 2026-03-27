<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Config | FILE: app/Config/Database.php */

class Database {
    
    private static $instance = null;
    private static $envCache = null; // In-Memory RAM Cache
    private $pdo;

    private function __construct() {
        // 1. Verwijder de fysieke cache van de vorige poging als deze nog bestaat (Oplossen van de 500 error)
        $corruptCache = __DIR__ . '/../../storage/cache/env_cache.php';
        if (file_exists($corruptCache)) {
            @unlink($corruptCache);
        }

        // 2. RAM Cache inladen (Razendsnel en 100% veilig tegen gelijktijdige verzoeken)
        if (self::$envCache === null) {
            $envPath = realpath(__DIR__ . '/../../.env');
            if (!$envPath) {
                $envPath = __DIR__ . '/../../.env'; // Fallback als realpath false is
            }

            if (!file_exists($envPath)) {
                die("Configuratie bestand (.env) ontbreekt. Voer de installatie uit.");
            }

            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $env = [];
            foreach ($lines as $line) {
                // Negeer comments en lege regels
                if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) {
                    continue;
                }
                
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value);
            }
            self::$envCache = $env;
        }

        $env = self::$envCache;

        // 3. Maak PDO verbinding
        $host = $env['DB_HOST'] ?? 'localhost';
        $db   = $env['DB_DATABASE'] ?? '';
        $user = $env['DB_USERNAME'] ?? '';
        $pass = $env['DB_PASSWORD'] ?? '';
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $e) {
            // In productie wil je dit loggen en niet tonen
            throw new \PDOException($e->getMessage(), (int)$e->getCode());
        }
    }

    /**
     * Singleton pattern: voorkom meerdere database verbindingen
     */
    public static function getConnection() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }

    /**
     * Voorkom clonen
     */
    private function __clone() {}

    /**
     * Voorkom unserialize
     */
    public function __wakeup() {}
}
?>