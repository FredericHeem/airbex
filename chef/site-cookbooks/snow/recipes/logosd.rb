compilecrypto "logosd" do
    cryptoName  "logos"
    deamonName "logosd"
    cryptoCode "lgs"
    gitRepo "https://github.com/sylvainblot/logos"
    gitRef "898887e396a0fc9ec8250a329020987f265b9ab3"
    compileCommand "rm -rf src/logosd && cd src && sudo make -f makefile.unix"
end