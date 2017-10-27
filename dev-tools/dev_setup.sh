echo 'Installing vim'
#sudo apt-get install vim
echo 'Setting up /source/alias.props'
sudo mkdir -p /source
sudo cp source/alias.props /source/alias.props
if [ $(less ~/.bashrc | grep 'alias.props' | wc -l) -eq 0 ]; then
    echo 'Adding /source/alias.props to .bashrc'
    sed -i '1 i\source /source/alias.props' ~/.bashrc
else
    echo '.bashrc already has alias call'
fi

echo 'Setting up ~/source/ tools'
mkdir -p ~/source
cp -r source/common.props ~/source/common.props
cp -r source/node.props ~/source/node.props
cp -r bin ~/
cp vimrc.txt ~/.vimrc
