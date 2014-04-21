compilecrypto "logosd" do
    cryptoName  "logos"
    deamonName "logosd"
    cryptoCode "lgs"
    gitRepo "https://github.com/sylvainblot/logos"
    gitRef "2e9c5e9404654e9a99a2d52b24137b6c249c253d"
    compileCommand "rm -rf src/logosd && cd src && sudo make -f makefile.unix"
end