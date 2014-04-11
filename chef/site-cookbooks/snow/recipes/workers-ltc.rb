workercrypto "workers-ltc" do
    cryptoName  "litecoin"
    cryptoCode "LTC"
    workerDir node[:snow][:workers_ltc][:app_directory]
    minConf 6
end
