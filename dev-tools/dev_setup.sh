echo -e '\e[1;32m### Installing vim ####\e[0m'
sudo apt-get install vim

echo -e '\e[1;32m### Installing tmux ###\e[0m'
sudo apt-get install tmux

echo -e '\e[1;32m    Getting tmux cheatsheet (tmux-cheatsheet.markdown) \e[0m'
if [ ! -f tmux-cheatsheet.markdown ];then
    wget 'https://gist.github.com/MohamedAlaa/2961058/raw/tmux-cheatsheet.markdown' &>/dev/null
fi
echo -e '\e[1;32m### Setting up /source/alias.props ###\e[0m'
sudo mkdir -p /source
sudo cp source/alias.props /source/alias.props
if [ $(less ~/.bashrc | grep 'alias.props' | wc -l) -eq 0 ]; then
    echo -e '\e[1;32m  Adding /source/alias.props to .bashrc\e[0m'
    sed -i '1 i\source /source/alias.props' ~/.bashrc
else
    echo -e '\e[1;32m   .bashrc already has alias call\e[0m'
fi

echo -e '\e[1;32m### Setting up ~/source/ tools ###\e[0m'
mkdir -p ~/source
cp -r source/common.props ~/source/common.props
cp -r source/node.props ~/source/node.props
cp -r bin ~/
cp vimrc.txt ~/.vimrc
