import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x060e18);

    // Orange radial glow at top (penny.bid style)
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0xff6200, 0xff6200, 0x060e18, 0x060e18, 0.12, 0.12, 0, 0);
    gfx.fillEllipse(width / 2, 0, width * 1.4, height * 0.7);

    // Logo text
    this.add.text(width / 2, height / 2 - 24, 'penny', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '28px',
      color: '#e0e0e0',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 16, 'Slots', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#ff6200',
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 40, 'Loading…', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      color: '#444444',
    }).setOrigin(0.5);

    // Transition to GameScene after a short delay (Part 2 will flesh this out)
    this.time.delayedCall(800, () => this.scene.start('GameScene'));
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x060e18);

    // Orange radial glow
    const glow = this.add.graphics();
    glow.fillGradientStyle(0xff6200, 0xff6200, 0x060e18, 0x060e18, 0.1, 0.1, 0, 0);
    glow.fillEllipse(width / 2, 0, width * 1.4, height * 0.5);

    // Title
    this.add.text(width / 2, 28, 'penny', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(width / 2, 50, 'Slots', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ff6200',
    }).setOrigin(0.5);

    // Placeholder reel area (3 columns × 3 rows)
    const reelW  = 110;
    const reelH  = 320;
    const gap    = 12;
    const totalW = reelW * 3 + gap * 2;
    const startX = (width - totalW) / 2;
    const reelY  = 90;

    for (let col = 0; col < 3; col++) {
      const x = startX + col * (reelW + gap);
      // Reel frame
      const frame = this.add.graphics();
      frame.lineStyle(2, 0x1a2f42, 1);
      frame.fillStyle(0x0c1825, 1);
      frame.fillRoundedRect(x, reelY, reelW, reelH, 8);
      frame.strokeRoundedRect(x, reelY, reelW, reelH, 8);

      // Placeholder symbol slots
      for (let row = 0; row < 3; row++) {
        const cellY = reelY + 12 + row * (reelH / 3);
        const cellH = reelH / 3 - 8;
        const dot = this.add.graphics();
        dot.fillStyle(0x101f2e, 1);
        dot.fillRoundedRect(x + 8, cellY, reelW - 16, cellH, 6);
        // Dim question mark
        this.add.text(x + reelW / 2, cellY + cellH / 2, '?', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '28px',
          color: '#1a2f42',
        }).setOrigin(0.5);
      }
    }

    // Payline indicator — middle row highlight
    const paylineY = reelY + reelH / 3 + (reelH / 3) / 2;
    const paylineGfx = this.add.graphics();
    paylineGfx.lineStyle(2, 0xff6200, 0.35);
    paylineGfx.lineBetween(startX - 8, paylineY, startX + totalW + 8, paylineY);

    // Credit display placeholder
    this.add.text(width / 2, reelY + reelH + 24, 'CREDITS', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#444444',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, reelY + reelH + 44, '100', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#e0e0e0',
    }).setOrigin(0.5);

    // Spin button placeholder
    const btnY   = reelY + reelH + 110;
    const btnW   = 160;
    const btnH   = 48;
    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(0xff6200, 1);
    btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

    this.add.text(width / 2, btnY, 'SPIN', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 18, 'Part 2 coming: reels & symbols', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#1a2f42',
    }).setOrigin(0.5);
  }
}

export function SlotsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type:   Phaser.AUTO,
      width:  480,
      height: 560,
      backgroundColor: '#060e18',
      parent: containerRef.current,
      scene:  [BootScene, GameScene],
      scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias:      true,
        antialiasGL:    true,
        pixelArt:       false,
      },
    });

    return () => { game.destroy(true); };
  }, []);

  return (
    <div className="slots-page">
      <div className="slots-canvas-wrap" ref={containerRef} />
    </div>
  );
}
