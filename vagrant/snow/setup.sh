#!/bin/bash

#Show database tables
#sudo -u 'postgres' psql -d snow -c "SELECT table_schema,table_name FROM information_schema.tables ORDER BY table_schema,table_name;"

#Alert Email
alertemail="support@example.com"

#Ubuntu user password
ubuntupwd="ubuntu"

#Postgresql password
postgrespwd="pgsecret"

#Postgresql listenning addresses
listen_addresses="*"

#Postgresql allowed hosts
pgallowedhosts="0.0.0.0/0"

#Environment
export environment="dev"
export prefix="dev"
export domain="example.com"
export pghost="127.0.0.1"

#Wallet settings
bitcoinhost="10.0.1.6"
bitcoinuser="bitcoinrpc"
bitcoinport="8332"
bitcoinpwd="correcthorsebatterystaple"
litecoinhost="10.0.1.7"
litecoinuser="litecoinrpc"
litecoinport="9332"
litecoinpwd="correcthorsebatterystaple"
rippleaccount="rXXXXXXXXXXXXXX"
ripplesecret="sXXXXXXXXXXXXX"
ripplelocaluri="10.0.1.8:5006"
rippleuri="wss://s1.ripple.com:51233"

#Set user ubuntu password
echo "ubuntu:$ubuntupwd" | chpasswd

# Auto update time
echo "ntpdate ntp.ubuntu.com" | sudo tee /etc/cron.daily/ntpdate
sudo chmod 755 /etc/cron.daily/ntpdate

#Install required packages
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y python-software-properties
sudo add-apt-repository -y ppa:pitti/postgresql
sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y python g++ make nodejs libpq-dev nginx monit git postgresql-9.2 postgresql-client-9.2 postgresql-contrib-9.2 postgresql-server-dev-9.2 libpq-dev super

# Stop pg before reconfiguring
sudo service postgresql stop

#postgresql.conf
sudo tee /etc/postgresql/9.2/main/postgresql.conf << EOL
data_directory = '/var/lib/postgresql/9.2/main'
listen_addresses = '${listen_addresses}'
password_encryption = on
unix_socket_directory '/var/run/postgresql'
#wal_level = hot_standby
#max_wal_senders = 1
#wal_keep_segments = 32
#synchronous_standby_names = 'walreceiver'
EOL

#pg_hba.conf
sudo tee /etc/postgresql/9.2/main/pg_hba.conf << EOL
local all all trust
host all all 127.0.0.1/32 trust
host replication postgres 10.0.1.0/24  trust # Replication
host all postgres ${pgallowedhosts} md5
host all all 10.0.1.0/24 trust # pool
EOL

#Restart Postgresql
sudo service postgresql start

#Change postgresql password
sudo -u 'postgres' psql -c "ALTER ROLE postgres WITH ENCRYPTED PASSWORD '${postgrespwd}'";
sudo -u 'postgres' psql -c "CREATE DATABASE snow";
sudo -u 'postgres' psql -c "GRANT ALL PRIVILEGES ON DATABASE snow to postgres;";

#Clone justcoin repo
cd /home/ubuntu
sudo -u 'ubuntu' git clone -b develop https://github.com/justcoin/snow.git

#Create log folders
sudo -u 'ubuntu' mkdir /home/ubuntu/snow/api/log
sudo -u 'ubuntu' mkdir /home/ubuntu/snow/admin/log
sudo -u 'ubuntu' mkdir /home/ubuntu/snow/workers/log

#Configure monit
sudo tee /etc/monit/monitrc << EOL
set daemon 120
set logfile syslog
set alert $alertemail
set mail-format { from: api@${environment}.snow }
set mailserver localhost

set httpd port 2812
  allow localhost

