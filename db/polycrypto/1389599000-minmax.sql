update market
 set askminvolume=100000,
     askmaxprice=100000000,
     bidminvolume=100000,
     bidminprice=1000,
     name='LTCBTC'
 where base_currency_id='LTC' and quote_currency_id='BTC';
 
 update market
 set askminvolume=100000000,
     askmaxprice=10000,
     bidminvolume=100000000,
     bidminprice=10,
     name='DOGEBTC'
 where base_currency_id='DOGE' and quote_currency_id='BTC';