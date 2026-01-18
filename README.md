# Tanks-vs-Aliens

* Agent instrutions*
Perform tasks outlined in this document by number.  When complete, check off the task.  Before starting, ask any clarifying questions.  Each step should include a verification step and a live demonstration with instructions for me to run.

* Game Concepts * 
top-down view.  You control the tank.  The overarching goal is to infiltrate the alien base.  Tank is piloted by the courages spaceman Ron D.


Enemy types:
  UFO : Spawns little green men and flys away.
  Little green man : Simple alien that runs at the tank and slashes it with its claws.

Gimmicks:
  You can break down some walls/obstacles.
  Odd/ironic sense of humor.


Tank actions:
  Arrows to move the tanks l/r, u/d
  Space bar to shoot
  Weapon select is <tbd>
  Pause menu is escape

Weapons  
  Base weapon has 1 second refresh, unlimited ammo
  Blaster master power up is super fast, but limited ammo, and slowly knocks back the tank
  Blowie cannon power is a slow but super powerful blast with big knockback.  Limited ammo.
  Laser of death, continuous beam, no knockback, limited time, but if you use it too much it melts the tank.
  Nuke is one time use, kills all the enemies

* Task List*
1. [x] Setup development environment for our game.  Will be deployed as a single-page application (in browser).  Will use the phaser game engine.  Will be hosted using github pages.  As a starting point, the game should just show a title screen that says "Tanks vs Aliens".  Set up a node development server that we can use for test and debug.  It should automatically update/serve files as we edit them.  Setup any links required for seamless debugging in vscode with this server.

2. [x] Lets setup the base structure of the game.  We need a title screen, an options screen, a level intro, the active game (with per-level state), a death screen, a game over screen, a level complete screen, a game complete screen, and a pause screen.  Set up control and a state machine that goes through each screen in the obvious way.  For now, just put static content on each screen indicating the key to press to transition to the next possible states (e.g. in active game, have a key for complete the level, die, game over pause).  

3. [x] Implement the base tank movement and the base weapon.  No obstacles, just tank moving around and shooting into the void.  Use a stock image for the tank and a circle for the bullets.  
