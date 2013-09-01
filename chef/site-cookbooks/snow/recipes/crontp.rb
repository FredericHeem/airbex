cron "ntpdate" do
  minute "*/15"
  user "root"
  command "/usr/sbin/ntpdate"
end
