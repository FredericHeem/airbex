update market
 set askminvolume=100000,
     askmaxprice=200000000,
     bidminvolume=100000,
     bidminprice=1000000,
     name='BTCUSD'
 where base_currency_id='BTC' and quote_currency_id='USD';