-- wallet
CREATE TABLE wallet (
   currency_id currency_id NOT NULL,
   height int DEFAULT 0,
   balance decimal(16, 8) DEFAULT 0
);

INSERT INTO wallet(currency_id, height, balance) values('BTC', 0, 0);