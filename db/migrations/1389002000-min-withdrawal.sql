-- currency table
-- 20140426 add min and max withdrawal for currencies
ALTER TABLE currency
  ADD column withdraw_min bigint NOT NULL default 100000;
  
ALTER TABLE currency
  ADD column withdraw_max bigint NOT NULL default 5000000000;
  
ALTER TABLE currency
  ADD column name text NOT NULL default '';
  
ALTER TABLE currency
    ADD COLUMN address_regex text NOT NULL default '^(1|3|m|n|L|D)[A-Za-z0-9]{26,33}$';
    
update currency
 set withdraw_min=100000,
     withdraw_max=1000000000,
     name='Bitcoin',
     address_regex='^(1|3|m|n)[A-Za-z0-9]{26,33}$'
 where currency_id='BTC';
    
    
    
