import Phaser from 'phaser';
import { CONFIG } from './config';

const app = document.getElementById('app')!;
app.innerHTML = `
  <main style="font-family: system-ui, sans-serif; text-align: center; padding: 24px;">
    <h1 style="color:#c99a00">Squeeze City</h1>
    <p>Scaffold OK. ${CONFIG.locations.locations.length} locations loaded.</p>
    <div id="phaser"></div>
  </main>`;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser',
  width: 360,
  height: 200,
  backgroundColor: '#8fd3ff',
  scene: {
    create(this: Phaser.Scene) {
      this.add.circle(180, 100, 40, 0xffd84a);
      this.add.text(180, 170, 'Phaser OK', { color: '#333' }).setOrigin(0.5);
    },
  },
});
