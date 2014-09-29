compilecrypto "litecoind" do
    cryptoName  "litecoin"
    deamonName "litecoind"
    cryptoCode "ltc"
    gitRepo "git://github.com/litecoin-project/litecoin.git"
    gitRef "v0.8.7.4"
    compileCommand "cd src && sudo make -f makefile.unix"
end