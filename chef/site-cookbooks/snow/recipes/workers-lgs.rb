workercrypto "workers-lgs" do
    cryptoName  "logos"
    cryptoCode "LGS"
    workerDir "#{node[:snow][:workers][:app_directory]}-lgs"
    minConf 6
end
 