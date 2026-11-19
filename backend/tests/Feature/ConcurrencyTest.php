<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_independent_processes_wait_for_lock_then_only_one_commits(): void
    {
        $row = ServiceRequest::factory()->create();
        $connection = config('database.connections.pgsql');
        $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql', 'DB_DATABASE' => $connection['database'],
            'DB_HOST' => $connection['host'], 'DB_PORT' => (string) $connection['port'],
            'DB_USERNAME' => $connection['username'], 'DB_PASSWORD' => $connection['password'] ?? ''];
        $workers = [];
        DB::beginTransaction();
        try {
            DB::table('service_requests')->where('id', $row->id)->lockForUpdate()->first();
            for ($i = 0; $i < 2; $i++) {
                $worker = new Process([PHP_BINARY, base_path('tests/concurrent-worker.php'), (string) $row->created_by, (string) $row->id], base_path(), $env);
                $worker->setTimeout(30)->start();
                $workers[] = $worker;
            }
            $deadline = microtime(true) + 20;
            do {
                $waiting = DB::selectOne("SELECT count(*) AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%service_requests%' ")->n;
                if ((int) $waiting >= 2) {
                    break;
                }
                usleep(100000);
                DB::select('SELECT pg_stat_clear_snapshot()');
            } while (microtime(true) < $deadline);
            $this->assertGreaterThanOrEqual(2, (int) $waiting, 'Both independent connections must contend on the locked row.');
            DB::commit();
            $results = [];
            foreach ($workers as $worker) {
                $worker->wait();
                $this->assertTrue($worker->isSuccessful(), $worker->getErrorOutput());
                $results[] = trim($worker->getOutput());
            }
            sort($results);
            $this->assertSame(['STALE_VERSION', 'SUCCESS'], $results);
            $this->assertSame(2, $row->fresh()->version);
            $this->assertDatabaseCount('request_status_histories', 1);
        } finally {
            if (DB::transactionLevel()) {
                DB::rollBack();
            }
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
        }
    }
}
