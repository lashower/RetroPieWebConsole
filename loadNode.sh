#!/bin/bash
#wget https://github.com/lashower/RetroPie/master/loadNode.sh
rpi-update
apt-get full-upgrade
apt-get upgrade
apt-get update
armv=''
for item in $(uname -a); do if [[ $item == "arm"* ]]; then   armv=$item; fi; done
nodefile=$(curl http://nodejs.org/dist/latest/ | sed 's/<[^>]*>//g' | grep "$armv" | grep 'tar.gz' | awk ' { print $1 } ')
wget "http://nodejs.org/dist/latest/${nodefile}"
mv ${nodefile} /opt
cd /opt
tar -xzf ${nodefile}
rm ${nodefile}
mv node-* nodejs
rm -fr /usr/bin/node 2>/dev/null
rm -fr /usr/bin/npm 2>/dev/null
ln -s /opt/nodejs/bin/node /usr/bin/node
ln -s /opt/nodejs/bin/npm /usr/bin/npm
echo 'PATH="${PATH}:/opt/nodejs"' >> /etc/profile
echo 'PATH="${PATH}:/opt/nodejs/bin"' >> /etc/profile
echo 'export PATH' >> /etc/profile
apt-get install mongo
apt-get install libcurl4-openssl-dev
npm install -g nodemon
