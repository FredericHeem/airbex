# Ubuntu 12.04 ebs (8gb) from http://alestic.com/
# Zone: eu-west-1a
# Security group: prod-api
# Ports: 8000 (HTTP)

export environment=production
export prefix=""

sudo apt-get update
sudo apt-get upgrade -y

# Node.js
echo | sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install -y python-software-properties python g++ make nodejs

# PostgreSQL driver
echo | sudo add-apt-repository ppa:pitti/postgresql
sudo apt-get update
sudo apt-get install -y libpq-dev

cd ~
mkdir snow-api
cd snow-api
mkdir app log

tee app/deploy.sh << EOL
#!/bin/bash
mkdir \$1
cd \$1
tar --strip-components=1 -zxvf ../snow-api-\$1.tgz
rm ../snow-api-\$1.tgz
cp ../../config.${environment}.json .
npm install
cd ..
rm current
ln -s \$1 current
sudo stop snow-api
sudo start snow-api
EOL

chmod +x app/deploy.sh

# Git
sudo apt-get install -y git

# Upstart
sudo tee /etc/init/snow-api.conf << EOL
setuid ubuntu
env HOME=/home/ubuntu
env name="snow-api"
start on startup
stop on shutdown

script
    cd ~/\$name
    echo \$\$ > \$name.pid
    export DEBUG="*"
    export NODE_ENV=${environment}
    cp config.\$NODE_ENV.json app/current
    cd app/current
    node . >> ../../log/\$name.log 2>&1
end script

pre-stop script
    rm ~/\$name/\$name.pid
end script
EOL

# Monit
sudo apt-get install monit -y

sudo tee /etc/monit/monitrc << EOL
set daemon 120
set logfile syslog
#set alert a@abrkn.com
set mail-format { from: webmaster@${environment}.snow }
set mailserver localhost

set httpd port 2812
  allow localhost

include /etc/monit/conf.d/*
EOL

sudo tee /etc/monit/conf.d/snow-api << EOL
check process snow-api
    with pidfile /home/ubuntu/snow-api/snow-api.pid
    start program = "/sbin/start snow-api"
    stop program = "/sbin/stop snow-api"
    if failed port 8000 protocol http
        request /v1/currencies
        with timeout 10 seconds
        then restart
EOL

# Config
tee ~/snow-api/config.${environment}.json << EOL
{
    "website_url": "https://${prefix)snow",
    "pg_read_url": {
        "user": "postgres",
        "host": "TODO",
        "database": "snow",
        "ssl": true,
        "password": "postgres"
    },
    "pg_write_url": {
        "user": "postgres",
        "host": "TODO",
        "database": "snow",
        "ssl": true,
        "password": "postgres"
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
    "intercom_secret": "",
    "intercom_app_id": "",
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

# nginx
sudo apt-get install -y nginx

# --- /home/ubuntu/snow-api/nginx.conf
tee /home/ubuntu/snow-api/nginx.conf << EOL
server {
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;

    listen 8010;
    server_name ${prefix}api.snow;
    access_log /home/ubuntu/snow-api/log/access.log;
    error_log /home/ubuntu/snow-api/log/error.log;

    gzip on;
    gzip_http_version 1.1;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types text/plain text/html text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript text/x-js;
    gzip_buffers 16 8k;
    gzip_disable "MSIE [1-6]\.(?!.*SV1)";

    location / {
        proxy_pass http://localhost:8000/;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

# --- make site available and enabled
sudo ln nginx.conf /etc/nginx/sites-available/api.snow
sudo ln /etc/nginx/sites-available/api.snow /etc/nginx/sites-enabled/api.snow

sudo nginx -s reload

vim ~/snow-api/config.${environment}.json

sudo reboot
