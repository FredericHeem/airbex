compilecrypto "litecoind" do
    cryptoName  "litecoin"
    deamonName "litecoind"
    cryptoCode "ltc"
    gitRepo "git://github.com/litecoin-project/litecoin.git"
    gitRef "fe7b87a9761d9819bc2dcb6796b46b17fa775a5c"
    compileCommand "cd src && sudo make -f makefile.unix"
end