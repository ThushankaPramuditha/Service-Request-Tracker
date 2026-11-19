<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListServiceRequests;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Resources\ServiceRequestResource;
use Illuminate\Http\Request;

class ServiceRequestController extends Controller
{
    public function index(ListServiceRequests $request)
    {
        $data = $request->validated();
        $query = $request->user()->serviceRequests();
        if (($data['search'] ?? '') !== '') {
            $literal = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $data['search']);
            $query->where('title', 'ilike', '%'.$literal.'%');
        }
        foreach (['status', 'priority'] as $field) {
            if (! empty($data[$field])) {
                $query->where($field, $data[$field]);
            }
        }

        return ServiceRequestResource::collection($query->orderByDesc('created_at')->orderByDesc('id')
            ->paginate($data['per_page'] ?? 10)->withQueryString());
    }

    public function store(StoreServiceRequest $request)
    {
        return (new ServiceRequestResource($request->user()->serviceRequests()->create([
            ...$request->validated(), 'status' => 'OPEN', 'version' => 1,
        ])))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        return new ServiceRequestResource($request->user()->serviceRequests()->whereKey($id)->firstOrFail());
    }
}
