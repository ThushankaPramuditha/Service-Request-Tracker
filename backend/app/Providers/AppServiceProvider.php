<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // This first-party application accepts sessions only, never bearer tokens.
        Sanctum::getAccessTokenFromRequestUsing(fn () => null);
        RateLimiter::for('login', function (Request $request) {
            $email = is_string($request->input('email')) ? mb_strtolower(trim($request->input('email'))) : '';

            return Limit::perMinute(5)->by(hash('sha256', $email.'|'.$request->ip()));
        });
    }
}
