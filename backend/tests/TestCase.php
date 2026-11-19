<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        if ($app['config']['database.default'] !== 'pgsql'
            || ! $app->environment('testing')
            || ! str_ends_with($app['db']->connection()->getDatabaseName(), '_test')) {
            throw new \RuntimeException('Tests require a dedicated PostgreSQL database ending in _test.');
        }

        return $app;
    }
}
