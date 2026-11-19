<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

class RequireCsrfToken extends PreventRequestForgery
{
    // This application's contract requires a token even for same-origin requests.
    protected function hasValidOrigin($request)
    {
        return false;
    }
}
