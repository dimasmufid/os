import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { WORLD_DIMENSIONS, createScenes } from '../../lib/world/scenes'
import { useWorldEvents } from '../../lib/world/events'

export const PhaserCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const events = useWorldEvents()

  useEffect(() => {
    if (!containerRef.current || !events) {
      return
    }

    const scenes = createScenes(events)

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: WORLD_DIMENSIONS.width,
      height: WORLD_DIMENSIONS.height,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      backgroundColor: '#020617',
      pixelArt: true,
      scene: scenes,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    return () => {
      game.destroy(true)
    }
  }, [events])

  return <div ref={containerRef} className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-700" />
}
