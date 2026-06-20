import { NextResponse } from 'next/server';
import { consumeGoogleState, exchangeGoogleCode, fetchGoogleUserInfo, signInWithGoogleProfile } from '@/lib/google-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = await consumeGoogleState(url.searchParams.get('state'));
  if (!code || !next) {
    return NextResponse.redirect(new URL('/login?error=google_state', request.url));
  }

  try {
    const token = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserInfo(token.access_token);
    await signInWithGoogleProfile(profile);
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL('/login?error=google', request.url));
  }
}
