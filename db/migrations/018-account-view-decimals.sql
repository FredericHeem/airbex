CREATE OR REPLACE VIEW account_view AS 
 SELECT a.account_id, a.security_id, a.balance, a.hold, a.type, a.user_id, 
    a.balance - a.hold AS available, 
    (a.balance - a.hold)::double precision / (10::double precision ^ s.scale::double precision) AS available_decimal,
    a.balance / 10^s.scale balance_decimal,
    a.hold / 10^s.scale hold_decimal
   FROM account a
   JOIN security s ON s.security_id::text = a.security_id::text;
