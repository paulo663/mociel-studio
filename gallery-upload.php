<?php
$galleryDir = __DIR__ . '/gallery/';
$metaFile   = $galleryDir . 'meta.json';

if (!is_dir($galleryDir)) mkdir($galleryDir, 0755, true);

$meta = file_exists($metaFile) ? (json_decode(file_get_contents($metaFile), true) ?? []) : [];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

$action = $_REQUEST['action'] ?? 'list';

// ── LIST ──────────────────────────────────────────
if ($action === 'list') {
    $images = [];
    foreach ($meta as $filename => $data) {
        if (file_exists($galleryDir . $filename)) {
            $images[] = [
                'filename' => $filename,
                'url'      => 'gallery/' . $filename,
                'category' => $data['category'] ?? 'cabello',
                'label'    => $data['label']    ?? '',
                'size'     => $data['size']     ?? 'normal',
            ];
        }
    }
    echo json_encode(['images' => $images]);

// ── UPLOAD ────────────────────────────────────────
} elseif ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_FILES['photo'])) {
        echo json_encode(['error' => 'Sin archivo']); exit;
    }

    $file  = $_FILES['photo'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $exts  = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];

    if (!isset($exts[$mime])) {
        echo json_encode(['error' => 'Solo se permiten imágenes JPG, PNG, WEBP o GIF']); exit;
    }

    $filename = uniqid('img_') . '.' . $exts[$mime];

    if (move_uploaded_file($file['tmp_name'], $galleryDir . $filename)) {
        $meta[$filename] = [
            'category' => htmlspecialchars($_POST['category'] ?? 'cabello', ENT_QUOTES),
            'label'    => htmlspecialchars($_POST['label']    ?? '',         ENT_QUOTES),
            'size'     => in_array($_POST['size'] ?? '', ['tall']) ? 'tall' : 'normal',
            'uploaded' => date('Y-m-d H:i:s'),
        ];
        file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['success' => true, 'filename' => $filename, 'url' => 'gallery/' . $filename]);
    } else {
        echo json_encode(['error' => 'No se pudo guardar el archivo']);
    }

// ── DELETE ────────────────────────────────────────
} elseif ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $filename = basename($_POST['filename'] ?? '');

    if (!$filename || !isset($meta[$filename])) {
        echo json_encode(['error' => 'Archivo no encontrado']); exit;
    }

    $filepath = $galleryDir . $filename;
    if (file_exists($filepath)) unlink($filepath);

    unset($meta[$filename]);
    file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);

} else {
    echo json_encode(['error' => 'Acción no válida']);
}
