# Ubuntu 12.04 from http://alestic.com/
# Ports:
#   9001 (HTTP)

export environment=production
export prefix=""
export api=10.0.0.184:8010

sudo apt-get update
sudo apt-get upgrade -y

# nginx
sudo apt-get install -y nginx

cd ~
mkdir snow-admin
cd snow-admin
mkdir log public

tee /home/ubuntu/snow-admin/nginx.conf << EOL
server {
    listen 9001;
    server_name ${prefix}snow;
    root /home/ubuntu/snow-admin/public/;
    access_log /home/ubuntu/snow-admin/log/access.log;
    error_log /home/ubuntu/snow-admin/log/error.log;

    gzip on;
    gzip_http_version 1.1;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types text/plain text/html text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/javascript text/x-js;
    gzip_buffers 16 8k;
    gzip_disable "MSIE [1-6]\.(?!.*SV1)";

    location /api {
        proxy_pass http://${api};
        rewrite ^/api(/.+)\$ \$1 break;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

sudo nginx -s reload

sudo ln nginx.conf /etc/nginx/sites-available/snow-admin
sudo ln /etc/nginx/sites-available/snow-admin /etc/nginx/sites-enabled/snow-admin

sudo nginx -s reload

sudo reboot
