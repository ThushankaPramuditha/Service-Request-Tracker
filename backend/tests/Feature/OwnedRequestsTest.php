<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnedRequestsTest extends TestCase
{
    use RefreshDatabase;

    public function test_unicode_character_boundaries_and_missing_required_fields(): void
    {
        $this->actingAs(User::factory()->create());
        $this->postJson('/api/requests', ['title' => str_repeat('ආ', 100), 'description' => str_repeat('ආ', 500), 'priority' => 'LOW'])
            ->assertCreated();
        $this->postJson('/api/requests', ['title' => 'abc', 'description' => '1234567890', 'priority' => 'HIGH'])->assertCreated();
        $this->postJson('/api/requests', ['title' => 'abc', 'description' => '1234567890'])->assertUnprocessable();
        $this->assertDatabaseCount('service_requests', 2);
    }

    public function test_creation_assigns_identity_and_defaults_and_rejects_invalid_input(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/requests', [
            'title' => '  Printer problem  ', 'description' => 'A detailed description.', 'priority' => 'HIGH',
            'created_by' => 999, 'status' => 'RESOLVED', 'version' => 99,
        ])->assertCreated()->assertJsonPath('data.title', 'Printer problem')
            ->assertJsonPath('data.status', 'OPEN')->assertJsonPath('data.version', 1);
        $this->assertDatabaseHas('service_requests', ['created_by' => $user->id]);
        foreach ([['title' => 'ab'], ['title' => str_repeat('x', 101)], ['description' => 'short'],
            ['description' => str_repeat('x', 501)], ['priority' => 'URGENT']] as $invalid) {
            $this->postJson('/api/requests', array_merge(['title' => 'Valid title', 'description' => 'Valid description', 'priority' => 'LOW'], $invalid))
                ->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_ERROR');
        }
        $this->assertDatabaseCount('service_requests', 1);
    }

    public function test_owner_scope_applies_to_list_detail_and_history(): void
    {
        $foreign = ServiceRequest::factory()->create();
        $this->actingAs(User::factory()->create())->getJson('/api/requests')->assertOk()->assertJsonCount(0, 'data');
        foreach (['', '/history'] as $suffix) {
            $this->getJson('/api/requests/'.$foreign->id.$suffix)->assertNotFound()->assertJsonPath('code', 'NOT_FOUND');
            $this->getJson('/api/requests/999999'.$suffix)->assertNotFound();
        }
        foreach (['0', '-1', 'abc', '99999999999999999999999999'] as $id) {
            $this->getJson('/api/requests/'.$id)->assertNotFound();
        }
        $this->actingAs($foreign->creator)->getJson('/api/requests/'.$foreign->id.'/history')->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_literal_search_combines_filters_and_pagination_is_deterministic(): void
    {
        $user = User::factory()->create();
        $rows = ServiceRequest::factory()->count(12)->create(['created_by' => $user->id, 'title' => 'Printer 50%_\\ ready', 'priority' => 'HIGH']);
        ServiceRequest::factory()->create(['created_by' => $user->id, 'title' => 'Printer 50ab ready', 'priority' => 'HIGH']);
        ServiceRequest::factory()->create(['title' => 'Printer 50%_\\ ready', 'priority' => 'HIGH']);
        $url = '/api/requests?'.http_build_query(['search' => '50%_\\', 'status' => 'OPEN', 'priority' => 'HIGH']);
        $this->actingAs($user)->getJson($url)->assertOk()->assertJsonPath('meta.total', 12)
            ->assertJsonCount(10, 'data')->assertJsonPath('data.0.id', $rows->last()->id);
        $this->getJson($url.'&page=2')->assertJsonCount(2, 'data');
        $this->getJson($url.'&per_page=25')->assertJsonCount(12, 'data');
        foreach (['per_page=26', 'per_page=0', 'page=0', 'status=BAD', 'priority=BAD', 'search='.str_repeat('x', 101)] as $query) {
            $this->getJson('/api/requests?'.$query)->assertUnprocessable();
        }
    }

    public function test_guest_business_endpoints_require_authentication(): void
    {
        $this->getJson('/api/requests')->assertUnauthorized();
        $this->postJson('/api/requests', [])->assertUnauthorized();
        $this->getJson('/api/requests/1')->assertUnauthorized();
        $this->getJson('/api/requests/1/history')->assertUnauthorized();
    }
}
