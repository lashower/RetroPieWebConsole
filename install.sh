#!/bin/bash
sudo apt-get remove node
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get -y install nodejs mongodb gcc make libssl-dev libcurl4-openssl-dev vim
sudo npm install -g pm2

cd $HOME
mkdir -p nodejs
cd nodejs
git clone https://github.com/lashower/RetroPieWebConsole.git
cd $HOME/nodejs/RetroPieWebConsole
npm install
cd $HOME/nodejs/RetroPieWebConsole
sudo pm2 start app.js -f --name="RetroPieWebConsole"
pm2 startup
pm2 save

IP="$(ip route get 1 | awk '{print $NF;exit}')";
echo ""
echo "##########################################################"
echo "#                                                        #"
echo "# The Web Console is available at http://${IP}:3000/ #"
echo "#                                                        #"
echo "##########################################################"
