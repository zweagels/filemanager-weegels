<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: app/Services/AlbumService.php */

require_once __DIR__ . '/../Config/Database.php';

class AlbumService {
    
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Haalt alle albums van een gebruiker op, inclusief het aantal gekoppelde bestanden
     */
    public function getAlbums($userId) {
        // FASE 1 FIX: We gebruiken password_hash as pincode om de JSON crash te voorkomen
        // aangezien de database de kolom pincode niet kent!
        $stmt = $this->db->prepare("
            SELECT a.id, a.name, a.color, a.icon, a.cover_file_id, a.password_hash as pincode,
                   (SELECT COUNT(*) FROM album_files af WHERE af.album_id = a.id) as files_count 
            FROM albums a 
            WHERE a.user_id = ? 
            ORDER BY a.name ASC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Maakt een nieuw album aan
     */
    public function createAlbum($userId, $name, $color, $icon) {
        $stmt = $this->db->prepare("INSERT INTO albums (user_id, name, color, icon) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $color, $icon]);
        return $this->db->lastInsertId();
    }

    /**
     * Update een bestaande album (Naam, Kleur, Icoon)
     */
    public function updateAlbum($albumId, $name, $color, $icon, $userId) {
        $stmt = $this->db->prepare("UPDATE albums SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$name, $color, $icon, $albumId, $userId]);
        return true;
    }

    /**
     * Verwijdert een album
     */
    public function deleteAlbum($albumId, $userId) {
        $stmt = $this->db->prepare("DELETE FROM albums WHERE id = ? AND user_id = ?");
        $stmt->execute([$albumId, $userId]);
        return true;
    }

    /**
     * Haalt alle bestanden binnen een specifiek album op
     */
    public function getAlbumFiles($albumId, $userId) {
        $stmt = $this->db->prepare("
            SELECT f.* FROM files f
            JOIN album_files af ON f.id = af.file_id
            JOIN albums a ON af.album_id = a.id
            WHERE a.id = ? AND a.user_id = ? AND f.deleted_at IS NULL
            ORDER BY af.created_at DESC
        ");
        $stmt->execute([$albumId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Voegt een bestand toe aan een album
     */
    public function addFileToAlbum($fileId, $albumId, $userId) {
        $stmtCheck = $this->db->prepare("SELECT id FROM files WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$fileId, $userId]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Bestand niet gevonden of geen toegang.");
        }

        $stmtCheckAlbum = $this->db->prepare("SELECT id FROM albums WHERE id = ? AND user_id = ?");
        $stmtCheckAlbum->execute([$albumId, $userId]);
        if (!$stmtCheckAlbum->fetch()) {
            throw new Exception("Album niet gevonden of geen toegang.");
        }

        $stmt = $this->db->prepare("INSERT IGNORE INTO album_files (album_id, file_id) VALUES (?, ?)");
        $stmt->execute([$albumId, $fileId]);
        return true;
    }

    /**
     * Haalt een bestand uit een album
     */
    public function removeFileFromAlbum($fileId, $albumId, $userId) {
        $stmtCheck = $this->db->prepare("SELECT id FROM albums WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$albumId, $userId]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Geen toegang tot dit album.");
        }

        $stmt = $this->db->prepare("DELETE FROM album_files WHERE album_id = ? AND file_id = ?");
        $stmt->execute([$albumId, $fileId]);
        return true;
    }

    /**
     * Stelt een omslagfoto (cover) in voor het album
     */
    public function setCover($albumId, $fileId, $userId) {
        $stmtCheck = $this->db->prepare("SELECT id FROM files WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$fileId, $userId]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Bestand niet gevonden of geen toegang.");
        }

        $stmt = $this->db->prepare("UPDATE albums SET cover_file_id = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$fileId, $albumId, $userId]);
        return true;
    }

    /**
     * Beveiligt het album met een Pincode of verwijdert deze als de input leeg is
     */
    public function setPincode($albumId, $pincode, $userId) {
        // FASE 1 FIX: Pincodes worden nu correct via de password_hash kolom opgeslagen.
        $hash = empty($pincode) ? null : password_hash($pincode, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE albums SET password_hash = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$hash, $albumId, $userId]);
        return true;
    }

    /**
     * Controleert of de pincode klopt
     */
    public function checkPincode($albumId, $pincode, $userId) {
        // FASE 1 FIX: Controleren op password_hash kolom
        $stmt = $this->db->prepare("SELECT password_hash FROM albums WHERE id = ? AND user_id = ?");
        $stmt->execute([$albumId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || empty($row['password_hash'])) return true;
        return password_verify($pincode, $row['password_hash']);
    }
}