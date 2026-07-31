// GET /api/health
// Liveness probe cho uptime monitor + load balancer.
// Trả { ok, ts, version, uptimeSec } trong <5ms, không đụng DB.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STARTED_AT = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}
