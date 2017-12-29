if [ "$(which raspi2png)" == "" ]; then
    echo "Installing Raspi2png"
    curl -sL https://raw.githubusercontent.com/lashower/raspi2png/master/installer.sh | bash -
fi

#sudo pm2 stop RetroPieWebConsole | tee -a '/home/pi/updater.txt'
git pull | tee -a '/home/pi/updater.txt'
git submodule update | tee -a '/home/pi/updater.txt'
npm install | tee -a '/home/pi/updater.txt'
#sudo pm2 start RetroPieWebConsole | tee -a '/home/pi/updater.txt'
