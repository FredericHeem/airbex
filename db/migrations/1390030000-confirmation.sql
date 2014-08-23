ALTER TABLE currency
  ADD column conf_time int NOT NULL default 600;
 
ALTER TABLE currency
  ADD column min_conf int NOT NULL default 6;

UPDATE currency set min_conf=2 where currency_id='BTC';