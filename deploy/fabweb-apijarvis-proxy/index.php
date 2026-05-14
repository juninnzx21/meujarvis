<?php
declare(strict_types=1);

$allowedOrigin = 'https://jarvis.juninnzxtec.com.br';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$query = parse_url($requestUri, PHP_URL_QUERY);

if (!str_starts_with($path, '/api')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'app' => 'jarvis-api-proxy',
        'status' => 'ok',
        'target' => 'vps',
    ]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Proxy PHP sem cURL disponivel. Aguarde propagacao DNS do apijarvis.']);
    exit;
}

$target = 'https://apijarvis.juninnzxtec.com.br' . $path . ($query ? "?{$query}" : '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

$headers = ['Accept: application/json'];
if (!empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RESOLVE => ['apijarvis.juninnzxtec.com.br:443:45.76.251.177'],
]);

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    $message = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Falha ao encaminhar para API do JARVIS.', 'error' => $message]);
    exit;
}

$statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($statusCode ?: 502);

foreach (explode("\r\n", $rawHeaders) as $headerLine) {
    if (!str_contains($headerLine, ':')) {
        continue;
    }
    [$name, $value] = array_map('trim', explode(':', $headerLine, 2));
    $lower = strtolower($name);
    if (in_array($lower, ['content-type', 'cache-control', 'etag'], true)) {
        header("{$name}: {$value}");
    }
}

echo $responseBody;
