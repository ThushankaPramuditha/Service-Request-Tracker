<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceRequestFactory extends Factory
{
    public function definition(): array
    {
        return ['created_by' => User::factory(), 'title' => 'Printer needs attention',
            'description' => 'The printer is not responding to print jobs.',
            'priority' => 'MEDIUM', 'status' => 'OPEN', 'version' => 1];
    }
}
