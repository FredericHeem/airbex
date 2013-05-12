# Change computer name
echo "127.0.0.1 pgm" | sudo tee -a /etc/hosts
sudo hostname pgm

sudo apt-get update
sudo apt-get upgrade -y

# Add pg ppa and update cache
echo | sudo add-apt-repository ppa:pitti/postgresql
sudo apt-get update

# Install pg
sudo apt-get -y install postgresql-9.2 postgresql-client-9.2 postgresql-contrib-9.2 postgresql-server-dev-9.2 libpq-dev

# Stop pg before reconfiguring
sudo service postgresql stop

# Optionally, prepare drive
'''
sudo apt-get install -y xfsprogs
sudo modprobe xfs
sudo mkfs.xfs /dev/xvdf
echo "/dev/xvdf /data xfs noatime 0 0" | sudo tee -a /etc/fstab
sudo mkdir /data
sudo mount /data
'''

# PostgreSQL config
sudo tee /etc/postgresql/9.2/main/postgresql.conf << EOL
data_directory = '/data/main'
listen_addresses = '*'
password_encryption = on
unix_socket_directory '/var/run/postgresql'
wal_level = hot_standby
max_wal_senders = 1
wal_keep_segments = 32
EOL

# PostgreSQL ACL
sudo tee /etc/postgresql/9.2/main/pg_hba.conf << EOL
local all all trust
host all postgres 10.0.0.239/32 md5 #VPN
host all postgres 10.0.0.184/32 md5 #API
host replication postgres 10.0.1.0/24  trust # Replication
host all postgres 10.0.1.0/24 md5
EOL

# Optionally, move data directory
'''
sudo mv /var/lib/postgresql/9.2/main /data
'''

# TODO: Change username of postgres user
