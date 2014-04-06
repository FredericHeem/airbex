apt_repository "ec2-consistent-snapshot" do
  uri "http://ppa.launchpad.net/alestic/ppa/ubuntu"
  distribution node[:lsb][:codename]
  components ["main"]
  keyserver "pgp.mit.edu"
  key "C300EE8C"
end

package "ec2-consistent-snapshot" do
  options "--force-yes"
end

package "xfsprogs" do
end

template "/usr/bin/ebs-snapshot.sh" do
    source "ebs-snapshot.sh.erb"
    owner "root"
    group "root"
    mode 0755
    variables :aws_bag => Chef::EncryptedDataBagItem.load("aws", 'main')
end
