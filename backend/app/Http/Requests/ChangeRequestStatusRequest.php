<?php

namespace App\Http\Requests;

use App\Enums\RequestStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeRequestStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::enum(RequestStatus::class)], 'expected_version' => ['required', 'integer', 'min:1'], 'remark' => ['nullable', 'string', 'max:500']];
    }
}
