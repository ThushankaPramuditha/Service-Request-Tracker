<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_allowed_transitions_have_exactly_one_ordered_audit_entry_each(): void
    {
        $row = ServiceRequest::factory()->create();
        $this->actingAs($row->creator);
        foreach (['IN_PROGRESS', 'RESOLVED'] as $index => $status) {
            $this->patchJson("/api/requests/{$row->id}/status", ['status' => $status, 'expected_version' => $index + 1, 'remark' => '  Work completed  '])
                ->assertOk()->assertJsonPath('data.version', $index + 2)->assertJsonPath('data.status', $status);
            $this->assertDatabaseCount('request_status_histories', $index + 1);
        }
        $this->getJson("/api/requests/{$row->id}/history")->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.from_status', 'OPEN')->assertJsonPath('data.0.to_status', 'IN_PROGRESS')
            ->assertJsonPath('data.1.from_status', 'IN_PROGRESS')->assertJsonPath('data.1.to_status', 'RESOLVED')
            ->assertJsonPath('data.0.actor_user_id', $row->created_by)->assertJsonPath('data.0.remark', 'Work completed');
    }

    public function test_invalid_and_stale_updates_leave_request_and_history_unchanged(): void
    {
        $row = ServiceRequest::factory()->create();
        $this->actingAs($row->creator);
        foreach (['OPEN', 'RESOLVED'] as $status) {
            $this->patchJson("/api/requests/{$row->id}/status", ['status' => $status, 'expected_version' => 1])
                ->assertStatus(409)->assertJsonPath('code', 'INVALID_TRANSITION');
        }
        $this->assertSame(1, $row->fresh()->version);
        $this->assertDatabaseCount('request_status_histories', 0);
        $this->patchJson("/api/requests/{$row->id}/status", ['status' => 'IN_PROGRESS', 'expected_version' => 1])->assertOk();
        $snapshot = $row->fresh()->getAttributes();
        $this->patchJson("/api/requests/{$row->id}/status", ['status' => 'IN_PROGRESS', 'expected_version' => 1])
            ->assertStatus(409)->assertJsonPath('code', 'STALE_VERSION');
        foreach (['OPEN', 'IN_PROGRESS'] as $status) {
            $this->patchJson("/api/requests/{$row->id}/status", ['status' => $status, 'expected_version' => 2])->assertStatus(409);
        }
        $this->assertSame($snapshot, $row->fresh()->getAttributes());
        $this->assertDatabaseCount('request_status_histories', 1);
        $this->patchJson("/api/requests/{$row->id}/status", ['status' => 'RESOLVED', 'expected_version' => 2])->assertOk();
        foreach (['OPEN', 'IN_PROGRESS', 'RESOLVED'] as $status) {
            $this->patchJson("/api/requests/{$row->id}/status", ['status' => $status, 'expected_version' => 3])->assertStatus(409);
        }
        $this->assertSame(3, $row->fresh()->version);
        $this->assertDatabaseCount('request_status_histories', 2);
    }

    public function test_history_insert_failure_rolls_back_the_update(): void
    {
        $row = ServiceRequest::factory()->create();
        $snapshot = $row->fresh()->getAttributes();
        // A real PostgreSQL constraint failure at INSERT, after the request UPDATE.
        DB::statement('ALTER TABLE request_status_histories ADD CONSTRAINT test_reject_history CHECK (false)');
        $this->actingAs($row->creator)->patchJson("/api/requests/{$row->id}/status", ['status' => 'IN_PROGRESS', 'expected_version' => 1])
            ->assertStatus(500)->assertJsonPath('code', 'INTERNAL_ERROR');
        $this->assertSame($snapshot, $row->fresh()->getAttributes());
        $this->assertDatabaseCount('request_status_histories', 0);
    }

    public function test_status_ownership_and_validation(): void
    {
        $row = ServiceRequest::factory()->create();
        $url = "/api/requests/{$row->id}/status";
        $this->patchJson($url, [])->assertUnauthorized();
        $this->actingAs(User::factory()->create())->patchJson($url, ['status' => 'IN_PROGRESS', 'expected_version' => 1])->assertNotFound();
        $this->actingAs($row->creator);
        foreach ([['status' => 'BAD'], ['expected_version' => 0], ['expected_version' => 1.5], ['remark' => str_repeat('x', 501)]] as $bad) {
            $this->patchJson($url, array_merge(['status' => 'IN_PROGRESS', 'expected_version' => 1], $bad))->assertUnprocessable();
        }
        $this->assertSame(1, $row->fresh()->version);
        $this->assertDatabaseCount('request_status_histories', 0);
    }
}
