<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiProblem;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        // A request outside Sanctum's configured first-party origins has no session.
        abort_unless($request->hasSession(), 419);
        if (! Auth::guard('web')->attempt($request->validated())) {
            throw new ApiProblem(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
        }
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $request->user()->only(['id', 'name', 'email'])]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
