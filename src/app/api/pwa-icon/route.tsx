import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export function GET(request: NextRequest) {
  const size = parseInt(new URL(request.url).searchParams.get('size') ?? '192')
  const fontSize = Math.round(size * 0.38)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)',
        }}
      >
        <div style={{ color: 'white', fontSize, fontWeight: 800, letterSpacing: '-0.04em' }}>BN</div>
      </div>
    ),
    { width: size, height: size }
  )
}
