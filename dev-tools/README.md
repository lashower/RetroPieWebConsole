# Developer Intro
I develop most of my scripts using a putty ssh session into my Pi.

Over the years, I have found that the source command is extremely useful because you can create essentially properties files that allow you to move from place to place.

Included in this folder is a lot of shorthand source scripts and shell scripts that I use in development.

To set up, all you have to do is run ./dev_setup.sh

That will add all of my scripts for easy use.

## Default Shorthand commands
These commands will be added for your use:

#### l
Same thing as ls -CF, whic shouls all the folders and files.
EX:
```
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ l
bashrc.txt  bin/  dev_setup.sh*  source/  vimrc.txt
```

#### ll
Same thing as ls -ltr. It outputs all the folders and files.
EX:
```
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ ll
total 24
-rw-r--r-- 1 pi pi 7139 Oct 26 12:37 bashrc.txt
drwxr-xr-x 3 pi pi 4096 Oct 26 12:02 bin
-rwxrwxrwx 1 pi pi  554 Oct 26 21:30 dev_setup.sh
drwx------ 2 pi pi 4096 Oct 26 12:04 source
-rw-r--r-- 1 pi pi  202 Oct 26 12:01 vimrc.txt
```

#### la
Shows both visible and hidden files and folders. Same thing as ls -la

EX:
```
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ la
total 32
drwxr-xr-x 4 pi pi 4096 Oct 26 21:30 .
drwxr-xr-x 9 pi pi 4096 Oct 26 12:33 ..
-rw-r--r-- 1 pi pi 7139 Oct 26 12:37 bashrc.txt
drwxr-xr-x 3 pi pi 4096 Oct 26 12:02 bin
-rwxrwxrwx 1 pi pi  554 Oct 26 21:30 dev_setup.sh
drwx------ 2 pi pi 4096 Oct 26 12:04 source
-rw-r--r-- 1 pi pi  202 Oct 26 12:01 vimrc.txt
```

#### lh
Shows files and folders with human readable file sizes. Same thing as ls -lSh
EX:
```
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ lh
total 24K
-rw-r--r-- 1 pi pi 7.0K Oct 26 12:37 bashrc.txt
drwxr-xr-x 3 pi pi 4.0K Oct 26 12:02 bin
drwx------ 2 pi pi 4.0K Oct 26 12:04 source
-rwxrwxrwx 1 pi pi  554 Oct 26 21:30 dev_setup.sh
-rw-r--r-- 1 pi pi  202 Oct 26 12:01 vimrc.txt
```

#### myip
Displays your current ip address.
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ myip
10.0.0.79

#### tree
My little update to the existing tree command. I found that it appears weird without this fix.

#### untar
Shorthand for running tar xf to extract a tar file.

#### ungtar
Shorthand for running the tar zxf command to extract a gzip file.

#### nano
Adds color schemes to nano.

#### emu
Shorthand to run emulationstation.

#### less
Tweak to the less command so that it shows color schemes.

## Node Props
After running ~/source/node.props you will have these options available to you.
Keep in mind, my application is expected to run as sudo with a user.

You cannot run it directly as root because RetroPie-Setup scripts checks the sudo user for all installs.
Correct example:
```
pi@testpi:~/nodejs/RetroPieWebConsole $ sudo pm2 start app.js -f --name="RetroPieWebConsole"
```node

Incorrect example:

```
pi@testpi:~/nodejs/RetroPieWebConsole $ sudo su
pi@testpi:~/nodejs/RetroPieWebConsole $ pm2 start app.js -f --name="RetroPieWebConsole"
```

### Commands
#### rn {application} [user]
Will run a node app using pm2. Keep in mind RetroPieWebConsole is always running by default.

EX:
```
rn RetroPieWebConsole root
pi@testpi:~/nodejs/RetroPieWebConsole/dev-tools $ rn RetroPieWebConsole root
root
[PM2] Applying action restartProcessId on app [RetroPieWebConsole](ids: 0)
[PM2] [RetroPieWebConsole](0) ✓
[PM2] Process successfully started
┌────────────────────┬────┬──────┬───────┬─────────┬─────────┬────────┬─────┬───────────┬──────┬──────────┐
│ App name           │ id │ mode │ pid   │ status  │ restart │ uptime │ cpu │ mem       │ user │ watching │
├────────────────────┼────┼──────┼───────┼─────────┼─────────┼────────┼─────┼───────────┼──────┼──────────┤
│ RetroPieWebConsole │ 0  │ fork │ 29308 │ online  │ 0       │ 0s     │ 66% │ 11.7 MB   │ root │ disabled │
│ app                │ 1  │ fork │ 0     │ stopped │ 0       │ 0      │ 0%  │ 0 B       │ root │ disabled │
└────────────────────┴────┴──────┴───────┴─────────┴─────────┴────────┴─────┴───────────┴──────┴──────────┘
Use `pm2 show <id|name>` to get more details about an app
```

#### monit
Runs pm2 monit command, which allows you to see the logs for your application.

### Variables
#### $nodehome
Routes to ~/nodejs
EX:
```
cd $nodehome
```

#### $nh
$nodehome was to long 
```
cd $nh
```

#### $njs
$nh might be hard to remember

### Shell scripts
#### runNode.sh
It is what the nh command hooks into.
Location is ~/bin/nodejs/runNode.sh
It can be used to run any node application using pm2 as long.
