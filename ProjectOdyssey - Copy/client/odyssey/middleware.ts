import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for the "token" cookie
    const token = request.cookies.get('token')?.value;

    // If no token exists, redirect to login
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If token exists, allow the request
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/profile/:path*',
        '/trip/:path*',
        '/admin/:path*',
        '/co-travellers/:path*',
        // Add other protected routes here
    ],
};
