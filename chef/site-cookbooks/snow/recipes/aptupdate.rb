template "/etc/apt/sources.list" do
    source "apt-sources.list.erb"
end

execute "apt-get-update-periodic" do
  command "apt-get update"
  ignore_failure false
  only_if do
    File.exists?('/var/lib/apt/periodic/update-success-stamp') &&
    File.mtime('/var/lib/apt/periodic/update-success-stamp') < Time.now - 86400
  end
end
