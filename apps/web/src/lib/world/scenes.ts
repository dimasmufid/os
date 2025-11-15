import Phaser from 'phaser'

import type { WorldEvents } from './events'
import type { RoomKey, WorldState } from '@os/types'

const TILE_SIZE = 48
const MAP_WIDTH = 22
const MAP_HEIGHT = 14

const createTileData = () => {
  const rows: Array<Array<number>> = []

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    const row: Array<number> = []

    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const isBorder = y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1
      row.push(isBorder ? 1 : 0)
    }

    rows.push(row)
  }

  // Decorative pillars between rooms
  const dividerColumn = Math.floor(MAP_WIDTH / 2)

  for (let y = 3; y < MAP_HEIGHT - 3; y += 1) {
    if (y === Math.floor(MAP_HEIGHT / 2)) {
      continue
    }

    rows[y][dividerColumn] = 1
  }

  return rows
}

const TILE_MAP_DATA = createTileData()

const ROOM_ZONES: Array<{ key: RoomKey; rect: Phaser.Geom.Rectangle; label: string }> = [
  {
    key: 'study',
    rect: new Phaser.Geom.Rectangle(2 * TILE_SIZE, 2 * TILE_SIZE, 6 * TILE_SIZE, 4 * TILE_SIZE),
    label: 'Study Hall',
  },
  {
    key: 'build',
    rect: new Phaser.Geom.Rectangle(
      (MAP_WIDTH / 2 + 1) * TILE_SIZE,
      2 * TILE_SIZE,
      6 * TILE_SIZE,
      4 * TILE_SIZE,
    ),
    label: 'Build Atelier',
  },
  {
    key: 'training',
    rect: new Phaser.Geom.Rectangle(4 * TILE_SIZE, 8 * TILE_SIZE, 10 * TILE_SIZE, 4 * TILE_SIZE),
    label: 'Training Grounds',
  },
]

const createHeroTexture = (scene: Phaser.Scene) => {
  const width = 96
  const height = 48
  const canvasTexture = scene.textures.createCanvas('hero-sheet', width, height)
  const ctx = canvasTexture.context

  const drawHero = (offsetX: number, color: string, accent: string) => {
    ctx.fillStyle = '#2b2d42'
    ctx.fillRect(offsetX + 10, 8, 28, 32)
    ctx.fillStyle = color
    ctx.fillRect(offsetX + 14, 12, 20, 20)
    ctx.fillStyle = accent
    ctx.fillRect(offsetX + 14, 28, 20, 10)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(offsetX + 18, 18, 4, 4)
    ctx.fillRect(offsetX + 24, 18, 4, 4)
  }

  drawHero(0, '#38bdf8', '#0ea5e9')
  drawHero(32, '#4ade80', '#16a34a')
  drawHero(64, '#a855f7', '#7c3aed')

  canvasTexture.refresh()
}

const createTileTextures = (scene: Phaser.Scene) => {
  const texture = scene.textures.createCanvas('world-tiles', TILE_SIZE * 2, TILE_SIZE)
  const ctx = texture.context

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE)

  texture.refresh()
}

class BootScene extends Phaser.Scene {
  constructor(private readonly events: WorldEvents) {
    super('boot')
  }

  preload() {
    createTileTextures(this)
    createHeroTexture(this)
  }

  create() {
    this.scene.start('world', { events: this.events })
  }
}

type DecorationMap = Record<'study' | 'build' | 'training', Array<Phaser.GameObjects.GameObject>>

class WorldScene extends Phaser.Scene {
  private hero!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys &
    Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private movementLocked = false
  private currentRoom: string | null = null
  private events!: WorldEvents
  private worldState: WorldState | null = null
  private decorations: DecorationMap = { study: [], build: [], training: [] }

  constructor(private readonly sharedEvents: WorldEvents) {
    super('world')
  }

  init(data: { events?: WorldEvents }) {
    this.events = data.events ?? this.sharedEvents
  }

  create() {
    const map = this.make.tilemap({
      data: TILE_MAP_DATA,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    })

    const tileset = map.addTilesetImage('world-tiles', 'world-tiles', TILE_SIZE, TILE_SIZE, 0, 0)
    const layer = map.createLayer(0, tileset, 0, 0)

    layer.setCollision(1)

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    this.hero = this.physics.add.sprite(map.widthInPixels / 2, map.heightInPixels / 2, 'hero-sheet', 0)
    this.hero.setCollideWorldBounds(true)
    this.hero.setSize(24, 30)
    this.hero.setOffset(4, 10)

    this.physics.add.collider(this.hero, layer)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1)

    this.cursors = this.input.keyboard.addKeys<
      Phaser.Types.Input.Keyboard.CursorKeys &
        Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
    >({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    })

    this.createAnimations()
    this.createRoomLabels()
    this.createDecorations()

    this.hero.play('hero-idle')

    this.events.on('session:lock', this.handleLock, this)
    this.events.on('session:unlock', this.handleUnlock, this)
    this.events.on('world:update', this.handleWorldUpdate, this)

