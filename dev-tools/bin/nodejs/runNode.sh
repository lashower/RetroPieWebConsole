currDir=$(pwd)
rec="${1}"
usr="${USER}"
if [ ! -z "${2}" ];then
    usr="${2}"
fi
echo "${usr}"
cd ${nodehome}/${rec}
sudo -u $usr pm2 start app.js --name="${rec}"
cd $currDir

