compilecrypto "bitcoind" do
    cryptoName  "bitcoin"
    deamonName "bitcoind"
    cryptoCode "btc"
    gitRepo "git@github.com:bitcoin/bitcoin.git"
    gitRef "v0.10.0"
    compileCommand "./autogen.sh && ./configure --enable-tests=false --with-incompatible-bdb && make"
end