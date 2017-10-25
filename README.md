# RetroPie Web Console
Version: Alpha
Web Based Console built on NodeJS for handling RetroPie Setup.

[RetroPie](https://retropie.org.uk/) is a one in all game console designed for the Raspberry Pi and other Debian based operating systems.

[NodeJS](https://nodejs.org/en/) is a lightweight JavaScript based tool where you can manage 

The purpose of this utility is to simplify the setup of RetroPie, which requires command line knowledge.

Raspberry Pis allow the ability to swap Operating Systems by switching SD cards. The goal of this utility is to simplify the setup of RetroPie on each SD card or each individual Raspberry Pi.

## Initial Setup

Run these commands either through ssh or through terminal
### Install RetroPie Web Console
```
curl -sL https://raw.githubusercontent.com/lashower/RetroPieWebConsole/master/install.sh | bash -
```

## The Web console
### Open the main page
At the end of the install, it provides you with the full URL. EX:
```
##########################################################
#                                                        #
# The Web Console is available at http://10.0.0.##:3000/ #
#                                                        #
##########################################################
```

I suggest you bookmark that URL for later use.

### Execute a basic install
From the main page, select Basic Install from the top.
Click the check box to confirm you want to perform a basic install.
Click the button.

### Execute other installs
If you want to do more than basic installs, select the Manage Packages section.
From there you can search and select which packages you want to install.

## More Details
For more details and screenshots, check out the wiki.
