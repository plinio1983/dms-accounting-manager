import { NextResponse } from 'next/server';
import { createGoogleAuthorizationUrl } from '@/lib/google-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/';
  try {
    return NextResponse.redirect(await createGoogleAuthorizationUrl(next));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL('/login?error=google_config', request.url));
  }
}
