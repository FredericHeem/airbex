compilecrypto "logosd" do
    cryptoName  "logos"
    deamonName "logosd"
    cryptoCode "lgs"
    gitRepo "https://github.com/sylvainblot/logos"
    gitRef "9f22c24214ac0db3a0f53d307f2c9b898bd0a7f0"
    compileCommand "rm -rf src/logosd && cd src && sudo make -f makefile.unix"
end