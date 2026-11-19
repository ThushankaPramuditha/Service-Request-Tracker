<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RequestHistoryController;
use App\Http\Controllers\Api\RequestStatusController;
use App\Http\Controllers\Api\ServiceRequestController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::middleware('auth:sanctum')->group(function () {
    Route::patch('requests/{id}/status', RequestStatusController::class)->where('id', '[1-9][0-9]{0,17}');
    Route::get('requests', [ServiceRequestController::class, 'index']);
    Route::post('requests', [ServiceRequestController::class, 'store']);
    Route::get('requests/{id}', [ServiceRequestController::class, 'show'])->where('id', '[1-9][0-9]{0,17}');
    Route::get('requests/{id}/history', RequestHistoryController::class)->where('id', '[1-9][0-9]{0,17}');
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
});
