#!/bin/bash

node=$(which node)
if [ "${node}" == "" ]; then
    echo "Installing NodeJS"
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install nodejs
else
    echo "Checking NodeJS Version"
    node_version=$(node -v | cut -c2-2)
    if [ $node_version -lt 8 ]; then 
        echo "Updating NodeJS"
        sudo apt-get -y remove node
        curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
        sudo apt-get -y install nodejs
    fi
fi

mongo=$(which mongo)
if [ "${mongo}" == "" ]; then
    echo "Installing MongoDB"
    sudo apt-get -y install mongodb
else
    echo "Checking MongoDB Version"
    mongo_version=$(mongo -version | cut -c24-24)
    if [ "$mongo_version" -lt 2 ]; then
        echo "Updating MongoDB"
        sudo apt-get -y install mongo
    fi
fi

echo "Installing basic packages"
sudo apt-get -y install gcc make libssl-dev libcurl4-openssl-dev

curl -sL https://raw.githubusercontent.com/lashower/raspi2png/master/installer.sh | bash -

pm2=$(which pm2)
if [ "${pm2}" == "" ]; then
    echo "Installing PM2"
    sudo npm install -g pm2
else
    echo "Checking PM2 Version"
    pm2_version=$(pm2 -v | cut -c1-1)
    if [ $pm2_version -lt 2 ]; then
        echo "Updtating PM2"
        sudo npm install -g pm2
        sudo npm install pm2@latest -g ; sudo pm2 update
    fi
fi

cd $HOME
mkdir -p nodejs
cd nodejs
if [ -d 'RetroPieWebConsole' ]; then
    echo "Updating RetroPieWebConsole"
    cd $HOME/nodejs/RetroPieWebConsole
    git pull
    git submodule update
else
    echo "Installing RetroPieWebConsole"
    git clone https://github.com/lashower/RetroPieWebConsole.git
    cd $HOME/nodejs/RetroPieWebConsole
fi
npm install
appname="RetroPieWebConsole"
pingtest=$(sudo pm2 ping $appname)
appid=$(sudo pm2 id $appname)
if [ "$appid" == "[]" ]; then
    echo "Starting up application"
    sudo pm2 start app.js -f --name="$appname"
    echo "Adding auto startup"
    sudo pm2 startup
    sudo pm2 save
fi

chmod -R 777 $HOME/nodejs/RetroPieWebConsole/install.sh 
chmod -R 777 $HOME/nodejs/RetroPieWebConsole/updater.sh

IP="$(ip route get 1 | awk '{print $NF;exit}')";
echo ""
echo "##########################################################"
echo "#                                                        #"
echo "# The Web Console is available at http://${IP}:3000/ #"
echo "#                                                        #"
echo "##########################################################"
