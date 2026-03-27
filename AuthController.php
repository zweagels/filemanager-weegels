<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Auth | FILE: app/Controllers/AuthController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Config/Constants.php';

class AuthController {
    
    private $auth;
    private $logFile;

    public function __construct() {
        $this->auth = new Auth();
        // We gebruiken een JSON bestand voor throttling om DB schema wijzigingen te voorkomen
        // Dit is sneller en voldoet aan de eisen.
        $this->logFile = STORAGE_PATH . '/logs/auth_attempts.json';
        if (!file_exists(dirname($this->logFile))) {
            mkdir(dirname($this->logFile), 0755, true);
        }
    }

    /**
     * Hoofd Login Handler
     */
    public function login() {
        header('Content-Type: application/json');

        // 1. Input lezen
        $input = json_decode(file_get_contents('php://input'), true);
        $user = $input['username'] ?? '';
        $pass = $input['password'] ?? '';
        $token = $input['csrf_token'] ?? '';
        $ip = $_SERVER['REMOTE_ADDR'];

        // 2. CSRF Validatie
        if (!Csrf::validate($token)) {
            echo json_encode(['status' => 'error', 'message' => 'Sessie verlopen. Ververs de pagina.']);
            exit;
        }

        // 3. Security: Throttling & IP Ban check
        $throttleStatus = $this->checkThrottle($ip);
        if ($throttleStatus['blocked']) {
            http_response_code($throttleStatus['code']); // 403 of 429
            echo json_encode([
                'status' => 'error',
                'message' => $throttleStatus['message'],
                'blocked_until' => $throttleStatus['blocked_until'], // Voor JS timer
                'remaining_time' => $throttleStatus['blocked_until'] - time()
            ]);
            exit;
        }

        // 4. Authenticatie Poging
        if ($this->auth->attempt($user, $pass)) {
            // Succes! Reset teller voor dit IP
            $this->resetThrottle($ip);
            
            // FASE 2 FIX: Bescherming tegen Session Fixation aanvallen
            session_regenerate_id(true);
            
            // FASE 2 FIX: Snelheid (TTFB) verbeteren door SystemJobService (onderhoud) 
            // uit de synchrone inlog-loop te trekken. Dit voorkomt dat inloggen
            // steeds trager wordt naarmate het systeem groeit.
            // Opmerking: System onderhoud hoort in een Cron Job te lopen, niet hier.
            
            echo json_encode([
                'status' => 'success',
                'redirect' => '/dashboard', // Frontend handelt routering af
                'user' => Auth::user()
            ]);
        } else {
            // Fout! Log poging en bereken straf
            $this->logAttempt($ip);
            $attempts = $this->getAttempts($ip);
            
            http_response_code(401); // Unauthorized activeert de Shake animatie in JS
            echo json_encode([
                'status' => 'error',
                'message' => 'Ongeldige gegevens.',
                'attempts_left' => AUTH_MAX_ATTEMPTS - $attempts
            ]);
        }
        exit;
    }

    /**
     * Logout Handler
     */
    public function logout() {
        $this->auth->logout();
        header('Location: /login');
        exit;
    }
    
    /**
     * Check CSRF endpoint voor JS
     */
    public function getCsrfToken() {
        header('Content-Type: application/json');
        echo json_encode(['csrf_token' => Csrf::getToken()]);
        exit;
    }

    // --- THROTTLING LOGIC (FILE BASED) ---

    private function getLogData() {
        if (!file_exists($this->logFile)) return [];
        $data = json_decode(file_get_contents($this->logFile), true);
        return is_array($data) ? $data : [];
    }

    private function saveLogData($data) {
        file_put_contents($this->logFile, json_encode($data));
    }

    private function getAttempts($ip) {
        $data = $this->getLogData();
        // Clean up oude data (ouder dan 1 uur)
        if (isset($data[$ip]) && $data[$ip]['last_attempt'] < (time() - 3600)) {
            unset($data[$ip]);
            $this->saveLogData($data);
            return 0;
        }
        return $data[$ip]['count'] ?? 0;
    }

    private function checkThrottle($ip) {
        $data = $this->getLogData();
        
        if (!isset($data[$ip])) {
            return ['blocked' => false];
        }

        $record = $data[$ip];
        $time = time();

        // 1. Check IP Ban (Hard 1 uur - 10 Fouten)
        if ($record['count'] >= AUTH_BAN_THRESHOLD) {
            $banExpires = $record['last_attempt'] + AUTH_BAN_TIME;
            if ($time < $banExpires) {
                return [
                    'blocked' => true,
                    'code' => 403,
                    'message' => 'IP geblokkeerd wegens teveel inlogpogingen.',
                    'blocked_until' => $banExpires
                ];
            } else {
                // Ban voorbij
                unset($data[$ip]);
                $this->saveLogData($data);
                return ['blocked' => false];
            }
        }

        // 2. Check Tijdelijke Block (30s block na 3 fouten in 5 minuten)
        if ($record['count'] >= AUTH_MAX_ATTEMPTS) {
            // Check of de fouten binnen 5 minuten (300s) zijn gemaakt
            if ($time < ($record['first_attempt_in_window'] + 300)) {
                $blockExpires = $record['last_attempt'] + AUTH_BLOCK_TIME; // AUTH_BLOCK_TIME is 30s
                
                if ($time < $blockExpires) {
                     return [
                        'blocked' => true,
                        'code' => 429,
                        'message' => 'Te veel pogingen. Wacht 30 seconden.',
                        'blocked_until' => $blockExpires
                    ];
                }
            } else {
                // 5 minuten zijn verstreken sinds de eerste fout in de reeks, reset de window
                $data[$ip]['count'] = 0;
                $this->saveLogData($data);
                return ['blocked' => false];
            }
        }

        return ['blocked' => false];
    }

    private function logAttempt($ip) {
        $data = $this->getLogData();
        $time = time();

        if (!isset($data[$ip])) {
            $data[$ip] = [
                'count' => 1, 
                'last_attempt' => $time,
                'first_attempt_in_window' => $time
            ];
        } else {
            // Als de laatste poging langer dan 5 minuten geleden was, reset de window
            if ($time > ($data[$ip]['last_attempt'] + 300)) {
                $data[$ip]['count'] = 1;
                $data[$ip]['first_attempt_in_window'] = $time;
            } else {
                $data[$ip]['count']++;
            }
            $data[$ip]['last_attempt'] = $time;
        }
        
        $this->saveLogData($data);
    }

    private function resetThrottle($ip) {
        $data = $this->getLogData();
        if (isset($data[$ip])) {
            unset($data[$ip]);
            $this->saveLogData($data);
        }
    }
}