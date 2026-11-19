<?php

namespace App\Actions;

use App\Enums\RequestStatus;
use App\Exceptions\ApiProblem;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChangeRequestStatus
{
    public function execute(User $user, string $id, RequestStatus $target, int $expectedVersion, ?string $remark): ServiceRequest
    {
        return DB::transaction(function () use ($user, $id, $target, $expectedVersion, $remark) {
            $row = $user->serviceRequests()->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($row->version !== $expectedVersion) {
                throw new ApiProblem(409, 'STALE_VERSION', 'This request changed. Refresh before trying again.');
            }
            if ($row->status->next() !== $target) {
                throw new ApiProblem(409, 'INVALID_TRANSITION', 'This status change is not allowed.');
            }
            $from = $row->status;
            $row->status = $target;
            $row->version++;
            $row->save();
            $row->histories()->create(['actor_user_id' => $user->id, 'from_status' => $from->value,
                'to_status' => $target->value, 'remark' => $remark]);

            return $row;
        });
    }
}
