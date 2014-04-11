workercrypto "workers-btc" do
    cryptoName  "bitcoin"
    cryptoCode "BTC"
    workerDir node[:snow][:workers_btc][:app_directory]
    minConf 6
end
 