<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RequestStatusHistoryResource;
use Illuminate\Http\Request;

class RequestHistoryController extends Controller
{
    public function __invoke(Request $request, string $id)
    {
        $parent = $request->user()->serviceRequests()->whereKey($id)->firstOrFail();

        return RequestStatusHistoryResource::collection($parent->histories()->orderBy('created_at')->orderBy('id')->get());
    }
}
