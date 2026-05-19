import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #4c6ef5, #7c3aed)',
          borderRadius: 6,
        }}
      >
        <div style={{ color: 'white', fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>BN</div>
      </div>
    ),
    { ...size }
  )
}
