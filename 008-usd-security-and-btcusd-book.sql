INSERT INTO security (security_id, scale)
VALUES ('USD', 5);

INSERT INTO book (scale, base_security_id, quote_security_id)
VALUES (3, 'BTC', 'USD');

INSERT INTO account (security_id, type) VALUES ('USD', 'edge');