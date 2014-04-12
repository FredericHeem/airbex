compilecrypto "bitcoind" do
    cryptoName  "bitcoin"
    deamonName "bitcoind"
    cryptoCode "btc"
    gitRepo "git@github.com:bitcoin/bitcoin.git"
    gitRef "0.9.1"
    compileCommand "./autogen.sh && ./configure --enable-tests=false && make"
end