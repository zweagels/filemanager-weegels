<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Config | FILE: app/Config/MimeTypes.php */

class MimeTypes {

    /**
     * De master-lijst van ondersteunde extensies.
     * Structuur: 'ext' => ['mime', 'icon', 'type']
     * * Types voor filtering:
     * - image
     * - video
     * - audio
     * - doc
     * - code
     * - archive
     * - disk (voor iso/dmg)
     * - unknown
     */
    private static $map = [
        // --- AFBEELDINGEN ---
        'jpg'  => ['mime' => 'image/jpeg', 'icon' => 'file-image', 'type' => 'image'],
        'jpeg' => ['mime' => 'image/jpeg', 'icon' => 'file-image', 'type' => 'image'],
        'png'  => ['mime' => 'image/png', 'icon' => 'file-image', 'type' => 'image'],
        'gif'  => ['mime' => 'image/gif', 'icon' => 'file-image', 'type' => 'image'],
        'webp' => ['mime' => 'image/webp', 'icon' => 'file-image', 'type' => 'image'],
        'avif' => ['mime' => 'image/avif', 'icon' => 'file-image', 'type' => 'image'],
        'svg'  => ['mime' => 'image/svg+xml', 'icon' => 'file-image', 'type' => 'image'],
        'bmp'  => ['mime' => 'image/bmp', 'icon' => 'file-image', 'type' => 'image'],
        'ico'  => ['mime' => 'image/x-icon', 'icon' => 'file-image', 'type' => 'image'],
        'tiff' => ['mime' => 'image/tiff', 'icon' => 'file-image', 'type' => 'image'],
        'heic' => ['mime' => 'image/heic', 'icon' => 'file-image', 'type' => 'image'], // Apple support

        // --- VIDEO ---
        'mp4'  => ['mime' => 'video/mp4', 'icon' => 'file-video', 'type' => 'video'],
        'm4v'  => ['mime' => 'video/x-m4v', 'icon' => 'file-video', 'type' => 'video'],
        'mov'  => ['mime' => 'video/quicktime', 'icon' => 'file-video', 'type' => 'video'],
        'avi'  => ['mime' => 'video/x-msvideo', 'icon' => 'file-video', 'type' => 'video'],
        'wmv'  => ['mime' => 'video/x-ms-wmv', 'icon' => 'file-video', 'type' => 'video'],
        'mkv'  => ['mime' => 'video/x-matroska', 'icon' => 'file-video', 'type' => 'video'],
        'webm' => ['mime' => 'video/webm', 'icon' => 'file-video', 'type' => 'video'],
        'flv'  => ['mime' => 'video/x-flv', 'icon' => 'file-video', 'type' => 'video'],

        // --- AUDIO ---
        'mp3'  => ['mime' => 'audio/mpeg', 'icon' => 'file-audio', 'type' => 'audio'],
        'wav'  => ['mime' => 'audio/wav', 'icon' => 'file-audio', 'type' => 'audio'],
        'ogg'  => ['mime' => 'audio/ogg', 'icon' => 'file-audio', 'type' => 'audio'],
        'm4a'  => ['mime' => 'audio/mp4', 'icon' => 'file-audio', 'type' => 'audio'],
        'aac'  => ['mime' => 'audio/aac', 'icon' => 'file-audio', 'type' => 'audio'],
        'flac' => ['mime' => 'audio/flac', 'icon' => 'file-audio', 'type' => 'audio'],

        // --- DOCUMENTEN ---
        'pdf'  => ['mime' => 'application/pdf', 'icon' => 'file-pdf', 'type' => 'doc'],
        'doc'  => ['mime' => 'application/msword', 'icon' => 'file-word', 'type' => 'doc'],
        'docx' => ['mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'icon' => 'file-word', 'type' => 'doc'],
        'xls'  => ['mime' => 'application/vnd.ms-excel', 'icon' => 'file-excel', 'type' => 'doc'],
        'xlsx' => ['mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'icon' => 'file-excel', 'type' => 'doc'],
        'ppt'  => ['mime' => 'application/vnd.ms-powerpoint', 'icon' => 'file-powerpoint', 'type' => 'doc'],
        'pptx' => ['mime' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'icon' => 'file-powerpoint', 'type' => 'doc'],
        'txt'  => ['mime' => 'text/plain', 'icon' => 'file-text', 'type' => 'doc'],
        'rtf'  => ['mime' => 'application/rtf', 'icon' => 'file-text', 'type' => 'doc'],
        'md'   => ['mime' => 'text/markdown', 'icon' => 'file-text', 'type' => 'doc'],
        'csv'  => ['mime' => 'text/csv', 'icon' => 'file-excel', 'type' => 'doc'],

        // --- CODE / WEB ---
        'html' => ['mime' => 'text/html', 'icon' => 'file-code', 'type' => 'code'],
        'htm'  => ['mime' => 'text/html', 'icon' => 'file-code', 'type' => 'code'],
        'css'  => ['mime' => 'text/css', 'icon' => 'file-code', 'type' => 'code'],
        'js'   => ['mime' => 'application/javascript', 'icon' => 'file-code', 'type' => 'code'],
        'json' => ['mime' => 'application/json', 'icon' => 'file-code', 'type' => 'code'],
        'xml'  => ['mime' => 'application/xml', 'icon' => 'file-code', 'type' => 'code'],
        'php'  => ['mime' => 'application/x-httpd-php', 'icon' => 'file-code', 'type' => 'code'],
        'sql'  => ['mime' => 'application/sql', 'icon' => 'file-database', 'type' => 'code'],
        'py'   => ['mime' => 'text/x-python', 'icon' => 'file-code', 'type' => 'code'],
        'java' => ['mime' => 'text/x-java-source', 'icon' => 'file-code', 'type' => 'code'],

        // --- ARCHIEVEN ---
        'zip'  => ['mime' => 'application/zip', 'icon' => 'file-archive', 'type' => 'archive'],
        'rar'  => ['mime' => 'application/x-rar-compressed', 'icon' => 'file-archive', 'type' => 'archive'],
        '7z'   => ['mime' => 'application/x-7z-compressed', 'icon' => 'file-archive', 'type' => 'archive'],
        'tar'  => ['mime' => 'application/x-tar', 'icon' => 'file-archive', 'type' => 'archive'],
        'gz'   => ['mime' => 'application/gzip', 'icon' => 'file-archive', 'type' => 'archive'],

        // --- DISK / SYSTEEM ---
        'iso'  => ['mime' => 'application/x-iso9660-image', 'icon' => 'hard-drive', 'type' => 'disk'],
        'dmg'  => ['mime' => 'application/x-apple-diskimage', 'icon' => 'hard-drive', 'type' => 'disk'],
    ];

    /**
     * Haal MIME type op basis van extensie
     */
    public static function getMimeType($extension) {
        $ext = strtolower($extension);
        return isset(self::$map[$ext]) ? self::$map[$ext]['mime'] : 'application/octet-stream';
    }

    /**
     * Haal Icon naam op (SVG ID) voor frontend weergave
     */
    public static function getIcon($extension) {
        $ext = strtolower($extension);
        return isset(self::$map[$ext]) ? self::$map[$ext]['icon'] : 'file'; // 'file' is fallback icoon
    }

    /**
     * Haal bestandscategorie op (voor filtering)
     * Return: image, video, audio, doc, code, archive, disk, unknown
     */
    public static function getType($extension) {
        $ext = strtolower($extension);
        return isset(self::$map[$ext]) ? self::$map[$ext]['type'] : 'unknown';
    }

    /**
     * Check of een extensie toegestaan is (Whitelist)
     * Kan later gekoppeld worden aan Admin settings
     */
    public static function isAllowed($extension) {
        // Exe, bat, sh, bin blokkeren we hardcoded voor veiligheid
        $blocked = ['exe', 'bat', 'sh', 'bin', 'cmd', 'msi', 'com'];
        if (in_array(strtolower($extension), $blocked)) {
            return false;
        }
        return true;
    }
}
?>