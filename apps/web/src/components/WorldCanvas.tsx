import { useEffect, useRef } from 'react'

import type { FocusRoom } from '@os/types'

type RoomKey = FocusRoom

interface WorldCanvasProps {
  lockMovement: boolean
  glowSignal: number
  onRoomChange: (room: RoomKey) => void
}

const WORLD_WIDTH = 960
const WORLD_HEIGHT = 720
const HERO_SPEED = 220

export function WorldCanvas({ lockMovement, glowSignal, onRoomChange }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pressedKeysRef = useRef(new Set<string>())
  const heroRef = useRef({ x: 0, y: 0, radius: 18 })
  const currentRoomRef = useRef<RoomKey>('plaza')
  const glowRef = useRef(0)
  const lockRef = useRef(lockMovement)

  useEffect(() => {
    lockRef.current = lockMovement
    if (lockMovement) {
      pressedKeysRef.current.clear()
    }
  }, [lockMovement])

  useEffect(() => {
    glowRef.current = 1
  }, [glowSignal])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resize()
    window.addEventListener('resize', resize)

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.key.toLowerCase())
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const rooms = [
      { key: 'plaza' as RoomKey, x: -160, y: -120, width: 320, height: 240, color: '#1e293b' },
      { key: 'study' as RoomKey, x: -420, y: -120, width: 200, height: 200, color: '#3b82f6' },
      { key: 'build' as RoomKey, x: 220, y: -120, width: 200, height: 200, color: '#9333ea' },
      { key: 'training' as RoomKey, x: -160, y: -300, width: 320, height: 140, color: '#f97316' },
    ]

    let animationId: number
    let lastTime = performance.now()

    const toScreen = (value: number, axis: 'x' | 'y') => {
      if (axis === 'x') {
        return canvas.width / 2 + value
      }
      return canvas.height / 2 + value
    }

    const clampHero = () => {
      const halfWidth = WORLD_WIDTH / 2 - heroRef.current.radius
      const halfHeight = WORLD_HEIGHT / 2 - heroRef.current.radius
      heroRef.current.x = Math.max(-halfWidth, Math.min(halfWidth, heroRef.current.x))
      heroRef.current.y = Math.max(-halfHeight, Math.min(halfHeight, heroRef.current.y))
    }

    const detectRoom = () => {
      const { x, y } = heroRef.current
      let room: RoomKey = 'plaza'
      for (const zone of rooms) {
        if (zone.key === 'plaza') continue
        if (
          x >= zone.x &&
          x <= zone.x + zone.width &&
          y >= zone.y &&
          y <= zone.y + zone.height
        ) {
          room = zone.key
          break
        }
      }
      if (room !== currentRoomRef.current) {
        currentRoomRef.current = room
        onRoomChange(room)
      }
    }

    const renderRoom = (room: (typeof rooms)[number], alpha: number) => {
      context.fillStyle = room.color
      context.globalAlpha = alpha
      context.fillRect(
        toScreen(room.x, 'x'),
        toScreen(room.y, 'y'),
        room.width,
        room.height,
      )
      context.globalAlpha = 1
      context.fillStyle = 'rgba(255,255,255,0.8)'
      context.font = '16px Inter'
      context.textAlign = 'center'
      context.fillText(
        room.key === 'plaza'
          ? 'Central Plaza'
          : room.key === 'study'
            ? 'Study Room'
            : room.key === 'build'
              ? 'Build Room'
              : 'Training Grounds',
        toScreen(room.x + room.width / 2, 'x'),
        toScreen(room.y + room.height / 2, 'y'),
      )
    }

    const step = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      const pressed = pressedKeysRef.current
      if (!lockRef.current) {
        let moveX = 0
        let moveY = 0
        if (pressed.has('arrowleft') || pressed.has('a')) moveX -= 1
        if (pressed.has('arrowright') || pressed.has('d')) moveX += 1
        if (pressed.has('arrowup') || pressed.has('w')) moveY -= 1
        if (pressed.has('arrowdown') || pressed.has('s')) moveY += 1

        const magnitude = Math.hypot(moveX, moveY)
        if (magnitude > 0) {
          heroRef.current.x += (moveX / magnitude) * HERO_SPEED * delta
          heroRef.current.y += (moveY / magnitude) * HERO_SPEED * delta
          clampHero()
        }
      }

      detectRoom()

      context.fillStyle = '#020617'
      context.fillRect(0, 0, canvas.width, canvas.height)

      rooms.forEach((room) => {
        const alpha = room.key === 'plaza' ? 0.6 : 0.4
        renderRoom(room, alpha)
      })

      const glowStrength = glowRef.current > 0 ? Math.sin(glowRef.current * Math.PI) : 0
      if (glowRef.current > 0) {
        glowRef.current = Math.max(0, glowRef.current - delta * 1.5)
      }

      context.beginPath()
      context.fillStyle = `rgba(56, 189, 248, ${0.8 + glowStrength * 0.2})`
      context.arc(
        toScreen(heroRef.current.x, 'x'),
        toScreen(heroRef.current.y, 'y'),
        heroRef.current.radius * (1 + glowStrength * 0.2),
        0,
        Math.PI * 2,
      )
      context.fill()

      animationId = requestAnimationFrame(step)
    }

    animationId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onRoomChange])

  return <canvas ref={canvasRef} className="h-full w-full" />
}
