# RetroPie Web Console
Web Based Console built on NodeJS for handling RetroPie Setup.

[RetroPie](https://retropie.org.uk/) is a one in all game console designed for the Raspberry Pi and other Debian based operating systems.

[NodeJS](https://nodejs.org/en/) is a lightweight JavaScript based tool where you can manage 

The purpose of this utility is to simplify the setup of RetroPie, which requires command line knowledge.

Raspberry Pis allow the ability to swap Operating Systems by switching SD cards. The goal of this utility is to simplify the setup of RetroPie on each SD card or each individual Raspberry Pi.

## How to get started
### Install Chef
If you are not utilizing this through the use of [piconfig](https://github.com/lashower/piconfig/), then you will need to run this command on your Raspberry Pi 
```
wget https://github.com/lashower/piconfig/blob/master/loadchef.sh
sudo ./loadchef.sh
```
That will install chef on your Raspberry Pi.

### Copying the files from github
Run this command to setup your folder structure.
mkdir -p ~/chef-repo/cookbooks/RetroPie
cd ~/chef-repo/cookbooks/RetroPie
git clone https://github.com/lashower/RetroPie/

### Selecting what you want installed
I allow two types of installs. Either by application name or by category. Here are the available categories:
* core (The core tools including emulationstation and retroarch)
* main (Your typical emulators like SNES and GBA)
* driver
* config
* supplementary
* opt
* exp
* all

For a complete list by application name, please see the supported apps section.

#### Using piconfig
If calling RetroPie through my piconfig project, you will need to add these properties to your attributes file:


#### Running Standalone
You will need to update the testInstall array in attributes/default.rb
Modify the attributes/default.rb using your favorite text editor.
EX: `nano attributes/default.rb`

By default, I have all test installs commented out. To uncomment an option, just remove the '#' preceding it and possibly the # after it.

I suggest you at least install core and main. EX:
```
default['RetroPie']['testInstall'] = [
                    'core',
                    'main',
                    'driver'#,
                    #'config'#,
                    #'supplementary',
                    #'opt',
                    #'exp'
                    #'all'
                      ]
```

#### All/exp Options
Be careful when running all or exp groups. Most of them do not have predefined compilers and will take a lot of resources and time to execute. If your Raspberry Pi overheats during install, I take no liability.

### Running RetroPie script
To execute RetroPie just run this command:
sudo chef-client --local-mode --runlist "recipe[RetroPie]" | tee ~/RetroPie.log

After that, you will have to exit to CLI and run emulationstation to bring up the interface.

## Adding Game files
Inside ~/RetroPie/roms there are category folders for each type of game file. All game files need to be added to their respective folder (do not ask me where you can find them). If an emulator does not have a rom, then it will not show up in emulationstation.

## Supported Apps
While my tool automatically checks for new emulators, there are some that I could not get installed/compiled during testing.
Here are the ones currently not working:
* gamecondriver
* lr-mame2014
* lr-mess
* lr-mame
* lr-hatari
* lr-mame2016
* lr-mess2016

Here are the ones that are supported and their categories:
* core (4)
  * retroarch --  RetroArch - frontend to the libretro emulator cores - required by all lr-* emulators
  * emulationstation --  EmulationStation - Frontend used by RetroPie for launching emulators
  * retropiemenu --  RetroPie configuration menu for EmulationStation
  * runcommand --  The 'runcommand' launch script - needed for launching the emulators from the frontend

* main (30)
  * lr-mame2000 --  Arcade emu - MAME 0.37b5 port for libretro
  * lr-stella --  Atari 2600 emulator - Stella port for libretro
  * lr-nestopia --  NES emu - Nestopia (enhanced) port for libretro
  * lr-snes9x2005 --  Super Nintendo emu - Snes9x 1.43 based port for libretro
  * lr-snes9x2002 --  Super Nintendo emu - ARM optimised Snes9x 1.39 port for libretro
  * lr-fbalpha --  Arcade emu - Final Burn Alpha (v0.2.97.42) port for libretro
  * lr-mupen64plus --  N64 emu - Mupen64Plus + GLideN64 for libretro
  * lr-beetle-ngp --  Neo Geo Pocket(Color)emu - Mednafen Neo Geo Pocket core port for libretro
  * lr-fceumm --  NES emu - FCEUmm port for libretro
  * lr-gpsp --  GBA emu - gpSP port for libretro
  * lr-genesis-plus-gx --  Sega 8/16 bit emu - Genesis Plus (enhanced) port for libretro
  * lr-gambatte --  Gameboy Color emu - libgambatte port for libretro
  * lr-beetle-pce-fast --  PCEngine emu - Mednafen PCE Fast port for libretro
  * lr-vecx --  Vectrex emulator - vecx port for libretro
  * lr-mgba --  GBA emulator - MGBA (optimised) port for libretro
  * lr-quicknes --  NES emulator - QuickNES Port for libretro
  * lr-snes9x2010 --  Super Nintendo emu - Snes9x 1.52 based port for libretro
  * lr-pcsx-rearmed --  Playstation emulator - PCSX (arm optimised) port for libretro
  * lr-prosystem --  Atari 7800 ProSystem emu - ProSystem port for libretro
  * lr-caprice32 --  Amstrad CPC emu - Caprice32 port for libretro
  * lr-picodrive --  Sega 8/16 bit emu - picodrive arm optimised libretro core
  * lr-mame2003 --  Arcade emu - MAME 0.78 port for libretro
  * lr-beetle-supergrafx --  SuperGrafx TG-16 emulator - Mednafen PCE Fast port for libretro
  * lr-handy --  Atari Lynx emulator - Handy port for libretro
  * lr-vba-next --  GBA emulator - VBA-M (optimised) port for libretro
  * lr-fuse --  ZX Spectrum emu - Fuse port for libretro
  * mupen64plus --  N64 emulator MUPEN64Plus
  * pifba --  FBA emulator PiFBA
  * mame4all --  MAME emulator MAME4All-Pi

* driver (10)
  * ps3controller --  PS3 controller driver and pair via sixad
  * xpad --  Updated Xpad Linux Kernel driver
  * mkarcadejoystick --  Raspberry Pi GPIO Joystick Driver
  * xboxdrv --  Xbox / Xbox 360 gamepad driver
  * powerblock --  PowerBlock Driver
  * xarcade2jstick --  Xarcade2Jstick
  * controlblock --  ControlBlock Driver
  * steamcontroller --  Standalone Steam Controller Driver
  * snesdev --  SNESDev (Driver for the RetroPie GPIO-Adapter)

* config (14)
  * configedit --  Edit RetroPie/RetroArch configurations
  * retronetplay --  RetroNetplay
  * bashwelcometweak --  Bash Welcome Tweak (shows additional system info on login)
  * resetromdirs --  Reset ownership/permissions of $romdir
  * autostart --  Auto-start Emulation Station / Kodi on boot
  * wifi --  Configure Wifi
  * raspbiantools --  Raspbian related tools
  * audiosettings --  Configure audio settings
  * dispmanx --  Configure emulators to use dispmanx SDL
  * esthemes --  Install themes for Emulation Station
  * samba --  Configure Samba ROM Shares
  * usbromservice --  USB ROM Service
  * wikiview --  RetroPie-Setup Wiki Viewer
  * bluetooth --  Configure Bluetooth Devices

* supplementary (4)
  * golang --  Golang binary install
  * sdl1 --  SDL 1.2.15 with rpi fixes and dispmanx
  * sdl2 --  SDL (Simple DirectMedia Layer) v2.x

* opt (82)
  * lr-parallel-n64 --  N64 emu - Highly modified Mupen64Plus port for libretro
  * lr-beetle-wswan --  Wonderswan emu - Mednafen WonderSwan core port for libretro
  * lr-fbalpha2012 --  Arcade emu - Final Burn Alpha (0.2.97.30) port for libretro
  * lr-nxengine --  Cave Story engine clone - NxEngine port for libretro
  * lr-prboom --  Doom/Doom II engine - PrBoom port for libretro
  * lr-gw --  Game and Watch simulator
  * lr-tyrquake --  Quake 1 engine - Tyrquake port for libretro
  * lr-tgbdual --  Gameboy Color emu - TGB Dual port for libretro
  * lr-bluemsx --  MSX/MSX2/Colecovision emu - blueMSX port for libretro
  * lr-fmsx --  MSX/MSX2 emu - fMSX port for libretro
  * lr-beetle-vb --  Virtual Boy emulator - Mednafen VB (optimised) port for libretro
  * lr-snes9x --  Super Nintendo emu - Snes9x (current) port for libretro
  * lr-ppsspp --  PlayStation Portable emu - PPSSPP port for libretro
  * lr-armsnes --  SNES emu - forked from pocketsnes focused on performance
  * lr-mrboom --  Mr.Boom - 8 players Bomberman clone for libretro.
  * lr-mame2010 --  Arcade emu - MAME 0.139 port for libretro
  * lr-beetle-lynx --  Atari Lynx emulator - Mednafen Lynx Port for libretro, itself a fork of Handy
  * lr-o2em --  Odyssey 2 / Videopac emu - O2EM port for libretro
  * lincity-ng --  lincity-ng - Open Source City Building Game
  * uqm --  The Ur-Quan Masters (Port of DOS game Star Control 2)
  * openttd --  Open Source Simulator Based On Transport Tycoon Deluxe
  * smw --  Super Mario War
  * love --  Love - 2d Game Engine
  * alephone --  AlephOne - Marathon Engine
  * supertux --  SuperTux 2d scrolling platform
  * quake3 --  Quake 3
  * darkplaces-quake --  Quake 1 engine - Darkplaces Quake port with GLES rendering
  * giana --  Giana's Return
  * solarus --  solarus - An Open Source Zelda LttP Engine
  * wolf4sdl --  Wolf4SDL - port of Wolfenstein 3D / Spear of Destiny engine
  * eduke32 --  Duke3D Port
  * xrick --  xrick - Port of Rick Dangerous
  * kodi --  Kodi - Open source home theatre software
  * zdoom --  ZDoom - Enhanced port of the official DOOM source
  * opentyrian --  Open Tyrian - port of the DOS shoot-em-up Tyrian
  * micropolis --  Micropolis - Open Source City Building Game
  * sdlpop --  SDLPoP - Port of Prince of Persia
  * cannonball --  Cannonball - An Enhanced OutRun Engine
  * dxx-rebirth --  DXX-Rebirth (Descent & Descent 2) build from source
  * tyrquake --  Quake 1 engine - TyrQuake port
  * jzintv --  Intellivision emulator
  * stella --  Atari2600 emulator STELLA
  * stratagus --  Stratagus - A strategy game engine to play Warcraft I or II, Starcraft, and some similar open-source games
  * fuse --  ZX Spectrum emulator Fuse
  * scummvm-sdl1 --  ScummVM - built with legacy SDL1 support.
  * basilisk --  Macintosh emulator
  * fbzx --  ZXSpectrum emulator FBZX
  * snes9x --  SNES emulator SNES9X-RPi
  * atari800 --  Atari 8-bit/800/5200 emulator
  * scummvm --  ScummVM
  * advmame --  AdvanceMAME v3.5
  * rpix86 --  DOS Emulator rpix86
  * advmame-1.4 --  AdvanceMAME v1.4
  * pcsx-rearmed --  Playstation emulator - PCSX (arm optimised)
  * coolcv --  CoolCV Colecovision Emulator
  * capricerpi --  Amstrad CPC emulator - port of Caprice32 for the RPI
  * osmose --  Gamegear emulator Osmose
  * ags --  Adventure Game Studio - Adventure game engine
  * simcoupe --  SimCoupe SAM Coupe emulator
  * gngeopi --  NeoGeo emulator GnGeoPi
  * uae4arm --  Amiga emulator with JIT support
  * dosbox --  DOS emulator
  * dgen --  Megadrive/Genesis emulator DGEN
  * hatari --  Atari emulator Hatari
  * reicast --  Dreamcast emulator Reicast
  * openmsx --  MSX emulator OpenMSX
  * uae4all --  Amiga emulator UAE4All
  * xroar --  Dragon / CoCo emulator XRoar
  * frotz --  Z-Machine Interpreter for Infocom games
  * gpsp --  GameBoy Advance emulator
  * zesarux --  ZX Spectrum emulator ZEsarUX
  * linapple --  Apple 2 emulator LinApple
  * vice --  C64 emulator VICE
  * daphne --  Daphne - Laserdisc Emulator
  * pisnes --  SNES emulator PiSNES
  * ppsspp --  PlayStation Portable emulator PPSSPP
  * amiberry --  Amiga emulator with JIT support (forked from uae4arm)
  * advmame-0.94 --  AdvanceMAME v0.94.0
  * scraper --  Scraper for EmulationStation by Steven Selph

* exp (45)
  * lr-desmume --  NDS emu - DESMUME
  * lr-dinothawr --  Dinothawr - standalone libretro puzzle game
  * lr-4do --  3DO emu - 4DO/libfreedo port for libretro
  * lr-vice --  C64 emulator - port of VICE for libretro
  * lr-puae --  P-UAE Amiga emulator port for libretro
  * lr-px68k --  SHARP X68000 Emulator
  * openbor --  OpenBOR - Beat 'em Up Game Engine
  * cdogs-sdl --  C-Dogs SDL - Classic overhead run-and-gun game
  * openblok --  OpenBlok: A Block Dropping Game
  * minecraft --  Minecraft - Pi Edition
  * gemrb --  gemrb - open-source implementation of Infinity Engine
  * minivmac --  Macintosh Plus Emulator
  * residualvm --  ResidualVM - A 3D Game Interpreter
  * px68k --  SHARP X68000 Emulator
  * xm7 --  Fujitsu FM-7 series emulator
  * drastic --  NDS emu - DraStic
  * sdltrs --  Radio Shack TRS-80 Model I/III/4/4P emulator
  * quasi88 --  NEC PC-8801 emulator
  * ti99sim --  TI-99/SIM - Texas Instruments Home Computer Emulator
  * oricutron --  Oricutron Oric 1/Oric Atmos emulator
  * retropie-manager --  Web Based Manager for RetroPie files and configs based on the Recalbox Manager
  * mehstation --  mehstation emulator frontend
  * launchingimages --  Generate runcommand launching images based on emulationstation themes.
  * attractmode --  Attract Mode emulator frontend
  * emulationstation-kids --  EmulationStation with additional UI modes (kids / kiosk)
  * virtualgamepad --  Virtual Gamepad for Smartphone
  * mobilegamepad --  Mobile Universal Gamepad for RetroPie
