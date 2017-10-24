# RetroPie Web Console
Web Based Console built on NodeJS for handling RetroPie Setup.

[RetroPie](https://retropie.org.uk/) is a one in all game console designed for the Raspberry Pi and other Debian based operating systems.

[NodeJS](https://nodejs.org/en/) is a lightweight JavaScript based tool where you can manage 

The purpose of this utility is to simplify the setup of RetroPie, which requires command line knowledge.

Raspberry Pis allow the ability to swap Operating Systems by switching SD cards. The goal of this utility is to simplify the setup of RetroPie on each SD card or each individual Raspberry Pi.

## How to get started
### Install NodeJS
```
curl -sL https://raw.githubusercontent.com/lashower/RetroPieWebConsole/master/loadNode.sh | sudo -E bash -
```

### Download the application
```
cd ~
mkdir -p nodejs
cd nodejs
git clone https://github.com/lashower/RetroPieWebConsole.git
```

### Start the application
```
cd ~/nodejs/RetroPieWebConsole
sudo pm2 start app.js 
```

## Make the application start on reboot
```
crontab -e
#@reboot cd /home/pi/nodejs/RetroPieWebConsole;sudo pm2 start app.js
```
