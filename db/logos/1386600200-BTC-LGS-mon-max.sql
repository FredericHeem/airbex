update market
 set askminvolume=500,
     askmaxprice=10000,
     bidminvolume=500,
     bidminprice=500,
     name='LGSBTC'
 where base_currency_id='LGS';
