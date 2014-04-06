Create VPC
---

* Use the _Start VPC Wizard_ to create a _VPC with Public and Private Subnets_
* Edit the _Availability Zone_ of both the _Public_ and _Private_ subnets to _eu-west1a_
* Set the _Key Pair_ to _justcoin.pem_ (`2048 2c:54:45:a5:b4:15:86:6a:1a:ad:de:47:71:2b:9b:dd jc.pub`)
* Create the VPC and note the VPC id and subnet ids

NAT
---

* Stop instance
* Change the _Name_ tag to _jc_prod_nat_
* Change the _Instance Type_ to _t1.micro_
* Security group ("nat"):
  - **Inbound**
  - TCP 22 (any)
  - TCP 25 (any)
  - TCP 80 (any)
  - TCP 443 (any)
  - TCP 587 (any)
  - TCP 9418 (any)
  - TCP 11371 (any)
  - TCP 9333 (from litecoind)
  - TCP 8333 (from bitcoind)
  - TCP 51233 (from workers)

* Start the instance

VPN
---

This section is partially extracted from [Amazon EC2 Appliance (AMI) Quick Start Guide](http://docs.openvpn.net/how-to-tutorialsguides/virtual-platforms/amazon-ec2-appliance-ami-quick-start-guide/)

* Launch an instance (_Classic Wizard_)
* From _Community AMIs_ search for _OpenVPN Access Server_ (`ami-a94559dd`)
* Options:
    - *Instance Type* *t1.micro*
    - Subnet: Public subnet
    - User data:


`
public_hostname=vpn.justcoin.com
admin_user=andreas
admin_pw=temp
`


    - Name: `jc-prod-vpn`
    - Key pair:`justcoin`
    - Security group (create new)
        * Name: `jc-prod-vpn`
        * Inbound (from `0.0.0.0/0`) `TCP 22`, `TCP 443`, `TCP 943`, `UDP 1194`
* Assign an elastic IP to the VPN

Security groups
---

Create the groups
* pgm
* pgs
* bitcoind
* litecoind
* reverse
* admin
* workers
* nat
* vpn
* chef

Chef server
---

* Follow instructions from Opscode's [Install Chef](http://www.opscode.com/chef/install/)
* `dpkg -i chef-server...deb`
* `sudo chef-server-ctl reconfigure`
* `sudo hostname chef.justcoin.internal` (TODO: DNS Server)
` `echo chef.justcoin.internal | sudo tee /etc/hostname`
* Set up your workstation environment following the guide. If you receive errors about `Cheffile` or `Cheffile.lock` missing, you need to run `librarian-chef init` and `librarian-chef install`.
* Modify your `knife.rb` file:

```
# knife.rb
require 'librarian/chef/integration/knife'

current_dir = File.dirname(__FILE__)
log_level                :info
log_location             STDOUT
node_name                'andreas'
client_key               "#{current_dir}/andreas.pem"
validation_client_name   "justcoin-validator"
validation_key           "#{current_dir}/justcoin-validator.pem"
chef_server_url          'https://chef.justcoin.internal'
cookbook_path             Librarian::Chef.install_path, "#{current_dir}/../site-cookbooks"
knife[:aws_ssh_key_id] = "justcoin"
knife[:aws_access_key_id] = ""
knife[:aws_secret_access_key] = ""
```

PostgreSQL
---

### Master

* Create security group `jc-prod-pg`
    - Inbound `TCP 5432` from security groups `jc-prod-vpn` and `jc-prod-api`

Notes
---

VPC id: vpc-81c6baea
Private subnet id: subnet-9bc6baf0 (rtb-87c6baec)
Public subnet id: subnet-9fc6baf4 (rtb-98c6baf3)

jc-prod-vpn: 10.0.0.163

vpn temp pass: tremporarilypasswords
