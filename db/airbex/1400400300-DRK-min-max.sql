update currency set withdraw_max=2000000000 where currency_id='BTC';
update currency set withdraw_max=10000000000 where currency_id='LTC';
update market set askminvolume=100000, bidminvolume=100000  where base_currency_id='DRK';
  