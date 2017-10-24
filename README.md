# RetroPie Web Console
Version: Alpha
Web Based Console built on NodeJS for handling RetroPie Setup.

[RetroPie](https://retropie.org.uk/) is a one in all game console designed for the Raspberry Pi and other Debian based operating systems.

[NodeJS](https://nodejs.org/en/) is a lightweight JavaScript based tool where you can manage 

The purpose of this utility is to simplify the setup of RetroPie, which requires command line knowledge.

Raspberry Pis allow the ability to swap Operating Systems by switching SD cards. The goal of this utility is to simplify the setup of RetroPie on each SD card or each individual Raspberry Pi.

## Initial Setup

Run these commands either through ssh or through terminal
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
cd ~/nodejs/RetroPieWebConsole
npm install
```

### Start the application
```
cd ~/nodejs/RetroPieWebConsole
sudo pm2 start app.js 
```

### Make the application start on reboot
```
crontab -e
```
Add in this line to the bottom:
```
@reboot cd /home/pi/nodejs/RetroPieWebConsole;sudo pm2 start app.js
```

## The Web console
### Open the main page
First you have to get your ip address. Here is a simple command to get it
```
ip addr show wlan0 | grep -Po "inet \K[\d.]+"
```
Once you have that ip address, open a browser and go to this url:
http://{ipaddress}:3000/

### Execute a basic install
From the main page, select Basic Install from the top.
Click the check box to confirm you want to perform a basic install.
Click the button.

### Execute other installs
If you want to do more than basic installs, select the Manage Packages section.
From there you can search and select which packages you want to install.
