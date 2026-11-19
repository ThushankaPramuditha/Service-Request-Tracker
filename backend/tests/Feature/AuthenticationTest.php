<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:3000');
        $this->withCredentials();
    }

    public function test_real_credentials_me_and_logout_use_database_session(): void
    {
        $user = User::factory()->create(['email' => 'alex@example.test', 'password' => 'correct password']);
        $this->postJson('/api/auth/login', ['email' => ' ALEX@example.test ', 'password' => 'correct password'])
            ->assertOk()->assertJsonPath('data.id', $user->id)->assertJsonMissingPath('data.password');
        $this->assertTrue(DB::table('sessions')->where('user_id', $user->id)->exists());
        $sessionId = session()->getId();
        $this->withCookie(config('session.cookie'), $sessionId);
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.email', 'alex@example.test');
        Auth::forgetGuards();
        $this->postJson('/api/auth/logout')->assertNoContent();
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
        $this->assertFalse(DB::table('sessions')->where('id', $sessionId)->exists());
    }

    public function test_bad_credentials_and_guest_responses_are_consistent(): void
    {
        User::factory()->create(['email' => 'alex@example.test', 'password' => 'correct password']);
        $this->postJson('/api/auth/login', ['email' => 'alex@example.test', 'password' => 'wrong'])
            ->assertUnauthorized()->assertJsonPath('code', 'INVALID_CREDENTIALS');
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->postJson('/api/auth/logout')->assertUnauthorized();
        $this->postJson('/api/auth/login', [])->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_login_is_throttled(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'nobody@example.test', 'password' => 'wrong'])->assertUnauthorized();
        }
        $this->postJson('/api/auth/login', ['email' => 'nobody@example.test', 'password' => 'wrong'])
            ->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_ATTEMPTS');
    }

    public function test_bearer_tokens_and_non_stateful_login_cannot_authenticate(): void
    {
        $this->withHeader('Authorization', 'Bearer 1|not-a-session')->getJson('/api/auth/me')
            ->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
        $this->withHeader('Origin', 'https://unrelated.example')->postJson('/api/auth/login', [
            'email' => 'alex@example.test', 'password' => 'DemoPassword!2026',
        ])->assertStatus(419)->assertJsonPath('code', 'CSRF_TOKEN_MISMATCH');
    }
}
