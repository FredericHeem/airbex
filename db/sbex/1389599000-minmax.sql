update market
 set askminvolume=100000,
     askmaxprice=500000000,
     bidminvolume=100000,
     bidminprice=1000000,
     name='BTCEUR'
 where base_currency_id='BTC' and quote_currency_id='EUR';
 
 update market
 set askminvolume=100000,
     askmaxprice=500000000,
     bidminvolume=100000,
     bidminprice=1000000,
     name='BTCCHF'
 where base_currency_id='BTC' and quote_currency_id='CHF';