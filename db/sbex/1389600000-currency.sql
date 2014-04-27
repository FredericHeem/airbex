update currency
 set withdraw_min=100000,
     withdraw_max=1000000000,
     name='Litecoin',
     address_regex='^(L|3|m|n)[A-Za-z0-9]{26,33}$'
 where currency_id='LTC';
 
update currency
 set withdraw_min=100000000,
     withdraw_max=1000000000000000,
     name='Dogecoin',
     address_regex='^(D|3|m|n)[A-Za-z0-9]{26,33}$'
 where currency_id='DOGE';