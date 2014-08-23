-- 10 min to withdraw
UPDATE currency set min_conf=4 where currency_id='LTC';
UPDATE currency set conf_time=150 where currency_id='LTC';

UPDATE currency set min_conf=4 where currency_id='DRK';
UPDATE currency set conf_time=150 where currency_id='DRK';

UPDATE currency set min_conf=10 where currency_id='DOGE';
UPDATE currency set conf_time=60 where currency_id='DOGE';