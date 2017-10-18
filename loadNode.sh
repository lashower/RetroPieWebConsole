#!/bin/bash
apt-get remove node
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install nodejs

echo "#####################################"
echo "## Adding application dependencies ##"
echo "#####################################"
apt-get -y install mongodb gcc make libssl-dev libcurl4-openssl-dev vim

echo "########################"
echo "## Installing pm2 ##"
echo "########################"
npm install -g pm2
