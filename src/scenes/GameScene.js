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
    this.baseWeapon = {
      id: "base",
      name: "Base",
      bulletSpeed: 420,
      cooldownMs: 500,
    };
    this.blasterWeapon = {
      id: "blaster",
      name: "Blaster",
      bulletSpeed: 700,
      cooldownMs: 200,
    };
    this.weapon = this.baseWeapon;
    this.blasterAmmo = 0;
    this.blasterAmmoMax = 25;
    this.alienSpeed = 130;
    this.alienSpawnDelayMs = 5000;
    this.isTankDying = false;
    this.isTankInvulnerable = false;
    this.invulnerableMs = 800;
    this.lives = 3;
    this.health = 3;
    this.healthStart = 3;
    this.healthMax = 5;
    this.score = 0;
    this.debugVisible = false;
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
    this.load.image(
      "heart",
      new URL("../assets/heart.svg", import.meta.url).toString()
    );
    this.load.image(
      "weapon",
      new URL("../assets/weapon.svg", import.meta.url).toString()
    );
    this.load.image(
      "blaster",
      new URL("../assets/blaster.svg", import.meta.url).toString()
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
        fontSize: "10px",
        color: "#d2d7e6",
        align: "right",
        backgroundColor: "rgba(11, 19, 32, 0.6)",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(10);
    this.debugText.setVisible(this.debugVisible);

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
    this.powerups = this.physics.add.group();
    this.powerupTimer = null;

    this.createBulletTexture();
    this.createHud();

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
    this.physics.add.overlap(
      this.tank,
      this.powerups,
      this.handlePowerupPickup,
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
              "Esc: Pause  1: Base  2: Blaster"
            );
          } else {
            this.enterGameplay(
              `Level ${this.level} - Active`,
              "Esc: Pause  1: Base  2: Blaster"
            );
          }
        },
      },
      [STATES.PAUSE]: {
        onEnter: () => this.enterPause("Paused", "Esc: Resume"),
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
    this.input.keyboard.on("keydown-ONE", () => this.handleNumberKey(1));
    this.input.keyboard.on("keydown-TWO", () => this.handleNumberKey(2));
    this.input.keyboard.on("keydown-THREE", () => this.handleNumberKey(3));
    this.input.keyboard.on("keydown-FOUR", () => this.handleNumberKey(4));
    this.input.keyboard.on("keydown-ESC", () => this.handlePauseToggle());
    this.input.keyboard.on("keydown-G", () => this.toggleDebug());
  }

  handlePrimaryAction() {
    switch (this.stateMachine.currentState) {
      case STATES.TITLE:
        this.resetRunStats();
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
        break;
      case STATES.PAUSE:
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
        break;
      default:
        break;
    }
  }

  handleQuaternaryAction() {
    if (this.stateMachine.currentState === STATES.PLAYING) {
      return;
    }
  }

  handleNumberKey(number) {
    if (this.stateMachine.currentState === STATES.PLAYING) {
      if (number === 1) {
        this.selectWeapon(this.baseWeapon);
      } else if (number === 2) {
        this.selectWeapon(this.blasterWeapon);
      }
      return;
    }

    if (number === 1) {
      this.handlePrimaryAction();
    } else if (number === 2) {
      this.handleSecondaryAction();
    } else if (number === 3) {
      this.handleTertiaryAction();
    } else if (number === 4) {
      this.handleQuaternaryAction();
    }
  }

  update(time, delta) {
    if (this.debugVisible) {
      this.updateDebugOverlay();
    }

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
      if (this.weapon.id !== "blaster" || this.blasterAmmo > 0) {
        this.fireBullet();
        this.nextShotAt = time + this.weapon.cooldownMs;
      }
    }

    this.updateBullets(delta);
    this.updateAliens();
    this.updateHud();
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
    bullet.setData("speed", this.weapon.bulletSpeed);
    bullet.body.setVelocity(
      direction.x * this.weapon.bulletSpeed,
      direction.y * this.weapon.bulletSpeed
    );
    bullet.setVelocity(
      direction.x * this.weapon.bulletSpeed,
      direction.y * this.weapon.bulletSpeed
    );
    this.bullets.add(bullet);
    this.lastBullet = bullet;
    this.handleAmmoUse();

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

      const speed = bullet.getData("speed") || this.baseWeapon.bulletSpeed;
      const velocityX = direction.x * speed;
      const velocityY = direction.y * speed;
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
    this.hudContainer.setVisible(true);
  }

  resumeGameplay(title, subtitle) {
    this.renderScreen(title, subtitle);
    this.hudContainer.setVisible(true);
    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.paused = false;
    }
    if (this.powerupTimer) {
      this.powerupTimer.paused = false;
    } else {
      this.schedulePowerupSpawn();
    }
  }

  enterPause(title, subtitle) {
    this.renderScreen(title, subtitle);
    this.hudContainer.setVisible(true);
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
    if (this.powerupTimer) {
      this.powerupTimer.paused = true;
    }
  }

  enterNonGameplay(title, subtitle) {
    this.deactivateGameplay();
    this.renderScreen(title, subtitle);
    this.hudContainer.setVisible(false);
  }

  activateGameplay() {
    const { width, height } = this.scale;
    this.tank.setPosition(width / 2, height / 2);
    this.tank.setVisible(true).setActive(true);
    this.tank.body.enable = true;
    this.nextShotAt = 0;
    this.isTankDying = false;
    this.tank.setAlpha(1);
    this.resetWeaponState();

    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.remove(false);
    }
    this.alienSpawnTimer = this.time.addEvent({
      delay: this.alienSpawnDelayMs,
      loop: true,
      callback: () => this.spawnAlien(),
    });

    this.schedulePowerupSpawn();
  }

  deactivateGameplay() {
    this.tank.setVisible(false).setActive(false);
    this.tank.body.enable = false;
    this.tank.setVelocity(0, 0);
    this.bullets.clear(true, true);
    this.aliens.clear(true, true);
    this.powerups.clear(true, true);
    if (this.alienSpawnTimer) {
      this.alienSpawnTimer.remove(false);
      this.alienSpawnTimer = null;
    }
    if (this.powerupTimer) {
      this.powerupTimer.remove(false);
      this.powerupTimer = null;
    }
  }

  renderScreen(title, subtitle) {
    const { width, height } = this.scale;
    this.centerText.setText(title).setPosition(width / 2, height / 2 - 20);
    this.subtitleText
      .setText(subtitle)
      .setPosition(width / 2, height / 2 + 32);
    this.debugText.setPosition(width - 12, 12);
    if (this.hudContainer) {
      this.hudContainer.setPosition(0, 0);
    }
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
    this.score += 11;
    this.updateHud();
  }

  handleTankHit(tank, alien) {
    if (this.isTankDying || this.isTankInvulnerable) {
      return;
    }

    if (alien && alien.active) {
      this.playExplosion(alien.x, alien.y, 0x7bd86b);
      alien.destroy();
    }

    this.health = Math.max(0, this.health - 1);
    this.updateHud();

    if (this.health <= 0) {
      this.handleLifeLoss();
      return;
    }

    this.isTankInvulnerable = true;
    this.cameras.main.flash(150, 120, 255, 180);
    this.tweens.add({
      targets: this.tank,
      alpha: 0.3,
      yoyo: true,
      repeat: 5,
      duration: 80,
      onComplete: () => {
        this.tank.setAlpha(1);
      },
    });
    this.time.delayedCall(this.invulnerableMs, () => {
      this.isTankInvulnerable = false;
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

  handleLifeLoss() {
    this.lives = Math.max(0, this.lives - 1);
    this.updateHud();

    if (this.lives <= 0) {
      this.isTankDying = true;
      this.tank.body.enable = false;
      this.tank.setVelocity(0, 0);
      this.playExplosion(this.tank.x, this.tank.y, 0xf5d77a);
      this.cameras.main.flash(200, 255, 120, 120);
      this.time.delayedCall(500, () => {
        this.stateMachine.setState(STATES.GAME_OVER);
      });
      return;
    }

    const respawnX = this.tank.x;
    const respawnY = this.tank.y;

    this.isTankDying = true;
    this.tank.body.enable = false;
    this.tank.setVelocity(0, 0);
    this.tank.setVisible(false);
    this.playExplosion(respawnX, respawnY, 0xf5d77a);
    this.cameras.main.flash(200, 255, 120, 120);

    this.time.delayedCall(3000, () => {
      this.health = this.healthStart;
      this.updateHud();
      this.tank.setPosition(respawnX, respawnY);
      this.tank.setVisible(true);
      this.tank.body.enable = true;
      this.isTankDying = false;
      this.isTankInvulnerable = true;
      this.tweens.add({
        targets: this.tank,
        alpha: 0.3,
        yoyo: true,
        repeat: 5,
        duration: 80,
        onComplete: () => {
          this.tank.setAlpha(1);
        },
      });
      this.time.delayedCall(this.invulnerableMs, () => {
        this.isTankInvulnerable = false;
      });
    });
  }

  createHud() {
    const { width } = this.scale;
    const hudHeight = 36;
    const padding = 8;

    this.hudContainer = this.add.container(0, 0).setDepth(20);
    const background = this.add
      .rectangle(width / 2, hudHeight / 2, width, hudHeight, 0x0b1320, 0.65)
      .setOrigin(0.5, 0.5);
    this.hudContainer.add(background);

    this.hudLivesIcon = this.add
      .image(padding + 12, hudHeight / 2, "tank")
      .setScale(0.28)
      .setOrigin(0.5, 0.5);
    this.hudContainer.add(this.hudLivesIcon);

    this.hudLivesText = this.add
      .text(padding + 26, 6, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#f6f0d6",
      })
      .setOrigin(0, 0);
    this.hudContainer.add(this.hudLivesText);

    this.hudHearts = [];
    const heartsStartX = padding + 78;
    for (let i = 0; i < this.healthMax; i += 1) {
      const heart = this.add
        .image(heartsStartX + i * 18, hudHeight / 2, "heart")
        .setScale(0.8)
        .setOrigin(0.5, 0.5);
      this.hudHearts.push(heart);
      this.hudContainer.add(heart);
    }

    this.hudScoreText = this.add
      .text(width / 2 - 60, 6, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#f6f0d6",
      })
      .setOrigin(0, 0);
    this.hudContainer.add(this.hudScoreText);

    this.hudLevelText = this.add
      .text(width / 2 + 30, 6, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#f6f0d6",
      })
      .setOrigin(0, 0);
    this.hudContainer.add(this.hudLevelText);

    this.hudWeaponBaseIcon = this.add
      .image(width - 210, hudHeight / 2, "weapon")
      .setScale(1)
      .setOrigin(0.5, 0.5);
    this.hudContainer.add(this.hudWeaponBaseIcon);

    this.hudWeaponBaseText = this.add
      .text(width - 190, 6, "1: Base", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#f6f0d6",
      })
      .setOrigin(0, 0);
    this.hudContainer.add(this.hudWeaponBaseText);

    this.hudWeaponBlasterIcon = this.add
      .image(width - 120, hudHeight / 2, "blaster")
      .setScale(1)
      .setOrigin(0.5, 0.5);
    this.hudContainer.add(this.hudWeaponBlasterIcon);

    this.hudWeaponBlasterText = this.add
      .text(width - 100, 6, "2: Blaster 0", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#f6f0d6",
      })
      .setOrigin(0, 0);
    this.hudContainer.add(this.hudWeaponBlasterText);

    this.hudBossText = this.add
      .text(width - 10, 6, "Boss: ---", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10px",
        color: "#b9c0d4",
      })
      .setOrigin(1, 0);
    this.hudContainer.add(this.hudBossText);

    this.hudBossBar = this.add
      .rectangle(width - 20, hudHeight / 2 + 6, 40, 6, 0x1b263b, 1)
      .setOrigin(0.5, 0.5);
    this.hudContainer.add(this.hudBossBar);

    this.updateHud();
    this.hudContainer.setVisible(false);
  }

  updateHud() {
    if (!this.hudContainer) {
      return;
    }
    this.hudLivesText.setText(`x${this.lives}`);
    this.hudScoreText.setText(`Score: ${this.score}`);
    this.hudLevelText.setText(`Level: ${this.level}`);
    this.hudHearts.forEach((heart, index) => {
      const isFull = index < this.health;
      heart.setAlpha(isFull ? 1 : 0.25);
    });
    this.hudWeaponBaseText.setText("1: Base");
    const blasterLabel = this.weapon.id === "blaster" ? `2: Blaster ${this.blasterAmmo}` : "2: Blaster";
    this.hudWeaponBlasterText.setText(blasterLabel);

    const baseSelected = this.weapon.id === "base";
    const blasterSelected = this.weapon.id === "blaster";
    this.hudWeaponBaseIcon.setAlpha(baseSelected ? 1 : 0.5);
    this.hudWeaponBaseText.setAlpha(baseSelected ? 1 : 0.6);

    const blasterAvailable = this.blasterAmmo > 0;
    this.hudWeaponBlasterIcon.setAlpha(
      blasterAvailable ? (blasterSelected ? 1 : 0.5) : 0.2
    );
    this.hudWeaponBlasterText.setAlpha(
      blasterAvailable ? (blasterSelected ? 1 : 0.6) : 0.2
    );
  }

  toggleDebug() {
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);
  }

  resetRunStats() {
    this.lives = 3;
    this.health = this.healthStart;
    this.score = 0;
    this.updateHud();
  }

  resetWeaponState() {
    this.weapon = this.baseWeapon;
    this.blasterAmmo = 0;
    this.updateHud();
  }

  handleAmmoUse() {
    if (this.weapon.id !== "blaster") {
      return;
    }
    this.blasterAmmo = Math.max(0, this.blasterAmmo - 1);
    if (this.blasterAmmo === 0) {
      this.weapon = this.baseWeapon;
    }
    this.updateHud();
  }

  handlePowerupPickup(tank, powerup) {
    if (!powerup.active) {
      return;
    }
    powerup.destroy();
    this.blasterAmmo = this.blasterAmmoMax;
    this.weapon = this.blasterWeapon;
    this.updateHud();
    this.schedulePowerupSpawn();
  }

  schedulePowerupSpawn() {
    if (this.powerupTimer) {
      this.powerupTimer.remove(false);
    }
    const delay = Phaser.Math.Between(5000, 30000);
    this.powerupTimer = this.time.delayedCall(delay, () => {
      this.spawnPowerup();
    });
  }

  spawnPowerup() {
    if (this.stateMachine.currentState !== STATES.PLAYING) {
      this.schedulePowerupSpawn();
      return;
    }
    if (this.powerups.countActive(true) > 0) {
      this.schedulePowerupSpawn();
      return;
    }
    const { width, height } = this.scale;
    const margin = 40;
    const x = Phaser.Math.Between(margin, width - margin);
    const y = Phaser.Math.Between(margin + 40, height - margin);
    const powerup = this.physics.add.image(x, y, "blaster");
    powerup.body.setAllowGravity(false);
    powerup.setDepth(1);
    this.powerups.add(powerup);
    this.schedulePowerupSpawn();
  }

  selectWeapon(weapon) {
    if (weapon.id === "blaster" && this.blasterAmmo === 0) {
      this.weapon = this.baseWeapon;
    } else {
      this.weapon = weapon;
    }
    this.updateHud();
  }

  handlePauseToggle() {
    if (this.stateMachine.currentState === STATES.PLAYING) {
      this.stateMachine.setState(STATES.PAUSE);
    } else if (this.stateMachine.currentState === STATES.PAUSE) {
      this.stateMachine.setState(STATES.PLAYING, { resume: true });
    }
  }
}
