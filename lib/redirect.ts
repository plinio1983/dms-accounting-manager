import { NextResponse } from 'next/server';

export function redirectToPath(path: string, status = 303) {
  return new NextResponse(null, {
    status,
    headers: { Location: path }
  });
}
