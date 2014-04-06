include_recipe "cron"

cron_d "ntpdate" do
  minute 15
  command "/usr/sbin/ntpdate time.windows.com"
end
