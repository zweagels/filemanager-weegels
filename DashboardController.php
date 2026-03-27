<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Dashboard | FILE: app/Controllers/DashboardController.php */

require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Core/Csrf.php';
require_once __DIR__ . '/../Core/Response.php';
require_once __DIR__ . '/../Services/DashboardService.php';
require_once __DIR__ . '/../Services/AdminService.php'; // FASE F: Toegevoegd voor Heatmap & Notificaties

class DashboardController {
    
    private $dashboardService;

    public function __construct() {
        // Output buffering starten om te voorkomen dat waarschuwingen de JSON corrumperen
        ob_start();
        
        if (!Auth::check()) {
            Response::json(['status' => 'error', 'message' => 'Niet geautoriseerd. Je sessie is mogelijk verlopen.'], 401);
            exit;
        }
        $this->dashboardService = new DashboardService();
    }

    /**
     * Haalt dashboard data op.
     * Ondersteunt lazy loading. Als '?widget=naam' wordt meegegeven, haalt hij specifiek die data op.
     */
    public function get() {
        try {
            $userId = Auth::id();
            
            // Controleer of de frontend slechts 1 specifieke widget asynchroon wil inladen
            if (isset($_GET['widget']) && !empty($_GET['widget'])) {
                $widgetName = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['widget']);
                $widgetData = $this->dashboardService->getWidgetData($userId, $widgetName);
                
                Response::json([
                    'status' => 'success',
                    'widget' => $widgetName,
                    'data' => $widgetData
                ]);
                exit; 
            }
            
            // Standaard volledige load:
            $layout = $this->dashboardService->getLayout($userId);
            $data = $this->dashboardService->getDashboardData($userId);
            
            Response::json([
                'status' => 'success',
                'layout' => $layout,
                'data' => $data
            ]);
            exit;
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
            exit;
        }
    }

    /**
     * Slaat de nieuwe drag-and-drop posities van de widgets op
     */
    public function saveLayout() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['csrf_token'] ?? '';
        $layout = $input['layout'] ?? null;

        if (!Csrf::validate($token)) {
            Response::json(['status' => 'error', 'message' => 'CSRF validatie mislukt. Vernieuw de pagina.'], 403);
            exit;
        }

        if (!$layout || !is_array($layout)) {
            Response::json(['status' => 'error', 'message' => 'Geen geldige layout data ontvangen.'], 400);
            exit;
        }

        try {
            $userId = Auth::id();
            $layoutJson = json_encode($layout);
            
            if ($this->dashboardService->saveLayout($userId, $layoutJson)) {
                Response::json(['status' => 'success', 'message' => 'Dashboard layout succesvol opgeslagen.']);
            } else {
                Response::json(['status' => 'error', 'message' => 'Fout bij wegschrijven van layout naar database.'], 500);
            }
            exit;
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
            exit;
        }
    }

    /**
     * Endpoint om widget settings (todos, bookmarks, banner layout) op te slaan
     */
    public function updateSettings() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['csrf_token'] ?? '';
        $field = $input['field'] ?? '';
        $data = $input['data'] ?? null;

        if (!Csrf::validate($token)) {
            Response::json(['status' => 'error', 'message' => 'Sessie verlopen of ongeldig token.'], 403);
            exit;
        }

        try {
            $this->dashboardService->updateSettings(Auth::id(), $field, $data);
            Response::json(['status' => 'success', 'message' => 'Instellingen opgeslagen.']);
            exit;
        } catch (Exception $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
            exit;
        }
    }

    // =========================================================================
    // --- FASE F: NIEUWE ENDPOINTS VOOR NOTIFICATIES EN HEATMAP ---
    // =========================================================================

    public function getNotifications() {
        try {
            $adminService = new AdminService();
            $notifications = $adminService->getUnreadNotifications(Auth::id());
            Response::json(['status' => 'success', 'data' => $notifications]);
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function markNotificationsRead() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['csrf_token'] ?? '';
        
        if (!Csrf::validate($token)) {
            Response::json(['status' => 'error', 'message' => 'Sessie verlopen. Vernieuw de pagina.'], 403);
            exit;
        }
        
        try {
            $adminService = new AdminService();
            $adminService->markNotificationsRead(Auth::id());
            Response::json(['status' => 'success']);
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getHeatmap() {
        try {
            $adminService = new AdminService();
            $data = $adminService->getHeatmapData(Auth::id());
            Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
?>