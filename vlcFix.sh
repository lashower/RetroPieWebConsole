libvlccore_dev=$(dpkg-query -l | grep 'libvlccore-dev' | grep 'ii' | awk ' { print $3 }')
libvlccore8=$(dpkg-query -l | grep 'libvlccore8' | grep 'ii' | awk ' { print $3 }')
vlc_data=$(dpkg-query -l | grep 'vlc-data' | grep 'ii' | awk ' { print $3 }')

if [ ! "$libvlccore_dev" == "2.2.6-1~deb9u1+rpi1" ]; then
    echo -e '\e[1;32mDowngrading libvlccore-dev to 2.2.6-1~deb9u1+rpi1\e[0m'
    sudo apt-get -y remove libvlccore-dev;
    sudo apt-get -y install libvlccore-dev=2.2.6-1~deb9u1+rpi1;
else
    echo -e "\e[1;32mlibvlccore-dev is the proper version\e[0m"
fi

if [ ! "$libvlccore8" == "2.2.6-1~deb9u1+rpi1" ]; then
    echo -e "\e[1;32mDowngrading libvlccore8 to 2.2.6-1~deb9u1+rpi1\e[0m";
    sudo apt-get -y remove libvlccore8;
    sudo apt-get -y install libvlccore8=2.2.6-1~deb9u1+rpi1;
else
    echo -e "\e[1;32mlibvlccore8 is the proper version\e[0m"
fi

if [ ! "$vlc_data" == "2.2.6-1~deb9u1+rpi1" ]; then
    echo -e "\e[1;32mDowngrading vlc-data to 2.2.6-1~deb9u1+rpi1\e[0m";
    sudo apt-get -y remove vlc-data;
    sudo apt-get -y install vlc-data=2.2.6-1~deb9u1+rpi1;
else
    echo -e "\e[1;32mvlc-data is the proper version\e[0m"
fi

echo -e "\e[1;32mInstalling vlc\e[0m"
sudo apt-get -y install vlc
