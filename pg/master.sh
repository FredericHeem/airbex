# Change computer name
echo "127.0.0.1 pgm" | sudo tee -a /etc/hosts
sudo hostname pgm

sudo apt-get update
sudo apt-get upgrade -y

# Optionally, prepare drive
'''
sudo apt-get install -y xfsprogs
sudo modprobe xfs
sudo mkfs.xfs /dev/xvdf
echo "/dev/xvdf /data xfs noatime 0 0" | sudo tee -a /etc/fstab
sudo mkdir /data
sudo mount /data
'''

# Add pg ppa and update cache
echo | sudo add-apt-repository ppa:pitti/postgresql
sudo apt-get update

# Install pg
sudo apt-get -y install postgresql-9.2 postgresql-client-9.2 postgresql-contrib-9.2 postgresql-server-dev-9.2 libpq-dev

# Stop pg before reconfiguring
sudo /etc/init.d/postgresql stop

sudo tee /etc/postgresql/9.2/main/postgresql.conf << EOL
data_directory = '/data/main'
listen_addresses = '*'
unix_socket_directory = '/var/run/postgresql'
password_encryption = on
EOL

# pg access rules
sudo tee /etc/postgresql/9.2/main/pg_hba.conf << EOL
local all postgres              peer
host  all all 127.0.0.1/32      md5
host  all all 10.0.0.239/32     md5
host  all all 10.0.1.0/16       md5
host  all all 10.0.0.184/32     md5
host  all all ::1/128           md5
EOL

# Optionally, move data directory
'''
sudo mv /var/lib/postgresql/9.2/main /data
'''

# Start pg
sudo /etc/init.d/postgresql start
