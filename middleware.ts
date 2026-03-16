import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  if (!request.cookies.get('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', 'en')
  }
  return response
}

export const config = { matcher: ['/((?!_next|favicon|api).*)'] }
