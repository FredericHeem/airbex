update currency
 set active=false
 where currency_id='CZK';
 
 update market
 set active=false
 where quote_currency_id='CZK';
 
update account
set active=false
where currency_id='CZK';
  