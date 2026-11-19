<?php

$origin = env('FRONTEND_URL', 'http://localhost:3000');
if (! is_string($origin) || ! preg_match('#^https?://[a-zA-Z0-9.-]+(?::[0-9]+)?$#D', $origin)) {
    throw new RuntimeException('FRONTEND_URL must be an exact HTTP(S) origin.');
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PATCH', 'OPTIONS'],
    'allowed_origins' => [$origin],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-XSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
