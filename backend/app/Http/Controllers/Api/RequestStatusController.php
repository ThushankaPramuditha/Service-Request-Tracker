<?php

namespace App\Http\Controllers\Api;

use App\Actions\ChangeRequestStatus;
use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeRequestStatusRequest;
use App\Http\Resources\ServiceRequestResource;

class RequestStatusController extends Controller
{
    public function __invoke(ChangeRequestStatusRequest $request, string $id, ChangeRequestStatus $action)
    {
        $data = $request->validated();

        return new ServiceRequestResource($action->execute($request->user(), $id,
            RequestStatus::from($data['status']), (int) $data['expected_version'], $data['remark'] ?? null));
    }
}
