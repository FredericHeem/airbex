UPDATE market 
SET fee_bid_maker = 0,
    fee_ask_maker = 0;
    
UPDATE market 
SET fee_bid_taker = 0.003,
    fee_ask_taker = 0.003
WHERE base_currency_id = 'LTC';
     
UPDATE market 
SET fee_bid_taker = 0.003,
    fee_ask_taker = 0.003
WHERE base_currency_id = 'DOGE';

UPDATE market 
SET fee_bid_taker = 0.003,
    fee_ask_taker = 0.003
WHERE base_currency_id = 'DRK';