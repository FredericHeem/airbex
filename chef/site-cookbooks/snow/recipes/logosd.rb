compilecrypto "logosd" do
    cryptoName  "logos"
    deamonName "logosd"
    cryptoCode "lgs"
    gitRepo "git@github.com:quicknamecoin/logos.git"
    gitRef "3ea1e4cb49b4f905ceec138f80d3136c4a98a150"
    compileCommand "rm -rf src/logosd && cd src && sudo make -f makefile.unix"
end