#sudo pm2 stop RetroPieWebConsole | tee -a '/home/pi/updater.txt'
git pull | tee -a '/home/pi/updater.txt'
git submodule update | tee -a '/home/pi/updater.txt'
npm install | tee -a '/home/pi/updater.txt'
#sudo pm2 start RetroPieWebConsole | tee -a '/home/pi/updater.txt'