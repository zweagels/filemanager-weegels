<?php
/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: index.php */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$required_files = [
    __DIR__ . '/app/Config/Constants.php',
    __DIR__ . '/app/Core/Session.php',
    __DIR__ . '/app/Core/Auth.php',
    __DIR__ . '/app/Controllers/AuthController.php',
    __DIR__ . '/app/Controllers/RegisterController.php',
    __DIR__ . '/app/Controllers/FileController.php',
    __DIR__ . '/app/Controllers/UploadController.php',
    __DIR__ . '/app/Controllers/ConvertController.php',
    __DIR__ . '/app/Controllers/ShareController.php',
    __DIR__ . '/app/Controllers/PublicController.php',
    __DIR__ . '/app/Controllers/DashboardController.php',
    __DIR__ . '/app/Controllers/SettingsController.php',
    __DIR__ . '/app/Controllers/AdminController.php',
    
    // FASE 1: Slideshow Controllers
    __DIR__ . '/app/Controllers/SlideshowController.php',
    __DIR__ . '/app/Controllers/SlideshowEditorController.php',
    __DIR__ . '/app/Controllers/AdminSlideshowController.php'
];

foreach ($required_files as $file) {
    if (!file_exists($file)) {
        if (strpos($file, 'Slideshow') !== false) {
            continue; 
        } else {
            die("<h1>Systeemfout</h1><p>Kritiek bestand mist: " . htmlspecialchars($file) . "</p>");
        }
    }
    require_once $file;
}

// FASE 4 FIX: CSP aangepast! Externe radio streams, connecties en logo's zijn nu volledig toegestaan
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src * data: blob: https://api.qrserver.com https: http:; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; form-action 'self'; media-src * blob: data: https: http:; connect-src *;");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
header("Referrer-Policy: strict-origin-when-cross-origin");

Session::start();

$rawUri = $_SERVER['REQUEST_URI'];
if (($pos = strpos($rawUri, '?')) !== false) {
    $rawUri = substr($rawUri, 0, $pos);
}
$uri = rtrim($rawUri, '/');
if (empty($uri)) rtrim($uri, '/');
if ($uri === '') $uri = '/';

$method = $_SERVER['REQUEST_METHOD'];

