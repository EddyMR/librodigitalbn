import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)',
        }}
      >
        <div style={{ color: 'white', fontSize: 70, fontWeight: 800, letterSpacing: '-3px' }}>BN</div>
      </div>
    ),
    { ...size }
  )
}
