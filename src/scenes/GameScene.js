import Phaser from "phaser";
import StateMachine from "../state/StateMachine.js";

const STATES = {
  TITLE: "TITLE",
  OPTIONS: "OPTIONS",
  LEVEL_INTRO: "LEVEL_INTRO",
  PLAYING: "PLAYING",
  PAUSE: "PAUSE",
  DEATH: "DEATH",
  GAME_OVER: "GAME_OVER",
  LEVEL_COMPLETE: "LEVEL_COMPLETE",
  GAME_COMPLETE: "GAME_COMPLETE",
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.level = 1;
    this.maxLevels = 3;
    this.moveSpeed = 220;
    this.bulletSpeed = 420;
    this.bulletCooldownMs = 500;
    this.nextShotAt = 0;
    this.lastMoveDir = new Phaser.Math.Vector2(1, 0);
    this.alienSpeed = 130;
    this.alienSpawnDelayMs = 5000;
    this.isTankDying = false;
  }

  preload() {
    this.load.image(
      "tank",
      new URL("../assets/tank.svg", import.meta.url).toString()
    );
    this.load.image(
      "alien",
      new URL("../assets/alien.svg", import.meta.url).toString()
    );
  }

  create() {
    this.centerText = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "28px",
        color: "#f6f0d6",
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this.subtitleText = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: "#b9c0d4",
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    this.debugText = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "14px",
        color: "#d2d7e6",
        align: "right",
        backgroundColor: "rgba(11, 19, 32, 0.6)",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(10);

    const { width, height } = this.scale;
    this.tank = this.physics.add
      .sprite(width / 2, height / 2, "tank")
      .setCollideWorldBounds(true);
    this.tank.setVisible(false).setActive(false);
    this.tank.body.enable = false;

    this.bullets = this.physics.add.group();
    this.lastBullet = null;
    this.aliens = this.physics.add.group();
    this.alienSpawnTimer = null;

    this.createBulletTexture();

    this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.handleBulletHit,
      null,
      this
    );
    this.physics.add.overlap(
      this.tank,
      this.aliens,
      this.handleTankHit,
      null,
      this
    );

    this.stateMachine = new StateMachine(STATES.TITLE, {
      [STATES.TITLE]: {
        onEnter: () =>
          this.enterNonGameplay("Tanks vs Aliens", "A: Start  S: Options"),
      },
      [STATES.OPTIONS]: {
        onEnter: () => this.enterNonGameplay("Options", "A: Back"),
      },
      [STATES.LEVEL_INTRO]: {
        onEnter: () =>
          this.enterNonGameplay(
            `Level ${this.level}`,
            "A: Begin Level  S: Title"
          ),
      },
      [STATES.PLAYING]: {
        onEnter: (data) => {
          if (data && data.resume) {
            this.resumeGameplay(
              `Level ${this.level} - Active`,
              "1: Complete  2: Die  3: Pause  4: Game Over"
            );
          } else {
            this.enterGameplay(
              `Level ${this.level} - Active`,
              "1: Complete  2: Die  3: Pause  4: Game Over"
            );
          }
        },
      },
      [STATES.PAUSE]: {
        onEnter: () => this.enterPause("Paused", "A: Resume"),
      },
      [STATES.DEATH]: {
        onEnter: () => this.enterNonGameplay("You Died", "A: Retry  S: Game Over"),
      },
      [STATES.GAME_OVER]: {
        onEnter: () => this.enterNonGameplay("Game Over", "A: Title"),
      },
      [STATES.LEVEL_COMPLETE]: {
        onEnter: () =>
          this.enterNonGameplay(
            `Level ${this.level} Complete`,
            "A: Next Level  S: Title"
          ),
      },
      [STATES.GAME_COMPLETE]: {
        onEnter: () => this.enterNonGameplay("Game Complete", "A: Title"),
      },
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.shootKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.registerInput();
    this.stateMachine.setState(STATES.TITLE);
  }

  registerInput() {
    this.input.keyboard.on("keydown-A", () => this.handlePrimaryAction());
    this.input.keyboard.on("keydown-S", () => this.handleSecondaryAction());
    this.input.keyboard.on("keydown-ONE", () => this.handlePrimaryAction());
    this.input.keyboard.on("keydown-TWO", () => this.handleSecondaryAction());
    this.input.keyboard.on("keydown-THREE", () => this.handleTertiaryAction());
    this.input.keyboard.on("keydown-FOUR", () => this.handleQuaternaryAction());
  }

  handlePrimaryAction() {
    switch (this.stateMachine.currentState) {
      case STATES.TITLE:
        this.level = 1;
        this.stateMachine.setState(STATES.LEVEL_INTRO);
        break;
      case STATES.OPTIONS:
        this.stateMachine.setState(STATES.TITLE);
        break;
      case STATES.LEVEL_INTRO:
        this.stateMachine.setState(STATES.PLAYING);
        break;
      case STATES.PLAYING:
        this.stateMachine.setState(STATES.LEVEL_COMPLETE);
        break;
      case STATES.PAUSE:
        this.stateMachine.setState(STATES.PLAYING, { resume: true });
        break;
      case STATES.DEATH:
        this.stateMachine.setState(STATES.LEVEL_INTRO);
        break;
      case STATES.GAME_OVER:
        this.stateMachine.setState(STATES.TITLE);
        break;
      case STATES.LEVEL_COMPLETE:
        if (this.level < this.maxLevels) {
          this.level += 1;
          this.stateMachine.setState(STATES.LEVEL_INTRO);
        } else {
          this.stateMachine.setState(STATES.GAME_COMPLETE);
        }
        break;
      case STATES.GAME_COMPLETE:
        this.stateMachine.setState(STATES.TITLE);
        break;
      default:
        break;
    }
  }

  handleSecondaryAction() {
    switch (this.stateMachine.currentState) {
      case STATES.TITLE:
        this.stateMachine.setState(STATES.OPTIONS);
        break;
      case STATES.LEVEL_INTRO:
      case STATES.LEVEL_COMPLETE:
        this.stateMachine.setState(STATES.TITLE);
        break;
      case STATES.PLAYING:
        this.stateMachine.setState(STATES.DEATH);
        break;
      case STATES.DEATH:
        this.stateMachine.setState(STATES.GAME_OVER);
        break;
      default:
        break;
    }
  }

  handleTertiaryAction() {
    switch (this.stateMachine.currentState) {
      case STATES.PLAYING:
        this.stateMachine.setState(STATES.PAUSE);
        break;
      default:
        break;
    }
  }

  handleQuaternaryAction() {
    if (this.stateMachine.currentState === STATES.PLAYING) {
      this.stateMachine.setState(STATES.GAME_OVER);
    }
  }

  update(time, delta) {
    this.updateDebugOverlay();

    if (this.stateMachine.currentState !== STATES.PLAYING) {
      if (this.tank.body.enable) {
        this.tank.setVelocity(0, 0);
      }
      return;
    }

    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown) {
      velocityX = -this.moveSpeed;
    } else if (this.cursors.right.isDown) {
      velocityX = this.moveSpeed;
    }

    if (this.cursors.up.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors.down.isDown) {
      velocityY = this.moveSpeed;
    }

    this.tank.setVelocity(velocityX, velocityY);

    if (velocityX !== 0 || velocityY !== 0) {
      this.lastMoveDir.set(velocityX, velocityY).normalize();
      this.updateTankFacing(velocityX, velocityY);
    }

    if (this.shootKey.isDown && time >= this.nextShotAt) {
      this.fireBullet();
      this.nextShotAt = time + this.bulletCooldownMs;
    }

    this.updateBullets(delta);
    this.updateAliens();
  }

  updateTankFacing(velocityX, velocityY) {
    const angleRadians = Math.atan2(velocityY, velocityX);
    this.tank.setAngle(Phaser.Math.RadToDeg(angleRadians));
  }

  fireBullet() {
    const direction = this.getShootDirection();
    const bullet = this.physics.add.image(this.tank.x, this.tank.y, "bullet");
    bullet.body.setCircle(6);
    bullet.body.setAllowGravity(false);
    bullet.body.setImmovable(false);
    bullet.body.moves = true;
    bullet.body.enable = true;
    bullet.setData("dir", direction.clone());
    bullet.body.setVelocity(
      direction.x * this.bulletSpeed,
      direction.y * this.bulletSpeed
    );
    bullet.setVelocity(
      direction.x * this.bulletSpeed,
      direction.y * this.bulletSpeed
    );
    this.bullets.add(bullet);
    this.lastBullet = bullet;

    this.time.delayedCall(1500, () => {
      bullet.destroy();
      if (this.lastBullet === bullet) {
        this.lastBullet = null;
      }
    });
  }

  updateBullets(delta) {
    const deltaSeconds = delta / 1000;
    this.bullets.getChildren().forEach((bullet) => {
      if (!bullet.active) {
        return;
      }
      const direction = bullet.getData("dir");
      if (!direction) {
        return;
      }

      const velocityX = direction.x * this.bulletSpeed;
      const velocityY = direction.y * this.bulletSpeed;
      bullet.x += velocityX * deltaSeconds;
      bullet.y += velocityY * deltaSeconds;

      if (bullet.body) {
        bullet.body.setVelocity(velocityX, velocityY);
        bullet.body.position.x = bullet.x - bullet.body.halfWidth;
        bullet.body.position.y = bullet.y - bullet.body.halfHeight;
      }
    });
  }

  updateAliens() {
    if (this.isTankDying) {
      return;
    }

    this.aliens.getChildren().forEach((alien) => {
      if (!alien.active) {
        return;
      }
      const toTank = new Phaser.Math.Vector2(
        this.tank.x - alien.x,
        this.tank.y - alien.y
      ).normalize();
      alien.body.setVelocity(
        toTank.x * this.alienSpeed,
        toTank.y * this.alienSpeed
      );
    });
  }

  getShootDirection() {
    if (this.lastMoveDir.lengthSq() === 0) {
      return new Phaser.Math.Vector2(1, 0);
    }

    return this.lastMoveDir.clone();
  }

  createBulletTexture() {
    const bulletKey = "bullet";
    if (this.textures.exists(bulletKey)) {
      return;
    }

    const gfx = this.add.graphics();
    gfx.fillStyle(0xf5d77a, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture(bulletKey, 12, 12);
    gfx.destroy();
  }

  enterGameplay(title, subtitle) {
    this.activateGameplay();
    this.renderScreen(title, subtitle);
  }

  resumeGameplay(title, subtitle) {
    this.renderScreen(title, subtitle);
    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.paused = false;
    }
  }

  enterPause(title, subtitle) {
    this.renderScreen(title, subtitle);
    this.tank.setVelocity(0, 0);
    this.aliens.getChildren().forEach((alien) => {
      if (alien.body) {
        alien.body.setVelocity(0, 0);
      }
    });
    this.bullets.getChildren().forEach((bullet) => {
      if (bullet.body) {
        bullet.body.setVelocity(0, 0);
      }
    });
    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.paused = true;
    }
  }

  enterNonGameplay(title, subtitle) {
    this.deactivateGameplay();
    this.renderScreen(title, subtitle);
  }

  activateGameplay() {
    const { width, height } = this.scale;
    this.tank.setPosition(width / 2, height / 2);
    this.tank.setVisible(true).setActive(true);
    this.tank.body.enable = true;
    this.nextShotAt = 0;
    this.isTankDying = false;
    this.tank.setAlpha(1);

    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.remove(false);
    }
    this.alienSpawnTimer = this.time.addEvent({
      delay: this.alienSpawnDelayMs,
      loop: true,
      callback: () => this.spawnAlien(),
    });
  }

  deactivateGameplay() {
    this.tank.setVisible(false).setActive(false);
    this.tank.body.enable = false;
    this.tank.setVelocity(0, 0);
    this.bullets.clear(true, true);
    this.aliens.clear(true, true);
    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.remove(false);
      this.alienSpawnTimer = null;
    }
  }

  renderScreen(title, subtitle) {
    const { width, height } = this.scale;
    this.centerText.setText(title).setPosition(width / 2, height / 2 - 20);
    this.subtitleText
      .setText(subtitle)
      .setPosition(width / 2, height / 2 + 32);
    this.debugText.setPosition(width - 12, 12);
  }

  updateDebugOverlay() {
    const tankVelocity = this.tank.body
      ? `${this.tank.body.velocity.x.toFixed(1)}, ${this.tank.body.velocity.y.toFixed(1)}`
      : "n/a";
    const tankPosition = `${this.tank.x.toFixed(1)}, ${this.tank.y.toFixed(
      1
    )}`;
    const direction = `${this.lastMoveDir.x.toFixed(
      2
    )}, ${this.lastMoveDir.y.toFixed(2)}`;
    const shootDirection = this.getShootDirection();
    const shootDirectionLabel = `${shootDirection.x.toFixed(
      2
    )}, ${shootDirection.y.toFixed(2)}`;

    let bulletLine = "bullet: none";
    if (this.lastBullet && this.lastBullet.body) {
      const bulletPosition = `${this.lastBullet.x.toFixed(
        1
      )}, ${this.lastBullet.y.toFixed(1)}`;
      const bulletVelocity = `${this.lastBullet.body.velocity.x.toFixed(
        1
      )}, ${this.lastBullet.body.velocity.y.toFixed(1)}`;
      const bulletFlags = `moves: ${this.lastBullet.body.moves} enabled: ${this.lastBullet.body.enable}`;
      bulletLine = `bullet pos: ${bulletPosition}\nbullet vel: ${bulletVelocity}\n${bulletFlags}`;
    }

    this.debugText.setText(
      `state: ${this.stateMachine.currentState}\nlevel: ${
        this.level
      }\ntank pos: ${tankPosition}\ntank vel: ${tankVelocity}\nlast dir: ${direction}\nshoot dir: ${shootDirectionLabel}\n${bulletLine}`
    );
  }

  spawnAlien() {
    if (this.stateMachine.currentState !== STATES.PLAYING) {
      return;
    }

    const { width, height } = this.scale;
    const margin = 24;
    const edge = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = Phaser.Math.Between(0, width);
      y = -margin;
    } else if (edge === 1) {
      x = width + margin;
      y = Phaser.Math.Between(0, height);
    } else if (edge === 2) {
      x = Phaser.Math.Between(0, width);
      y = height + margin;
    } else {
      x = -margin;
      y = Phaser.Math.Between(0, height);
    }

    const alien = this.physics.add.image(x, y, "alien");
    alien.body.setAllowGravity(false);
    alien.setDepth(1);
    this.aliens.add(alien);
  }

  handleBulletHit(bullet, alien) {
    if (!bullet.active || !alien.active) {
      return;
    }

    bullet.destroy();
    if (this.lastBullet === bullet) {
      this.lastBullet = null;
    }
    this.playExplosion(alien.x, alien.y, 0x7bd86b);
    alien.destroy();
  }

  handleTankHit() {
    if (this.isTankDying) {
      return;
    }

    this.isTankDying = true;
    this.tank.body.enable = false;
    this.tank.setVelocity(0, 0);
    this.playExplosion(this.tank.x, this.tank.y, 0xf5d77a);
    this.cameras.main.flash(200, 255, 120, 120);
    this.time.delayedCall(500, () => {
      this.stateMachine.setState(STATES.GAME_OVER);
    });
  }

  playExplosion(x, y, color) {
    const boom = this.add.circle(x, y, 10, color, 0.9);
    boom.setDepth(5);
    this.tweens.add({
      targets: boom,
      scale: 2.5,
      alpha: 0,
      duration: 300,
      onComplete: () => boom.destroy(),
    });
  }
}
