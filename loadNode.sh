#!/bin/bash
apt-get remove node
curl -sL https://deb.nodesource.com/setup_8.x | bash -
apt-get -y install nodejs mongodb gcc make libssl-dev libcurl4-openssl-dev vim
npm install -g pm2
