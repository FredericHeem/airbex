compilecrypto "litecoind" do
    cryptoName  "litecoin"
    deamonName "litecoind"
    cryptoCode "ltc"
    gitRepo "git://github.com/litecoin-project/litecoin.git"
    gitRef "v0.10.0.2"
    compileCommand "./autogen.sh && ./configure --enable-tests=false && make"
end