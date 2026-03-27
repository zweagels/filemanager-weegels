<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: app/Core/Response.php */

class Response {
    /**
     * Stuurt een gestandaardiseerde JSON response terug en stopt het script.
     * @param array $data De data om terug te sturen
     * @param int $statusCode De HTTP status code (standaard 200)
     */
    public static function json($data, $statusCode = 200) {
        // Zorg dat we geen ongewenste output (zoals spaties of PHP waarschuwingen) meesturen
        if (ob_get_length()) {
            ob_end_clean();
        }
        
        // FASE 1 FIX: Strato interceptie blokkeren
        // Strato overschrijft 5xx (Server Error) status codes met een hardcoded HTML foutpagina.
        // We verlagen 5xx errors naar 400 (Bad Request) zodat Strato de JSON met rust laat.
        // De frontend (via res.ok checks) zal dit nog steeds correct herkennen als een fout.
        if ($statusCode >= 500) {
            if (is_array($data)) {
                $data['original_status'] = $statusCode;
            }
            $statusCode = 400; 
        }
        
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
?>