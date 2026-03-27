<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Admin | FILE: app/Controllers/AdminSlideshowController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Config/Database.php';
require_once __DIR__ . '/../Core/Csrf.php';

class AdminSlideshowController {
    
    private $db;

    public function __construct() {
        // Strikte controle op admin rechten
        if (!Auth::check() || !Auth::can('admin_settings')) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Geen admin rechten.']);
            exit;
        }
        $this->db = Database::getConnection();
    }

    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ? $input : [];
    }

    // =========================================================================
    // --- RADIO BEHEER ---
    // =========================================================================

    public function getRadios() {
        try {
            $stmt = $this->db->query("SELECT * FROM sys_radios ORDER BY name ASC");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database fout.']);
        }
    }

    public function saveRadio() {
        $input = $this->getJsonInput();
        $id = $input['id'] ?? null;
        $name = trim($input['name'] ?? '');
        $stream_url = trim($input['stream_url'] ?? '');
        $logo_url = trim($input['logo_url'] ?? '');

        if (!$name || !$stream_url) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Naam en Stream URL zijn verplicht.']);
            return;
        }

        try {
            if ($id) {
                $stmt = $this->db->prepare("UPDATE sys_radios SET name = ?, stream_url = ?, logo_url = ? WHERE id = ?");
                $stmt->execute([$name, $stream_url, $logo_url, $id]);
            } else {
                $stmt = $this->db->prepare("INSERT INTO sys_radios (name, stream_url, logo_url, is_active) VALUES (?, ?, ?, 1)");
                $stmt->execute([$name, $stream_url, $logo_url]);
            }
            echo json_encode(['status' => 'success', 'message' => 'Radiozender opgeslagen.']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function deleteRadio() {
        $input = $this->getJsonInput();
        $id = $input['id'] ?? null;
        if (!$id) return;

        try {
            $stmt = $this->db->prepare("DELETE FROM sys_radios WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'Zender verwijderd.']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Kan zender niet verwijderen.']);
        }
    }

    // =========================================================================
    // --- COMPONENT STATUS (Transities, Klokken, Achtergronden) ---
    // =========================================================================

    public function getComponents() {
        // Haalt alle configureerbare onderdelen op voor de admin UI
        try {
            $transitions = $this->db->query("SELECT * FROM sys_transitions ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
            $clocks = $this->db->query("SELECT * FROM sys_clocks ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
            $backgrounds = $this->db->query("SELECT * FROM sys_backgrounds ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'transitions' => $transitions,
                    'clocks' => $clocks,
                    'backgrounds' => $backgrounds
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function toggleComponent() {
        $input = $this->getJsonInput();
        $type = $input['type']; // 'transition', 'clock', 'background'
        $id = $input['id'];
        $active = $input['active'] ? 1 : 0;

        $tableMap = [
            'transition' => 'sys_transitions',
            'clock' => 'sys_clocks',
            'background' => 'sys_backgrounds',
            'radio' => 'sys_radios'
        ];

        if (!isset($tableMap[$type])) return;

        try {
            $table = $tableMap[$type];
            $stmt = $this->db->prepare("UPDATE $table SET is_active = ? WHERE id = ?");
            $stmt->execute([$active, $id]);
            echo json_encode(['status' => 'success']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error']);
        }
    }

    // =========================================================================
    // --- GLOBAAL SLIDESHOW BEHEER & STATS ---
    // =========================================================================

    public function getGlobalSlideshows() {
        try {
            $stmt = $this->db->query("
                SELECT s.*, u.username, u.email, 
                (SELECT COUNT(*) FROM slideshow_items WHERE slideshow_id = s.id) as item_count,
                a.views, a.total_watch_time_seconds
                FROM slideshows s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN slideshow_analytics a ON s.id = a.slideshow_id
                ORDER BY s.created_at DESC
            ");
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getStats() {
        try {
            // Top 5 meest bekeken slideshows
            $topViews = $this->db->query("
                SELECT s.title, a.views 
                FROM slideshow_analytics a 
                JOIN slideshows s ON a.slideshow_id = s.id 
                ORDER BY a.views DESC LIMIT 5
            ")->fetchAll(PDO::FETCH_ASSOC);

            // Totaal aantal actieve TV sessies (geschat op basis van laatste ping < 2 min)
            $totalActive = $this->db->query("
                SELECT COUNT(*) FROM slideshow_analytics WHERE last_viewed_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
            ")->fetchColumn();

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'top_views' => $topViews,
                    'active_now' => (int)$totalActive
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
?>