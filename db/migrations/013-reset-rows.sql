TRUNCATE TABLE "security" CASCADE;

INSERT INTO "security" (security_id, scale)  VALUES ('BTC', 8), ('XRP', 6);
INSERT INTO book (base_security_id, quote_security_id, scale) VALUES ('BTC', 'XRP', 3);

INSERT INTO account (security_id, "type") VALUES ('BTC', 'edge');
INSERT INTO account (security_id, "type") VALUES ('XRP', 'edge');
