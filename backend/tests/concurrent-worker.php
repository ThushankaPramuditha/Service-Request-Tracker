<?php

use App\Actions\ChangeRequestStatus;
use App\Enums\RequestStatus;
use App\Exceptions\ApiProblem;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'pgsql' || ! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
    throw new RuntimeException('Concurrent worker requires a PostgreSQL _test database.');
}
try {
    app(ChangeRequestStatus::class)->execute(User::findOrFail($argv[1]), $argv[2], RequestStatus::IN_PROGRESS, 1, 'Concurrent check');
    echo 'SUCCESS';
} catch (ApiProblem $e) {
    echo $e->errorCode;
}
