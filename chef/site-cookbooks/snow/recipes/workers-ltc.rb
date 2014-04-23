workercrypto "workers-ltc" do
    cryptoName  "litecoin"
    cryptoCode "LTC"
    workerDir "#{node[:snow][:workers][:app_directory]}-ltc"
    minConf 6
end
