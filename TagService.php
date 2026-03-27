<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: app/Services/TagService.php */

require_once __DIR__ . '/../Config/Database.php';

class TagService {
    
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Haalt alle tags van een gebruiker op, inclusief het aantal gekoppelde bestanden
     */
    public function getTags($userId) {
        $stmt = $this->db->prepare("
            SELECT t.*, (SELECT COUNT(*) FROM file_tags ft WHERE ft.tag_id = t.id) as files_count 
            FROM tags t 
            WHERE t.user_id = ? 
            ORDER BY t.name ASC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Maakt een nieuwe tag aan
     */
    public function createTag($userId, $name, $color, $icon) {
        $stmt = $this->db->prepare("INSERT INTO tags (user_id, name, color, icon) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $color, $icon]);
        return $this->db->lastInsertId();
    }

    /**
     * Update een bestaande tag (Naam, Kleur, Icoon)
     */
    public function updateTag($tagId, $userId, $name, $color, $icon) {
        $stmt = $this->db->prepare("UPDATE tags SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$name, $color, $icon, $tagId, $userId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Verwijder een tag. De koppelingen in file_tags worden automatisch gewist door de ON DELETE CASCADE in de database
     */
    public function deleteTag($tagId, $userId) {
        $stmt = $this->db->prepare("DELETE FROM tags WHERE id = ? AND user_id = ?");
        $stmt->execute([$tagId, $userId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * DE FIX VOOR DE TAG-BUG:
     * Koppelt een bestand aan een tag via de pivot tabel `file_tags` in plaats van JSON.
     */
    public function assignFileToTag($fileId, $tagId, $userId) {
        // Controleer of de gebruiker eigenaar is van zowel het bestand als de tag (beveiliging)
        $stmtCheck = $this->db->prepare("
            SELECT f.id as file_id, t.id as tag_id 
            FROM files f, tags t 
            WHERE f.id = ? AND f.user_id = ? AND t.id = ? AND t.user_id = ?
        ");
        $stmtCheck->execute([$fileId, $userId, $tagId, $userId]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Bestand of label niet gevonden of geen toegang.");
        }

        // INSERT IGNORE voorkomt fouten als de relatie al bestaat (Geen dubbele tags op 1 bestand)
        $stmt = $this->db->prepare("INSERT IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)");
        $stmt->execute([$fileId, $tagId]);
        return true;
    }

    /**
     * Haalt een bestand los van een tag
     */
    public function removeFileFromTag($fileId, $tagId, $userId) {
        // Eigenaarschap check via de files tabel
        $stmtCheck = $this->db->prepare("SELECT id FROM files WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$fileId, $userId]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Geen toegang tot dit bestand.");
        }

        $stmt = $this->db->prepare("DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?");
        $stmt->execute([$fileId, $tagId]);
        return true;
    }

    /**
     * Nesting (Slepen van Tag A op Tag B)
     */
    public function nestTag($childId, $parentId, $userId) {
        if ($childId == $parentId) {
            throw new Exception("Een label kan niet onder zichzelf genest worden.");
        }

        // Controleer of beide tags van de gebruiker zijn
        $stmtCheck = $this->db->prepare("SELECT id FROM tags WHERE id IN (?, ?) AND user_id = ?");
        $stmtCheck->execute([$childId, $parentId, $userId]);
        if ($stmtCheck->rowCount() !== 2) {
            throw new Exception("Een van de labels is niet gevonden of je hebt geen toegang.");
        }

        $stmt = $this->db->prepare("UPDATE tags SET parent_id = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$parentId, $childId, $userId]);
        return true;
    }
}
?>