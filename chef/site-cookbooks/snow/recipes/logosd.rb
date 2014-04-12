compilecrypto "logosd" do
    cryptoName  "logos"
    deamonName "logosd"
    cryptoCode "lgs"
    gitRepo "git@github.com:quicknamecoin/logos.git"
    gitRef "6b80e057741632bda6235d9c4d27a161f064dbb6"
    compileCommand "cd src && sudo make -f makefile.unix"
end