#!/bin/bash
#wget https://github.com/lashower/RetroPie/master/loadNode.sh
echo '####################'
echo '#  general update  #'
echo '####################'
rpi-update
apt-get full-upgrade
apt-get upgrade
apt-get update

echo '####################'
echo '#  NodeJS download #'
echo '####################'
armv=''
for item in $(uname -a); do if [[ $item == "arm"* ]]; then   armv=$item; fi; done
nodefile=$(curl http://nodejs.org/dist/latest/ | sed 's/<[^>]*>//g' | grep "$armv" | grep 'tar.gz' | awk ' { print $1 } ')

echo "## Pulling from http://nodejs.org/dist/latest/${nodefile} ##"
cd /opt
wget "http://nodejs.org/dist/latest/${nodefile}"
echo "## Extracting ${nodefile} ##"
tar -xzf ${nodefile}
rm ${nodefile}
mv node-* nodejs

echo "##########################################"
echo "## Removing old node and npm references ##"
echo "##########################################"
rm -fr /usr/bin/node 2>/dev/null
rm -fr /usr/bin/npm 2>/dev/null

echo "########################################"
echo "## Adding new node and npm references ##"
echo "########################################"
ln -s /opt/nodejs/bin/node /usr/bin/node
ln -s /opt/nodejs/bin/npm /usr/bin/npm

echo "########################################"
echo "## Adding new node and npm references ##"
echo "########################################"
echo 'PATH="${PATH}:/opt/nodejs"' >> /etc/environment
echo 'PATH="${PATH}:/opt/nodejs/bin"' >> /etc/environment
echo 'export PATH' >> /etc/environment

echo "#####################################"
echo "## Adding application dependencies ##"
echo "#####################################"
apt-get -y install mongodb gcc make libssl-dev libcurl4-openssl-dev

echo "########################"
echo "## Installing nodemon ##"
echo "########################"
npm install -g nodemon
