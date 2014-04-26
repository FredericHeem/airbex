update market
 set askminvolume=100,
     askmaxprice=10000,
     bidminvolume=100,
     bidminprice=5,
     name='LGSBTC'
 where base_currency_id='LGS';