include /etc/monit/conf.d/*
EOL

#Configure monit to watch API
sudo tee /etc/monit/conf.d/snow-api << EOL
check process snow-api
    with pidfile /home/ubuntu/snow/api/api.pid
    start program = "/sbin/start snow-api"
    stop program = "/sbin/stop snow-api"
    if failed port 8000 protocol http
        request /v1/currencies
        with timeout 10 seconds
        then restart
EOL

#Configure monit to watch workers
sudo tee /etc/monit/conf.d/snow-workers << EOL
check process snow-workers
    with pidfile /home/ubuntu/snow/workers/snow-workers.pid
    start program = "/sbin/start snow-workers"
    stop program = "/sbin/stop snow-workers"
EOL

#Startup script for API
sudo tee /etc/init/snow-api.conf << EOL
setuid ubuntu
env snow-api=/home/ubuntu/snow/api
env name="snow-api"
start on startup
stop on shutdown

script
    cd \$snow-api
    echo \$\$ > \$name.pid
    export DEBUG="*"
    export NODE_ENV=${environment}
    node . >> log/\$name.log 2>&1
end script

pre-stop script
    rm \$name/\$name.pid
end script
EOL

#Startup script for worker
sudo tee /etc/init/snow-workers.conf << EOL
setuid ubuntu
env snow-workers=/home/ubuntu/snow/worker
env name="snow-workers"
start on startup
stop on shutdown

script
    cd \$snow-workers
    echo \$\$ > \$name.pid
    export DEBUG="*"
    export NODE_ENV=${environment}
    node ./bin/all >> log/\$name.log 2>&1
end script

pre-stop script
    rm ~/\$name/\$name.pid
end script
EOL

# Config for API
tee /home/ubuntu/snow/api/config.${environment}.json << EOL
{
    "website_url": "https://api.${prefix}.${domain}",
    "pg_read_url": {
        "user": "postgres",
        "host": "${pghost}",
        "database": "snow",
        "ssl": false,
        "password": "${postgrespwd}"
    },
    "pg_write_url": {
        "user": "postgres",
        "host": "${pghost}",
        "database": "snow",
        "ssl": false,
        "password": "${postgrespwd}"
    },
    "pg_native": true,
    "port": 8000,
    "ripple_federation": {
        "domain": "snow",
        "currencies": [
            {
                "currency": "XRP"
            },
            {
                "currency": "BTC",
                "issuer": ""
            }
        ]
    },
    "raven": "",
    "bde_api_key": "",
     "smtp": {
            "service": "Mandrill",
            "options": {
                "auth": {
                    "user": "",
                    "pass": ""
                }
            }
        }
}
EOL

chown ubuntu:ubuntu /home/ubuntu/snow/api/config.${environment}.json

#Config for worker
tee /etc/ubuntu/snow/worker/config.json << EOL
{
    "pg_url": "${pghost}",
    "btc_host": "${bitcoinhost}",
    "btc_user": "${bitcoinuser}",
    "btc_port": "${bitcoinport}",
    "btc_pass": "${bitcoinpwd}",
    "ltc_host": "${litecoinhost}",
    "ltc_user": "${litecoinuser}",
    "ltc_port": "${litecoinport}",
    "ltc_pass": "${litecoinpwd}",
    "ltc_minconf": "2",
    "btc_minconf": "2",
    "raven": "",
    "ripple_account": "${rippleaccount}",
    "ripple_secret": "${ripplesecret}",
    "local_ripple_uri": "${ripplelocaluri}",
    "ripple_uri": "${rippleuri}"
}
EOL

chown ubuntu:ubuntu /home/ubuntu/snow/workers/config.${environment}.json

# Create nginx site config for api
tee /etc/nginx/sites-available/api.snow << EOL
server {
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;

    listen 8010;
    server_name api.${prefix}.${domain};
    access_log /home/ubuntu/snow/api/log/access.log;
    error_log /home/ubuntu/snow/api/log/error.log;

    gzip on;
    gzip_http_version 1.1;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript text/x-js;
    gzip_buffers 16 8k;
    gzip_disable "MSIE [1-6]\.(?!.*SV1)";

    location / {
        proxy_pass http://localhost:8000/;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

# Create nginx site config for admin
tee /etc/nginx/sites-available/admin.snow << EOL
server {
    listen 9001;
    server_name admin.${prefix}.${domain};
    root /home/ubuntu/snow/admin/public/;
    access_log /home/ubuntu/snow/admin/log/access.log;
    error_log /home/ubuntu/snow/admin/log/error.log;

    gzip on;
    gzip_http_version 1.1;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types text/plain text/html text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript text/x-js;
    gzip_buffers 16 8k;
    gzip_disable "MSIE [1-6]\.(?!.*SV1)";

    location /api {
        proxy_pass http://127.0.0.1;
        rewrite ^/api(/.+)\$ \$1 break;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

#Make sites avaialble
sudo ln /etc/nginx/sites-available/api.snow /etc/nginx/sites-enabled/api.snow
sudo ln /etc/nginx/sites-available/admin.snow /etc/nginx/sites-enabled/admin.snow

#Install node.js global packages
npm install -g jake shelljs bower grunt-cli

#Install snow-api dependencies
cd /home/ubuntu/snow/api
sudo npm install
sudo chown -R ubuntu:ubuntu node_modules

#Install snow-admin dependencies and build
cd /home/ubuntu/snow/admin
sudo npm install
sudo grunt
sudo chown -R ubuntu:ubuntu node_modules

#Install snow-worker dependencies
cd /home/ubuntu/snow/workers
sudo npm install
sudo chown -R ubuntu:ubuntu node_modules

#Populate the database
cd /home/ubuntu/snow/db
sudo npm install
sudo chown -R ubuntu:ubuntu node_modules
sudo node ./node_modules/pg-migrate/bin/pg-migrate -d /home/ubuntu/snow/db/migrations/ -u postgres://postgres@127.0.0.1/snow
sudo -u 'postgres' psql -d snow -c "insert into currency (currency_id,scale,fiat) values('CAD',8,true);"
sudo -u 'postgres' psql -d snow -c "insert into currency (currency_id,scale,fiat) values('XRP',8,false);"
sudo -u 'postgres' psql -d snow -c "insert into currency (currency_id,scale,fiat) values('BTC',8,false);"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('CAD','edge');"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('CAD','fee');"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('XRP','edge');"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('XRP','fee');"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('BTC','edge');"
sudo -u 'postgres' psql -d snow -c "insert into account (currency_id,type) values('BTC','fee');"
sudo -u 'postgres' psql -d snow -c "insert into market (market_id,scale,base_currency_id,quote_currency_id) values(1,8,'XRP','CAD');"
sudo -u 'postgres' psql -d snow -c "insert into ripple_account (address,ledger_index) values('${rippleaccount}',3000000);"


sudo service snow-api start
sudo service snow-workers start
sudo service nginx reload

