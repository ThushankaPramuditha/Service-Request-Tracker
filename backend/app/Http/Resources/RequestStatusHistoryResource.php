<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RequestStatusHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'service_request_id' => $this->service_request_id,
            'actor_user_id' => $this->actor_user_id, 'from_status' => $this->from_status,
            'to_status' => $this->to_status, 'remark' => $this->remark, 'created_at' => $this->created_at->toISOString()];
    }
}
