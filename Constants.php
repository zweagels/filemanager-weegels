<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Auth | FILE: app/Config/Constants.php */

// Definieer absolute paden om problemen met relatieve includes te voorkomen
define('ROOT_PATH', realpath(__DIR__ . '/../../'));
define('APP_PATH', ROOT_PATH . '/app');
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('CONFIG_PATH', APP_PATH . '/Config');

// URL configuratie (wordt later dynamisch of uit .env gehaald)
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
define('BASE_URL', $protocol . "://" . $host);

// Security instellingen
define('AUTH_MAX_ATTEMPTS', 3); // Aantal pogingen voor block
define('AUTH_BLOCK_TIME', 30);  // Seconden blokkade
define('AUTH_BAN_THRESHOLD', 10); // Aantal fouten voor IP ban
define('AUTH_BAN_TIME', 3600);    // 1 uur ban in seconden
?>