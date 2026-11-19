<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_reference_schema_matches_the_migration(): void
    {
        $reference = file_get_contents(base_path('../docs/schema.sql'));
        $start = strpos($reference, 'CREATE TABLE users');
        $ddl = trim(substr($reference, $start, strpos($reference, 'COMMIT;') - $start));
        $migration = file_get_contents(database_path('migrations/0001_01_01_000000_create_users_table.php'));
        preg_match("/<<<'SQL'\\R(.*?)\\RSQL/s", $migration, $matches);
        $this->assertSame(str_replace("\r\n", "\n", $ddl), str_replace("\r\n", "\n", trim($matches[1])));
    }

    public function test_foreign_keys_restrict_business_deletion_and_clear_session_user(): void
    {
        $row = ServiceRequest::factory()->create();
        try {
            DB::transaction(fn () => $row->creator->delete());
            $this->fail('A request owner must not be deleted.');
        } catch (QueryException $e) {
            $this->assertSame('23503', $e->errorInfo[0]);
        }
        $user = User::factory()->create();
        DB::table('sessions')->insert(['id' => 'test-only-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
        $user->delete();
        $this->assertDatabaseHas('sessions', ['id' => 'test-only-session', 'user_id' => null]);
    }

    public function test_demo_seed_is_repeatable_and_passwords_are_hashed(): void
    {
        $this->seed();
        $this->seed();
        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('service_requests', 2);
        foreach (User::all() as $user) {
            $this->assertTrue(Hash::check('DemoPassword!2026', $user->password));
            $this->assertSame(1, $user->serviceRequests()->first()->version);
        }
        $this->assertDatabaseCount('request_status_histories', 0);
    }

    public function test_database_rejects_invalid_values_without_application_validation(): void
    {
        $row = ServiceRequest::factory()->create();
        foreach (['title' => 'ab', 'description' => 'short', 'priority' => 'URGENT', 'status' => 'CLOSED', 'version' => 0] as $field => $value) {
            try {
                DB::transaction(fn () => DB::table('service_requests')->where('id', $row->id)->update([$field => $value]));
                $this->fail("Database accepted invalid $field");
            } catch (QueryException $e) {
                $this->assertSame('23514', $e->errorInfo[0]);
            }
        }
        $this->assertSame(1, $row->fresh()->version);
    }
}
