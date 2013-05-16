snow-ops
===

This repository contains schematics of the [Justcoin](https://justcoin.com) deployment and installation instructions.

Network topology
---

The solution is hosted with Amazon AWS using their Virtual Private Cloud product. The setup closely follows what the VPC documentation refers to as [Scenario 2](http://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario2.html)

![VPC Scenario 2 with one private subnet and one public subnet](http://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/images/Case2_Diagram.png)

Administration access
---

The setup deviates from scenario 2 in that administrators use VPN is used to connect to the public subnet. The VPN is handled by a dedicated [OpenVPN Access Server](http://openvpn.net/index.php/access-server/cloudmachines/513-access-server-amazon-vpc.html) instance.

Machines on both the private and public network allow SSH access (using a private key) only from the VPN instance.

