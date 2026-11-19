<?php

namespace App\Enums;

enum RequestStatus: string
{
    case OPEN = 'OPEN';
    case IN_PROGRESS = 'IN_PROGRESS';
    case RESOLVED = 'RESOLVED';

    public function next(): ?self
    {
        return match ($this) {
            self::OPEN => self::IN_PROGRESS,
            self::IN_PROGRESS => self::RESOLVED,
            self::RESOLVED => null,
        };
    }
}
