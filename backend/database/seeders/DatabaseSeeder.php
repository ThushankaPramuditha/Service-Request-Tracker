<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo seeding is only permitted locally or in tests.');
        }
        foreach (['alex' => 'Alex Morgan', 'sam' => 'Sam Patel'] as $name => $fullName) {
            $user = User::firstOrCreate(['email' => "$name@example.test"], [
                'name' => $fullName, 'password' => Hash::make('DemoPassword!2026'),
            ]);
            $user->serviceRequests()->firstOrCreate(['title' => 'Office printer needs attention'], [
                'description' => 'The office printer stops responding when printing documents.',
                'priority' => 'MEDIUM', 'status' => 'OPEN', 'version' => 1,
            ]);
        }
    }
}
