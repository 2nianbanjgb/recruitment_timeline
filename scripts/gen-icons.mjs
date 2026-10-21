import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', 'public')
const SS = 4

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const rad = degrees => (degrees * Math.PI) / 180
const mix = (a, b, t) => a + (b - a) * t

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function insideRoundedSquare(x, y, radius) {
  const dx = Math.max(radius - x, 0, x - (1 - radius))
  const dy = Math.max(radius - y, 0, y - (1 - radius))
  return dx * dx + dy * dy <= radius * radius
}

function isInk(x, y) {
  const center = 0.5
  const distance = Math.hypot(x - center, y - center)
  if (distance <= 0.288 && distance >= 0.236) return true
  if (distance <= 0.034) return true

  const hourEnd = [
    center + Math.sin(rad(305)) * 0.148,
    center - Math.cos(rad(305)) * 0.148,
  ]
  const minuteEnd = [
    center + Math.sin(rad(60)) * 0.198,
    center - Math.cos(rad(60)) * 0.198,
  ]

  if (segmentDistance(x, y, center, center, hourEnd[0], hourEnd[1]) <= 0.03) return true
  if (segmentDistance(x, y, center, center, minuteEnd[0], minuteEnd[1]) <= 0.03) return true
  return false
}

function render(size, maskable) {
  const hi = size * SS
  const pixels = new Float32Array(hi * hi * 4)
  const contentScale = maskable ? 0.76 : 1
  const cornerRadius = maskable ? 0 : 0.22

  for (let py = 0; py < hi; py += 1) {
    const y = (py + 0.5) / hi
    for (let px = 0; px < hi; px += 1) {
      const x = (px + 0.5) / hi
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      const visible = maskable || insideRoundedSquare(x, y, cornerRadius)
      if (visible) {
        const t = Math.min(1, Math.max(0, x * 0.45 + y * 0.55))
        r = mix(0x63, 0xa8, t)
        g = mix(0x66, 0x55, t)
        b = mix(0xf1, 0xf7, t)

        const glow = Math.max(0, 1 - Math.hypot(x - 0.16, y - 0.1) / 0.6)
        r = Math.min(255, r + glow * 24)
        g = Math.min(255, g + glow * 24)
        b = Math.min(255, b + glow * 30)

        const localX = (x - 0.5) / contentScale + 0.5
        const localY = (y - 0.5) / contentScale + 0.5
        if (isInk(localX, localY)) {
          r = 255
          g = 255
          b = 255
        }
        a = 1
      }

      const index = (py * hi + px) * 4
      pixels[index] = r
      pixels[index + 1] = g
      pixels[index + 2] = b
      pixels[index + 3] = a * 255
    }
  }

  const out = Buffer.alloc(size * size * 4)
  const samples = SS * SS
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sumR = 0
      let sumG = 0
      let sumB = 0
      let sumA = 0
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const index = ((y * SS + dy) * hi + (x * SS + dx)) * 4
          const alpha = pixels[index + 3] / 255
          sumR += pixels[index] * alpha
          sumG += pixels[index + 1] * alpha
          sumB += pixels[index + 2] * alpha
          sumA += alpha
        }
      }
      const outIndex = (y * size + x) * 4
      if (sumA > 0) {
        out[outIndex] = Math.round(sumR / sumA)
        out[outIndex + 1] = Math.round(sumG / sumA)
        out[outIndex + 2] = Math.round(sumB / sumA)
      }
      out[outIndex + 3] = Math.round((sumA / samples) * 255)
    }
  }

  return encodePng(size, out)
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
]

for (const target of targets) {
  const png = render(target.size, target.maskable)
  writeFileSync(join(OUT_DIR, target.file), png)
  console.log(`generated public/${target.file} (${target.size}px, ${png.length} bytes)`)
}
