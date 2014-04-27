update currency
 set withdraw_min=100,
     withdraw_max=1000000000,
     name='Logos',
     address_regex='^(L|m|n)[A-Za-z0-9]{26,33}$'
 where currency_id='LGS';