    this.events.once('session:unlock', () => this.hero.play('hero-idle'))

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('session:lock', this.handleLock, this)
      this.events.off('session:unlock', this.handleUnlock, this)
      this.events.off('world:update', this.handleWorldUpdate, this)
    })
  }

  update() {
    if (!this.hero) {
      return
    }

    if (this.movementLocked) {
      this.hero.setVelocity(0, 0)
      this.hero.play('hero-idle', true)
      return
    }

    const input = {
      left: this.cursors.left?.isDown || this.cursors.a?.isDown,
      right: this.cursors.right?.isDown || this.cursors.d?.isDown,
      up: this.cursors.up?.isDown || this.cursors.w?.isDown,
      down: this.cursors.down?.isDown || this.cursors.s?.isDown,
    }

    let velocityX = 0
    let velocityY = 0

    if (input.left) velocityX -= 1
    if (input.right) velocityX += 1
    if (input.up) velocityY -= 1
    if (input.down) velocityY += 1

    const length = Math.hypot(velocityX, velocityY)
    const speed = 180

    if (length > 0) {
      velocityX = (velocityX / length) * speed
      velocityY = (velocityY / length) * speed
      this.hero.setVelocity(velocityX, velocityY)
      this.hero.play('hero-walk', true)
      if (velocityX !== 0) {
        this.hero.setFlipX(velocityX < 0)
      }
    } else {
      this.hero.setVelocity(0, 0)
      this.hero.play('hero-idle', true)
    }

    this.checkRooms()
  }

  private handleWorldUpdate = (world: WorldState) => {
    this.worldState = world
    this.updateDecorations()
  }

  private createDecorations() {
    this.decorations.study = [
      this.add.rectangle(3.5 * TILE_SIZE, 3.5 * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0x38bdf8, 0.3).setVisible(false),
      this.add.circle(6.5 * TILE_SIZE, 4.5 * TILE_SIZE, 16, 0xbae6fd, 0.4).setVisible(false),
    ]

    this.decorations.build = [
      this.add.rectangle(
        (MAP_WIDTH / 2 + 3) * TILE_SIZE,
        3 * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        0x22c55e,
        0.25,
      ).setVisible(false),
      this.add.triangle(
        (MAP_WIDTH / 2 + 5) * TILE_SIZE,
        4 * TILE_SIZE,
        0,
        48,
        32,
        0,
        64,
        48,
        0x16a34a,
        0.35,
      ).setVisible(false),
    ]

    this.decorations.training = [
      this.add.rectangle(5 * TILE_SIZE, 9.5 * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0xf97316, 0.25).setVisible(false),
      this.add.rectangle(11 * TILE_SIZE, 10.5 * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0xf59e0b, 0.25).setVisible(false),
    ]
  }

  private updateDecorations() {
    if (!this.worldState) {
      return
    }

    const showStudy = this.worldState.studyRoomLevel > 1
    const showBuild = this.worldState.buildRoomLevel > 1
    const showPlaza = this.worldState.plazaLevel > 1

    this.decorations.study.forEach((item) => item.setVisible(showStudy))
    this.decorations.build.forEach((item) => item.setVisible(showBuild))
    this.decorations.training.forEach((item) => item.setVisible(showPlaza))
  }

  private createRoomLabels() {
    ROOM_ZONES.forEach((room) => {
      const label = this.add.text(
        room.rect.centerX,
        room.rect.y - 12,
        room.label,
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: '18px',
          color: '#cbd5f5',
        },
      )
      label.setOrigin(0.5, 1)
      label.setAlpha(0.7)
    })
  }

  private handleLock = () => {
    this.movementLocked = true
    this.hero.setVelocity(0, 0)
  }

  private handleUnlock = () => {
    this.movementLocked = false
  }

  private checkRooms() {
    const heroPoint = new Phaser.Geom.Point(this.hero.x, this.hero.y)
    const room = ROOM_ZONES.find((entry) => entry.rect.contains(heroPoint.x, heroPoint.y))

    if (room && room.key !== this.currentRoom) {
      this.currentRoom = room.key
      this.events.emit('room:entered', room.key)
    }

    if (!room && this.currentRoom) {
      this.events.emit('room:left')
      this.currentRoom = null
    }
  }

  private createAnimations() {
    if (!this.anims.exists('hero-idle')) {
      this.anims.create({
        key: 'hero-idle',
        frames: this.anims.generateFrameNumbers('hero-sheet', { frames: [0, 1] }),
        frameRate: 2,
        repeat: -1,
      })
    }

    if (!this.anims.exists('hero-walk')) {
      this.anims.create({
        key: 'hero-walk',
        frames: this.anims.generateFrameNumbers('hero-sheet', { frames: [1, 2] }),
        frameRate: 6,
        repeat: -1,
      })
    }
  }
}

export const createScenes = (events: WorldEvents) => [
  new BootScene(events),
  new WorldScene(events),
]

export const WORLD_DIMENSIONS = {
  width: MAP_WIDTH * TILE_SIZE,
  height: MAP_HEIGHT * TILE_SIZE,
}
