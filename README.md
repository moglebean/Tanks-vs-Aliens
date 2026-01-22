# Tanks-vs-Aliens

* Agent instructions*
Perform tasks outlined in this document by number.  When complete, check off the task.  Before starting, ask any clarifying questions.  Each step should include a verification step and a live demonstration with instructions for me to run.


* Deployment *
GitHub Pages deploys on push to `main` using `.github/workflows/deploy.yml`.


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

Other power ups:
 health drop
 morph ball form : Become a small fast ball for limited time
 


* Task List*
1. [x] Setup development environment for our game.  Will be deployed as a single-page application (in browser).  Will use the phaser game engine.  Will be hosted using github pages.  As a starting point, the game should just show a title screen that says "Tanks vs Aliens".  Set up a node development server that we can use for test and debug.  It should automatically update/serve files as we edit them.  Setup any links required for seamless debugging in vscode with this server.

2. [x] Lets setup the base structure of the game.  We need a title screen, an options screen, a level intro, the active game (with per-level state), a death screen, a game over screen, a level complete screen, a game complete screen, and a pause screen.  Set up control and a state machine that goes through each screen in the obvious way.  For now, just put static content on each screen indicating the key to press to transition to the next possible states (e.g. in active game, have a key for complete the level, die, game over pause).  

3. [x] Implement the base tank movement and the base weapon.  No obstacles, just tank moving around and shooting into the void.  Use a stock image for the tank and a circle for the bullets.  

4. [x] Implement the little green man.  Every ~5s, have one wander on to the scren and run after the tank.  If the tank gets hit, transition to game over.  If a bullet hits the alien, it dies.  Add a death animation for the alien and the tank.  use a stock image for the alien.

5. [x] Add a heads up display to the game.  It should include number of lives (tank icon x N), current weapons (icon per weapon with numbers for switching like 1=.  2=x), health meter (heart icons, max=5), score (11 points per little green man), level #, leave a space for boss name & health meter in the future).

6. [x] Implemnt the blaster master power up.  It should pop up randomly every 5-30s.  It will have an icon that looks like a mini gun.  Implement the gun physics per the above description (very fast fire, faster moving bullets, limited ammo).  Add the ability to change weapon with # keys (1=base, 2=blaster master), show the ammo when selected.  Grey out the icon when no ammo.  Switch to the weapon immmediately on power up.  get rid of the test keys for transitions on the main screen.  Make escape the pause button.

7. [x] Lets implement some levels.  For now, each level will be one screen in size.  Have a few different obstacles (walls, rocks, water).  Implement rules at your discretion on which the tank vs enemies vs bullets can traverse.