if (strpos($uri, '/api/') === 0) {
    
    // FASE 4 FIX: Sluit de TV Speler en publieke routes uit van de inlogverplichting
    $isPublicApi = strpos($uri, '/api/public') === 0 
                || strpos($uri, '/api/slideshow/play') === 0 
                || strpos($uri, '/api/slideshow/analytics') === 0
                || $uri === '/api/login' || $uri === '/api/logout' 
                || $uri === '/api/register' || $uri === '/api/csrf';

    if (!$isPublicApi && !Auth::check()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Niet ingelogd']);
        exit;
    }

    $rbac_rules = [
        '/api/files' => ['GET' => 'file_view'],
        '/api/folders/create' => ['POST' => 'folder_create'],
        '/api/files/rename' => ['POST' => 'item_rename'],
        '/api/folders/size' => ['GET' => 'file_view'],
        '/api/files/create-text' => ['POST' => 'file_upload'],
        '/api/files/move' => ['POST' => 'item_move'],
        '/api/move-bulk' => ['POST' => 'item_move'], // FASE 3 FIX: Bulk-verplaatsing RBAC check
        '/api/files/copy' => ['POST' => 'item_move'],
        '/api/properties' => ['GET' => 'file_view'],
        '/api/download' => ['GET' => 'file_download'],
        '/api/files/zip' => ['POST' => 'file_download'],
        '/api/upload/check' => ['POST' => 'file_upload'],
        '/api/upload/chunk' => ['POST' => 'file_upload'],
        '/api/upload/merge' => ['POST' => 'file_upload'],
        '/api/convert' => ['POST' => 'file_upload'],
        '/api/trash' => ['GET' => 'trash_view'],
        '/api/files/delete' => ['POST' => 'file_delete'],
        '/api/trash/restore' => ['POST' => 'trash_restore'],
        '/api/trash/force-delete' => ['POST' => 'trash_empty'],
        '/api/trash/empty' => ['POST' => 'trash_empty'],
        '/api/tags' => ['GET' => 'file_view'],
        '/api/tags/create' => ['POST' => 'tag_manage'],
        '/api/tags/update' => ['POST' => 'tag_manage'],
        '/api/tags/delete' => ['POST' => 'tag_manage'],
        '/api/tags/assign' => ['POST' => 'tag_assign'],
        '/api/tags/remove' => ['POST' => 'tag_assign'],
        '/api/tags/nest' => ['POST' => 'tag_manage'],
        '/api/albums' => ['GET' => 'file_view'],
        '/api/albums/contents' => ['GET' => 'file_view'],
        '/api/albums/create' => ['POST' => 'album_create'],
        '/api/albums/update' => ['POST' => 'album_edit'],
        '/api/albums/delete' => ['POST' => 'album_edit'],
        '/api/albums/assign' => ['POST' => 'album_edit'],
        '/api/albums/remove-file' => ['POST' => 'album_edit'],
        '/api/albums/cover' => ['POST' => 'album_edit'],
        '/api/albums/pincode' => ['POST' => 'album_edit'],
        '/api/share/list' => ['GET' => 'share_create'],
        '/api/share/create' => ['POST' => 'share_create'],
        '/api/share/update' => ['POST' => 'share_create'],
        '/api/share/revoke' => ['POST' => 'share_revoke'],
        '/api/slideshow/overview' => ['GET' => 'file_view'],
        '/api/slideshow/create' => ['POST' => 'slideshow_create'],
        '/api/slideshow/autoplay' => ['POST' => 'slideshow_create'],
        '/api/slideshow/update' => ['POST' => 'slideshow_create'],
        '/api/slideshow/delete' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/load' => ['GET' => 'slideshow_create'],
        '/api/slideshow/editor/save' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/removeItems' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/lock' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/unlock' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/snapshot' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/snapshot/restore' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/collaborators/add' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/collaborators/remove' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/heartbeat' => ['POST' => 'slideshow_create'],
        '/api/slideshow/admin/export' => ['POST' => 'slideshow_create'],
        '/api/slideshow/editor/snapshot/diff' => ['GET' => 'slideshow_create'],
        '/api/slideshow/logs' => ['GET' => 'file_view'],
        '/api/admin/slideshow/radios' => ['GET' => 'admin_settings'],
        '/api/admin/slideshow/radios/save' => ['POST' => 'admin_settings'],
        '/api/admin/slideshow/radios/delete' => ['POST' => 'admin_settings']
    ];

    if (isset($rbac_rules[$uri][$method])) {
        $requiredPermission = $rbac_rules[$uri][$method];
        if (!Auth::can($requiredPermission)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Toegang geweigerd: Je rol heeft geen rechten voor deze actie (' . $requiredPermission . ').']);
            exit;
        }
    }

    // FASE 2: Razendsnelle Array Router (Vervangt tientallen If/Else blocks)
    $apiRoutes = [
        'GET' => [
            '/api/csrf' => ['AuthController', 'getCsrfToken'],
            '/api/register' => ['RegisterController', 'status'],
            '/api/files/download' => function() { $_GET['action'] = 'download'; (new FileController())->index(); },
            '/api/files/thumb' => function() { $_GET['action'] = 'thumb'; (new FileController())->index(); },
            '/api/files' => ['FileController', 'index'],
            '/api/folders/size' => ['FileController', 'folderSize'],
            '/api/quota' => ['FileController', 'quota'],
            '/api/properties' => ['FileController', 'properties'],
            '/api/trash' => ['FileController', 'trashList'],
            '/api/tags' => ['FileController', 'getTags'],
            '/api/albums' => ['FileController', 'getAlbums'],
            '/api/albums/contents' => ['FileController', 'albumContents'],
            '/api/download' => ['ConvertController', 'downloadFile'],
            '/api/share/list' => ['ShareController', 'index'],
            '/api/share/get' => ['ShareController', 'get'],
            '/api/share/check' => ['ShareController', 'check'],
            '/api/share/stats' => ['ShareController', 'stats'],
            '/api/share/users' => ['ShareController', 'searchUsers'],
            '/api/share/collaborators' => ['ShareController', 'collaborators'],
            '/api/public/info' => ['PublicController', 'info'],
            '/api/public/folder' => ['PublicController', 'folder'],
            '/api/public/download' => ['PublicController', 'download'],
            '/api/dashboard' => ['DashboardController', 'get'],
            '/api/dashboard/notifications' => ['DashboardController', 'getNotifications'],
            '/api/dashboard/heatmap' => ['DashboardController', 'getHeatmap'],
            '/api/settings' => ['SettingsController', 'get'],
            '/api/admin/stats' => ['AdminController', 'stats'],
            '/api/admin/users' => ['AdminController', 'users'],
            '/api/admin/roles' => ['AdminController', 'roles'],
            '/api/admin/settings' => ['AdminController', 'settings'],
            '/api/admin/logs' => ['AdminController', 'logs'],
            '/api/admin/scanGhostFiles' => ['AdminController', 'scanGhostFiles'],
            '/api/admin/blacklist' => ['AdminController', 'getBlacklist'],
            '/api/admin/scanDuplicates' => ['AdminController', 'scanDuplicates'],
            '/api/admin/advancedStats' => ['AdminController', 'advancedStats'],
            '/api/admin/globalFiles' => ['AdminController', 'globalFiles'],
            '/api/admin/globalLinks' => ['AdminController', 'globalLinks'],
            '/api/admin/tiers' => ['AdminController', 'getTiers'],
            '/api/admin/loginAttempts' => ['AdminController', 'getLoginAttempts'],
            '/api/admin/mimeTypes' => ['AdminController', 'getMimeTypes'],
            '/api/admin/branding' => ['AdminController', 'getBranding'],
            '/api/slideshow/overview' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->overview(); } },
            '/api/slideshow/editor/load' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->load(); } },
            '/api/slideshow/editor/snapshot/diff' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->getSnapshotDiff(); } },
            '/api/slideshow/play' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->getPlayData(); } },
            '/api/slideshow/logs' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->getAccessLogs(); } },
            '/api/admin/slideshow/radios' => function() { if (class_exists('AdminSlideshowController')) { (new AdminSlideshowController())->getRadios(); } }
        ],
        'POST' => [
            '/api/login' => ['AuthController', 'login'],
            '/api/logout' => ['AuthController', 'logout'],
            '/api/register' => ['RegisterController', 'register'],
            '/api/files/savePreferences' => ['FileController', 'savePreferences'],
            '/api/folders/create' => ['FileController', 'createFolder'],
            '/api/files/rename' => ['FileController', 'rename'],
            '/api/files/create-text' => ['FileController', 'createText'],
            '/api/files/move' => ['FileController', 'move'],
            '/api/move-bulk' => ['FileController', 'moveBulk'], // FASE 3 FIX: BULK MOVE ENDPOINT
            '/api/files/copy' => ['FileController', 'copy'],
            '/api/files/zip' => ['FileController', 'downloadZip'],
            '/api/style/update' => ['FileController', 'style'],
            '/api/favorite/toggle' => ['FileController', 'toggleFavorite'],
            '/api/files/delete' => ['FileController', 'delete'],
            '/api/trash/restore' => ['FileController', 'restore'],
            '/api/trash/force-delete' => ['FileController', 'forceDelete'],
            '/api/trash/empty' => ['FileController', 'emptyTrash'],
            '/api/tags/create' => ['FileController', 'createTag'],
            '/api/tags/update' => ['FileController', 'updateTag'],
            '/api/tags/delete' => ['FileController', 'deleteTag'],
            '/api/tags/assign' => ['FileController', 'assignTag'],
            '/api/tags/remove' => ['FileController', 'removeTag'],
            '/api/tags/nest' => ['FileController', 'nestTag'],
            '/api/albums/create' => ['FileController', 'createAlbum'],
            '/api/albums/update' => ['FileController', 'updateAlbum'],
            '/api/albums/delete' => ['FileController', 'deleteAlbum'],
            '/api/albums/assign' => ['FileController', 'assignToAlbum'],
            '/api/albums/remove-file' => ['FileController', 'removeFromAlbum'],
            '/api/albums/cover' => ['FileController', 'setAlbumCover'],
            '/api/albums/pincode' => ['FileController', 'setAlbumPincode'],
            '/api/upload/check' => ['UploadController', 'checkChunk'],
            '/api/upload/chunk' => ['UploadController', 'chunk'],
            '/api/upload/merge' => ['UploadController', 'merge'],
            '/api/convert' => ['ConvertController', 'index'],
            '/api/share/create' => ['ShareController', 'create'],
            '/api/share/update' => ['ShareController', 'update'],
            '/api/share/revoke' => ['ShareController', 'revoke'],
            '/api/share/collaborators/add' => ['ShareController', 'addCollaborator'],
            '/api/share/collaborators/remove' => ['ShareController', 'removeCollaborator'],
            '/api/public/auth' => ['PublicController', 'authenticate'],
            '/api/public/upload' => ['PublicController', 'uploadRequest'],
            '/api/dashboard' => function() { $c = new DashboardController(); if (isset($_GET['action']) && $_GET['action'] === 'settings') { $c->updateSettings(); } else { $c->saveLayout(); } },
            '/api/dashboard/notifications/read' => ['DashboardController', 'markNotificationsRead'],
            '/api/settings/update' => ['SettingsController', 'update'],
            '/api/settings/password' => ['SettingsController', 'changePassword'],
            '/api/settings/image' => ['SettingsController', 'setProfileImage'],
            '/api/admin/users/create' => ['AdminController', 'createUser'],
            '/api/admin/users/update' => ['AdminController', 'updateUser'],
            '/api/admin/users/delete' => ['AdminController', 'deleteUser'],
            '/api/admin/roles/create' => ['AdminController', 'createRole'],
            '/api/admin/roles/update' => ['AdminController', 'updateRole'],
            '/api/admin/roles/delete' => ['AdminController', 'deleteRole'],
            '/api/admin/settings' => ['AdminController', 'saveSettings'],
            '/api/admin/impersonate' => ['AdminController', 'impersonate'],
            '/api/admin/impersonate/stop' => ['AdminController', 'stopImpersonate'],
            '/api/admin/bulkDeleteUsers' => ['AdminController', 'bulkDeleteUsers'],
            '/api/admin/deleteGhostFiles' => ['AdminController', 'deleteGhostFiles'],
            '/api/admin/addBlacklist' => ['AdminController', 'addBlacklist'],
            '/api/admin/removeBlacklist' => ['AdminController', 'removeBlacklist'],
            '/api/admin/sendBroadcast' => ['AdminController', 'sendBroadcast'],
            '/api/admin/generateThumbnails' => ['AdminController', 'generateThumbnails'],
            '/api/admin/quarantineFile' => ['AdminController', 'quarantineFile'],
            '/api/admin/transferOwnership' => ['AdminController', 'transferOwnership'],
            '/api/admin/revokeGlobalLink' => ['AdminController', 'revokeGlobalLink'],
            '/api/admin/tiers/save' => ['AdminController', 'saveTier'],
            '/api/admin/tiers/delete' => ['AdminController', 'deleteTier'],
            '/api/admin/mimeTypes/save' => ['AdminController', 'saveMimeType'],
            '/api/admin/exportUserData' => ['AdminController', 'exportUserData'],
            '/api/admin/branding/save' => ['AdminController', 'saveBranding'],
            '/api/slideshow/create' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->create(); } },
            '/api/slideshow/autoplay' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->autoPlay(); } },
            '/api/slideshow/update' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->update(); } },
            '/api/slideshow/delete' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->delete(); } },
            '/api/slideshow/editor/save' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->save(); } },
            '/api/slideshow/editor/removeItems' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->removeItems(); } },
            '/api/slideshow/editor/lock' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->lock(); } },
            '/api/slideshow/editor/unlock' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->unlock(); } },
            '/api/slideshow/editor/snapshot' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->createSnapshot(); } },
            '/api/slideshow/editor/snapshot/restore' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->restoreSnapshot(); } },
            '/api/slideshow/editor/collaborators/add' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->addCollaborator(); } },
            '/api/slideshow/editor/collaborators/remove' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->removeCollaborator(); } },
            '/api/slideshow/editor/heartbeat' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->heartbeat(); } },
            '/api/slideshow/admin/export' => function() { if (class_exists('SlideshowEditorController')) { (new SlideshowEditorController())->export(); } },
            '/api/slideshow/play' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->getPlayData(); } },
            '/api/slideshow/analytics' => function() { if (class_exists('SlideshowController')) { (new SlideshowController())->trackAnalytics(); } },
            '/api/admin/slideshow/radios/save' => function() { if (class_exists('AdminSlideshowController')) { (new AdminSlideshowController())->saveRadio(); } },
            '/api/admin/slideshow/radios/delete' => function() { if (class_exists('AdminSlideshowController')) { (new AdminSlideshowController())->deleteRadio(); } }
        ]
    ];

    if (isset($apiRoutes[$method][$uri])) {
        $handler = $apiRoutes[$method][$uri];
        if (is_array($handler)) {
            $class = $handler[0];
            $action = $handler[1];
            (new $class())->$action();
        } else if (is_callable($handler)) {
            $handler();
        }
        exit;
    }

    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'API endpoint niet gevonden: [' . $uri . '] Method: [' . $method . ']']);
    exit;
}

