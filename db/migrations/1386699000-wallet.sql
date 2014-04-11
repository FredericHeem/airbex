-- wallet
CREATE TABLE wallet (
   currency_id currency_id NOT NULL,
   height int,
   balance decimal(16, 8)
);

INSERT INTO wallet(currency_id, height) values('BTC', 0);