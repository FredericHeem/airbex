DROP VIEW order_depth_view;
DROP VIEW book_view;
DROP VIEW order_view;

CREATE OR REPLACE VIEW order_view AS
 SELECT o.order_id, o.book_id, o.side, o.price, o.volume, o.original,
    b.base_security_id, b.quote_security_id,
    o.cancelled, o.matched, o.user_id, o.hold_id,
    (o.price::double precision / (10::double precision ^ b.scale::double precision))::numeric AS price_decimal,
    (o.volume::double precision / (10::double precision ^ (bs.scale - b.scale)::double precision))::numeric AS volume_decimal,
    (o.original::double precision / (10::double precision ^ (bs.scale - b.scale)::double precision))::numeric AS original_decimal,
    (o.cancelled::double precision / (10::double precision ^ (bs.scale - b.scale)::double precision))::numeric AS cancelled_decimal,
    (o.matched::double precision / (10::double precision ^ (bs.scale - b.scale)::double precision))::numeric AS matched_decimal
   FROM "order" o
   JOIN book b ON b.book_id = o.book_id
   JOIN security bs ON bs.security_id::text = b.base_security_id::text;

CREATE OR REPLACE VIEW book_view AS
 SELECT b.book_id, b.scale, b.base_security_id, b.quote_security_id,
    ( SELECT max(o.price_decimal) AS max
           FROM order_view o
          WHERE o.book_id = b.book_id AND o.side = 0 AND o.volume > 0) AS bid_decimal,
    ( SELECT min(o.price_decimal) AS min
           FROM order_view o
          WHERE o.book_id = b.book_id AND o.side = 1 AND o.volume > 0) AS ask_decimal,
    ( SELECT m.price_decimal
           FROM match_view m
      JOIN "order" bo ON bo.order_id = m.bid_order_id
     WHERE bo.book_id = b.book_id
     ORDER BY m.created DESC
    LIMIT 1) AS last_decimal,
    ( SELECT max(m.price_decimal) AS max
           FROM match_view m
      JOIN "order" bo ON bo.order_id = m.bid_order_id
     WHERE bo.book_id = b.book_id AND age(m.created) < '1 day'::interval) AS high_decimal,
    ( SELECT min(m.price_decimal) AS min
           FROM match_view m
      JOIN "order" bo ON bo.order_id = m.bid_order_id
     WHERE bo.book_id = b.book_id AND age(m.created) < '1 day'::interval) AS low_decimal,
    ( SELECT sum(o.volume_decimal) AS sum
           FROM order_view o
          WHERE o.book_id = b.book_id) AS volume_decimal
   FROM book b
  ORDER BY b.base_security_id, b.quote_security_id;

CREATE OR REPLACE VIEW order_depth_view AS
 SELECT order_view.book_id, order_view.side, order_view.price_decimal,
    sum(order_view.volume_decimal) AS volume_decimal
   FROM order_view
  WHERE order_view.volume > 0
  GROUP BY order_view.book_id, order_view.side, order_view.price_decimal
  ORDER BY order_view.book_id, order_view.price_decimal;
