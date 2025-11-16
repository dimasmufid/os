"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

import { RoomName } from "@/types/lifeos";

interface GameCanvasProps {
  heroSignature: string;
  movementLocked: boolean;
  onRoomChange?: (room: RoomName | null) => void;
}

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "boot" });
  }

  preload() {
    const graphics = this.add.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 14);
    graphics.generateTexture("hero", 32, 32);
    graphics.destroy();
  }

  create() {
    this.scene.start("world");
  }
}

type ZoneDefinition = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

class LifeOSWorldScene extends Phaser.Scene {
  private eventBridge: Phaser.Events.EventEmitter;
  private hero!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: ControlKeys;
  private movementLocked = false;
  private currentRoom: RoomName | null = null;
  private heroSignature = "";
  private roomRects: Map<RoomName, Phaser.GameObjects.Rectangle> = new Map();
  private roomBounds: Map<RoomName, Phaser.Geom.Rectangle> = new Map();
  private roomLabels: Map<RoomName, Phaser.GameObjects.Text> = new Map();

  private readonly zones: Record<RoomName, ZoneDefinition> = {
    study: { x: 0.2, y: 0.6, w: 0.28, h: 0.32, label: "Study Room" },
    build: { x: 0.75, y: 0.35, w: 0.28, h: 0.32, label: "Build Room" },
    training: { x: 0.75, y: 0.75, w: 0.28, h: 0.32, label: "Training Room" },
  };

  constructor(eventBridge: Phaser.Events.EventEmitter) {
    super({ key: "world" });
    this.eventBridge = eventBridge;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.add
      .rectangle(width / 2, height / 2, width * 0.9, height * 0.9, 0x0f172a)
      .setStrokeStyle(2, 0x1d4ed8, 0.4);
    this.add
      .text(width / 2, height * 0.1, "LifeOS Plaza", {
        fontSize: "24px",
        color: "#bfdbfe",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.physics.world.setBounds(0, 0, width, height);
    this.hero = this.physics.add.sprite(width / 2, height / 2, "hero");
    this.hero.setCollideWorldBounds(true);
    this.hero.setScale(1.15);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as ControlKeys;

    Object.entries(this.zones).forEach(([room, zone]) => {
      const rect = this.add
        .rectangle(0, 0, 10, 10, 0x172554, 0.75)
        .setStrokeStyle(2, 0x2563eb, 0.7);
      rect.setData("room", room);
      this.roomRects.set(room as RoomName, rect);

      const label = this.add
        .text(0, 0, zone.label, {
          fontSize: "16px",
          color: "#93c5fd",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.roomLabels.set(room as RoomName, label);
    });

    this.handleResize(width, height);
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.handleResize(gameSize.width, gameSize.height);
    });
  }

  update() {
    if (!this.hero.body) {
      return;
    }

    const speed = 240;
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    if (!this.movementLocked) {
      if (this.cursors.left?.isDown || this.keys.a.isDown) {
        body.setVelocityX(-speed);
      } else if (this.cursors.right?.isDown || this.keys.d.isDown) {
        body.setVelocityX(speed);
      }

      if (this.cursors.up?.isDown || this.keys.w.isDown) {
        body.setVelocityY(-speed);
      } else if (this.cursors.down?.isDown || this.keys.s.isDown) {
        body.setVelocityY(speed);
      }

      if (body.velocity.lengthSq() > 0) {
        body.velocity.normalize().scale(speed);
      }
    }

    this.detectRoom();
  }

  setMovementLocked(lock: boolean) {
    this.movementLocked = lock;
  }

  updateHeroStyle(signature: string) {
    if (!this.hero || this.heroSignature === signature) {
      return;
    }
    this.heroSignature = signature;
    const hash = signature
      .split("")
      .reduce((acc, char) => (acc + char.charCodeAt(0)) % 360, 120);
    const color = Phaser.Display.Color.HSVToRGB(hash / 360, 0.55, 1);
    this.hero.setTint(color.color);
  }

  handleResize(width: number, height: number) {
    this.physics.world.setBounds(0, 0, width, height);
    Object.entries(this.zones).forEach(([room, zone]) => {
      const rect = this.roomRects.get(room as RoomName);
      const label = this.roomLabels.get(room as RoomName);
      if (!rect || !label) {
        return;
      }

      rect.setPosition(zone.x * width, zone.y * height);
      rect.setSize(zone.w * width, zone.h * height);
      label.setPosition(zone.x * width, zone.y * height - rect.height / 2 - 12);

      const bounds = new Phaser.Geom.Rectangle(
        rect.x - rect.width / 2,
        rect.y - rect.height / 2,
        rect.width,
        rect.height
      );
      this.roomBounds.set(room as RoomName, bounds);
    });
  }

  private detectRoom() {
    const point = this.hero.getCenter();
    let detected: RoomName | null = null;
    this.roomBounds.forEach((rect, room) => {
      if (rect.contains(point.x, point.y)) {
        detected = room;
      }
    });
    if (detected !== this.currentRoom) {
      this.currentRoom = detected;
      this.eventBridge.emit("room-change", detected);
    }
  }
}

type ControlKeys = {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

export function GameCanvas({
  heroSignature,
  movementLocked,
  onRoomChange,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<LifeOSWorldScene | null>(null);
  const bridgeRef = useRef(new Phaser.Events.EventEmitter());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const eventBridge = bridgeRef.current;
    const worldScene = new LifeOSWorldScene(eventBridge);
    sceneRef.current = worldScene;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth || 960,
      height: container.clientHeight || 600,
      backgroundColor: "#020617",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
        },
      },
      scene: [new BootScene(), worldScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    const handleRoomChange = (room: RoomName | null) => {
      onRoomChange?.(room);
    };
    eventBridge.on("room-change", handleRoomChange);

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container && game.scale) {
          const { width, height } = entry.contentRect;
          game.scale.resize(width, height);
          sceneRef.current?.handleResize(width, height);
        }
      }
    });
    resizeObserverRef.current.observe(container);

    return () => {
      eventBridge.off("room-change", handleRoomChange);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [onRoomChange]);

  useEffect(() => {
    sceneRef.current?.setMovementLocked(movementLocked);
  }, [movementLocked]);

  useEffect(() => {
    if (heroSignature) {
      sceneRef.current?.updateHeroStyle(heroSignature);
    }
  }, [heroSignature]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900"
    />
  );
}
