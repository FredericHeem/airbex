
UPDATE currency set scale_display=2 where fiat=true;
UPDATE currency set name='Euro' where currency_id='EUR';
UPDATE currency set name='US Dollar' where currency_id='USD';
UPDATE currency set name='Czech Crown' where currency_id='CZK';