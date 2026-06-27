import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/lib/auth';

function loginUrl(request: Request) {
  return new URL('/login', process.env.APP_URL || request.url);
}

export async function GET(request: Request) {
  return NextResponse.redirect(loginUrl(request), 303);
}

export async function POST(request: Request) {
  await destroyCurrentSession();
  return NextResponse.redirect(loginUrl(request), 303);
}
