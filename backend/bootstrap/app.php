<?php

use App\Exceptions\ApiProblem;
use App\Http\Middleware\NoStore;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->api(append: [NoStore::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (Throwable $e) {
            // Exception messages/SQL bindings can contain session IDs or user input.
            Log::error('Application failure', ['exception_type' => get_class($e)]);

            return false;
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*', 'sanctum/csrf-cookie')) {
                return null;
            }
            $status = 500;
            $code = 'INTERNAL_ERROR';
            $message = 'An unexpected error occurred.';
            $errors = (object) [];
            if ($e instanceof ApiProblem) {
                [$status, $code, $message] = [$e->status, $e->errorCode, $e->getMessage()];
            } elseif ($e instanceof ValidationException) {
                [$status, $code, $message, $errors] = [422, 'VALIDATION_ERROR', 'Please check the submitted fields.', $e->errors()];
            } elseif ($e instanceof AuthenticationException) {
                [$status, $code, $message] = [401, 'UNAUTHENTICATED', 'Please sign in.'];
            } elseif ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                [$code, $message] = match ($status) {
                    404 => ['NOT_FOUND', 'Request not found.'],
                    419 => ['CSRF_TOKEN_MISMATCH', 'The security token is invalid. Reinitialize before trying again.'],
                    429 => ['TOO_MANY_ATTEMPTS', 'Too many attempts. Please wait and try again.'],
                    405 => ['METHOD_NOT_ALLOWED', 'Method not allowed.'],
                    default => ['INTERNAL_ERROR', 'An unexpected error occurred.'],
                };
                // Rendering only: the rejected request never reaches its controller.
                if ($status === 419 && $request->is('api/auth/logout', 'api/requests', 'api/requests/*')
                    && $request->hasSession() && ! Auth::guard('web')->check()) {
                    [$status, $code, $message] = [401, 'UNAUTHENTICATED', 'Please sign in.'];
                }
            }
            $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

            return response()->json(compact('message', 'code', 'errors'), $status, $headers)->header('Cache-Control', 'no-store');
        });
    })->create();
