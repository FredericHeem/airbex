echo "127.0.0.1 pgp" | sudo tee -a /etc/hosts
sudo hostname pgp

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y g++ libpq-dev make
curl -L http://www.pgpool.net/download.php?f=pgpool-II-3.2.4.tar.gz | tar xz
 cd pgpool-II-3.2.4
./configure
make
sudo make install
sudo mkdir /var/run/pgpool

# todo: config

sudo pgpool