// De Publieke Share URL
if (strpos($uri, '/s/') === 0) {
    $token = substr($uri, 3);
    $publicPath = __DIR__ . '/public/views/public.html';
    if (!file_exists($publicPath)) die("<h1>Configuratiefout</h1><p>De publieke weergave (public.html) is niet gevonden.</p>");
    $html = file_get_contents($publicPath);
    echo str_replace('</head>', "<script>window.shareToken = '" . htmlspecialchars($token, ENT_QUOTES) . "';</script></head>", $html);
    exit;
}

// FASE 1: De TV Speler Route
if (strpos($uri, '/play/') === 0) {
    $token = substr($uri, 6);
    $playerPath = __DIR__ . '/public/views/player.html';
    if (!file_exists($playerPath)) {
        die("<h1>Fout</h1><p>De TV speler view (player.html) is nog niet aangemaakt (komt in een latere fase).</p>");
    }
    $html = file_get_contents($playerPath);
    echo str_replace('</head>', "<script>window.slideshowToken = '" . htmlspecialchars($token, ENT_QUOTES) . "';</script></head>", $html);
    exit;
}

if ($uri === '/login' || $uri === '/register') {
    if (Auth::check()) { header('Location: /dashboard'); exit; }
    require __DIR__ . '/public/views/login.html';
    exit;
}

if ($uri === '/favicon.ico') {
    http_response_code(204);
    exit;
}

if ($uri === '/' || $uri === '/dashboard' || $uri === '/settings' || $uri === '/admin') {
    if (!Auth::check()) { header('Location: /login'); exit; }
    
    $dashboardPath = __DIR__ . '/public/views/dashboard.html';
    if (!file_exists($dashboardPath)) die("Fout: Dashboard view niet gevonden.");
    
    $userData = json_encode(Auth::user());
    $isImpersonating = Auth::isImpersonating() ? 'true' : 'false';
    
    $html = file_get_contents($dashboardPath);
    $inject = "<script>window.currentUser = $userData; window.isImpersonating = $isImpersonating;</script></head>";
    echo str_replace('</head>', $inject, $html);
    exit;
}

http_response_code(404);
echo "Pagina niet gevonden.";
exit;