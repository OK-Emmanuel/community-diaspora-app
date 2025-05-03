import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Mark the route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check cookies (NOTE: Only use in development environment)
 */
export async function GET() {
  // Only enable in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()

    // Get Supabase session cookie
    const supabaseAuthCookie = cookieStore.get('sb-auth-token')

    // Create a safe response that doesn't expose sensitive information
    const cookieInfo = allCookies.map(cookie => ({
      name: cookie.name,
      valuePreview: cookie.name.includes('auth') ?
        `${cookie.value.substring(0, 15)}...` :
        `Length: ${cookie.value.length}`
    }))

    // Extract basic user info if available
    let userInfo = null
    if (supabaseAuthCookie) {
      try {
        const session = JSON.parse(supabaseAuthCookie.value)
        if (session && session.user) {
          userInfo = {
            id: session.user.id,
            email: session.user.email,
            aud: session.user.aud,
            role: session.user.role,
            expires_at: session.expires_at,
          }
        }
      } catch (e) {
        console.error('Failed to parse session cookie:', e)
      }
    }

    return NextResponse.json({
      cookies: cookieInfo,
      cookieCount: allCookies.length,
      hasAuthCookie: !!supabaseAuthCookie,
      userInfo
    })
  } catch (error) {
    console.error('Error in debug-cookies route:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
