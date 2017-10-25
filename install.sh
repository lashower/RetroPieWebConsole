#!/bin/bash
apt-get remove node
curl -sL https://deb.nodesource.com/setup_8.x | bash -
apt-get -y install nodejs mongodb gcc make libssl-dev libcurl4-openssl-dev vim
npm install -g pm2

USER_HOME=$(getent passwd $SUDO_USER | cut -d: -f6)
cd $USER_HOME
sudo -u $SUDO_USER mkdir -p nodejs
cd nodejs
sudo -u $SUDO_USER git clone https://github.com/lashower/RetroPieWebConsole.git
cd $USER_HOME/nodejs/RetroPieWebConsole
sudo -u $SUDO_USER npm install
cd $USER_HOME/nodejs/RetroPieWebConsole
pm2 start app.js -f --name="RetroPieWebConsole"
pm2 startup
pm2 save

IP="$(ip route get 1 | awk '{print $NF;exit}')";
echo ""
echo "##########################################################"
echo "#                                                        #"
echo "# The Web Console is available at http://${IP}:3000/ #"
echo "#                                                        #"
echo "##########################################################"
