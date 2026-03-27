<?php
// Pad: app/Services/SystemJobService.php

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: System | FILE: app/Services/SystemJobService.php */

require_once __DIR__ . '/../Config/Database.php';

class SystemJobService {
    
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Voert alle geautomatiseerde onderhoudstaken uit in één batch.
     * Dit kan later via een Cronjob of via een knop in de Admin Interface getriggerd worden.
     */
    public function runAllJobs() {
        // FASE 5 FIX: Geheugen opschroeven en time-limit uitschakelen zodat zware batches
        // (zoals duizenden oude logs of bestanden wissen) niet halverwege crashen.
        ini_set('memory_limit', '512M');
        set_time_limit(0);

        return [
            'expired_shares_deleted' => $this->cleanExpiredShares(),
            'old_trash_deleted' => $this->emptyOldTrash(30), 
            'expired_notifications_deleted' => $this->cleanExpiredNotifications(),
            'old_audit_logs_deleted' => $this->auditLogCleanup(90), 
            'orphaned_slides_deleted' => $this->cleanOrphanedSlides(),
            'offline_radios_disabled' => $this->validateRadioStreams(), // FASE 1 UPDATE: Radio check
            'old_snapshots_deleted' => $this->cleanOldSnapshots(30)      // FASE 2 UPDATE: Opschonen Time Machine
        ];
    }

    /**
     * Verwijdert deellinks waarvan de verloopdatum is verstreken.
     */
    public function cleanExpiredShares() {
        try {
            $stmt = $this->db->prepare("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at <= NOW()");
            $stmt->execute();
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij opschonen gedeelde links: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Leegt de prullenbak voor items die ouder zijn dan X dagen.
     */
    public function emptyOldTrash($daysOld = 30) {
        try {
            $deletedCount = 0;

            $stmtFiles = $this->db->prepare("SELECT id, storage_name FROM files WHERE deleted_at IS NOT NULL AND deleted_at <= DATE_SUB(NOW(), INTERVAL ? DAY)");
            $stmtFiles->execute([$daysOld]);
            $filesToDelete = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);

            $uploadsDir = STORAGE_PATH . '/uploads/';
            
            foreach ($filesToDelete as $file) {
                $filePath = $uploadsDir . $file['storage_name'];
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
                
                $thumbPathJpg = STORAGE_PATH . '/thumbs/' . $file['storage_name'] . '.jpg';
                $thumbPathWebp = STORAGE_PATH . '/thumbs/' . $file['storage_name'] . '.webp';
                if (file_exists($thumbPathJpg)) @unlink($thumbPathJpg);
                if (file_exists($thumbPathWebp)) @unlink($thumbPathWebp);

                $stmtDel = $this->db->prepare("DELETE FROM files WHERE id = ?");
                $stmtDel->execute([$file['id']]);
                $deletedCount++;
            }

            $stmtDirs = $this->db->prepare("DELETE FROM folders WHERE deleted_at IS NOT NULL AND deleted_at <= DATE_SUB(NOW(), INTERVAL ? DAY)");
            $stmtDirs->execute([$daysOld]);

            return $deletedCount;
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij legen oude prullenbak: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Ruimt oude, verlopen systeemnotificaties op om de database schoon te houden.
     */
    public function cleanExpiredNotifications() {
        try {
            $stmt = $this->db->prepare("DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at <= NOW()");
            $stmt->execute();
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij opschonen notificaties: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Verwijdert oude audit logs om te voorkomen dat de database te groot en traag wordt.
     */
    public function auditLogCleanup($daysToKeep = 90) {
        try {
            $stmt = $this->db->prepare("DELETE FROM audit_logs WHERE created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)");
            $stmt->execute([$daysToKeep]);
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij opschonen logs: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Verwijdert dia's uit de slideshow_items tabel waarvan het originele
     * bronbestand (in de filemanager) is verwijderd. Voorkomt vastlopers in de speler.
     */
    public function cleanOrphanedSlides() {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM slideshow_items 
                WHERE file_id IS NOT NULL 
                AND file_id NOT IN (SELECT id FROM files)
            ");
            $stmt->execute();
            return $stmt->rowCount();
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij opschonen orphaned slides: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * FASE 1 UPDATE: Controleer of ingestelde radio streams nog actief (HTTP 200 OK) zijn.
     * Zo niet, deactiveer ze zodat de TV speler hier niet op vastloopt.
     */
    public function validateRadioStreams() {
        try {
            $stmt = $this->db->query("SELECT id, stream_url FROM sys_radios WHERE is_active = 1");
            $radios = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $offlineCount = 0;

            foreach ($radios as $radio) {
                if (empty($radio['stream_url'])) continue;

                // FASE 5 FIX: Striktere timeout (1 seconde) om server-hangs te voorkomen 
                // als een radio server helemaal niet meer reageert.
                $ch = curl_init($radio['stream_url']);
                curl_setopt($ch, CURLOPT_NOBODY, true);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 1);
                curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                // Als status ongelijk is aan 200, of curl faalde volledig (0), markeer offline
                if ($code != 200 && $code != 204 && $code != 206) {
                    $upd = $this->db->prepare("UPDATE sys_radios SET is_active = 0 WHERE id = ?");
                    $upd->execute([$radio['id']]);
                    $offlineCount++;
                }
            }

            return $offlineCount;
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij valideren radiostreams: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * FASE 2 UPDATE: Verwijdert oude Time Machine revisies (snapshots) 
     * die ouder zijn dan X dagen, tenzij ze 'vastgespeld' (pinned) zijn in de instellingen.
     * Dit houdt de MySQL database vederlicht.
     */
    public function cleanOldSnapshots($daysToKeep = 30) {
        try {
            // Haal eerst alle vastgespelde (pinned) snapshots op uit alle slideshow settings
            $stmtShows = $this->db->query("SELECT settings FROM slideshows");
            $slideshows = $stmtShows->fetchAll(PDO::FETCH_ASSOC);
            
            $pinnedIds = [];
            foreach ($slideshows as $show) {
                $settings = json_decode($show['settings'] ?? '{}', true);
                if (!empty($settings['pinned_snapshots']) && is_array($settings['pinned_snapshots'])) {
                    foreach ($settings['pinned_snapshots'] as $pId) {
                        if (is_numeric($pId)) {
                            $pinnedIds[] = (int)$pId;
                        }
                    }
                }
            }
            
            $pinnedIds = array_unique($pinnedIds);
            
            // Verwijder alles ouder dan $daysToKeep, tenzij het ID voorkomt in de $pinnedIds array
            if (empty($pinnedIds)) {
                $stmtDel = $this->db->prepare("DELETE FROM slideshow_snapshots WHERE created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)");
                $stmtDel->execute([$daysToKeep]);
                return $stmtDel->rowCount();
            } else {
                $inQuery = implode(',', array_fill(0, count($pinnedIds), '?'));
                $stmtDel = $this->db->prepare("DELETE FROM slideshow_snapshots WHERE created_at <= DATE_SUB(NOW(), INTERVAL ? DAY) AND id NOT IN ($inQuery)");
                
                $params = array_merge([$daysToKeep], $pinnedIds);
                $stmtDel->execute($params);
                return $stmtDel->rowCount();
            }
            
        } catch (Exception $e) {
            error_log("[SystemJob] Fout bij opschonen oude snapshots: " . $e->getMessage());
            return 0;
        }
    }
}
?>