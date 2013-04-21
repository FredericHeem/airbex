ALTER TABLE "match"
ADD COLUMN created timestamp without time zone NOT NULL DEFAULT now();

DROP VIEW books_overview;

CREATE OR REPLACE VIEW books_overview AS
SELECT b.book_id, b.base_security_id, b.quote_security_id, b.scale,
    ( SELECT aoa.price
           FROM active_order aoa
          WHERE aoa.book_id = b.book_id AND aoa.side = 1
          GROUP BY aoa.price
          ORDER BY aoa.price
         LIMIT 1) AS ask_price,
    ( SELECT sum(aoa.volume) AS volume
           FROM active_order aoa
          WHERE aoa.book_id = b.book_id AND aoa.side = 1
          GROUP BY aoa.price
          ORDER BY aoa.price
         LIMIT 1) AS ask_volume,
    ( SELECT aoa.price
           FROM active_order aoa
          WHERE aoa.book_id = b.book_id AND aoa.side = 0
          GROUP BY aoa.price
          ORDER BY aoa.price DESC
         LIMIT 1) AS bid_price,
    ( SELECT sum(aoa.volume) AS volume
           FROM active_order aoa
          WHERE aoa.book_id = b.book_id AND aoa.side = 0
          GROUP BY aoa.price
          ORDER BY aoa.price DESC
         LIMIT 1) AS bid_volume,
     (
        SELECT m.price
        FROM "match" m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id
        ORDER BY m.match_id DESC
        LIMIT 1
     ) AS last_price,
     (
        SELECT MAX(m.price)
        FROM "match" m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id AND age(m.created) < '1 day'::interval
        LIMIT 1
     ) AS high_price,
     (
        SELECT MIN(m.price)
        FROM "match" m
        INNER JOIN "order" bo ON bo.order_id = m.bid_order_id
        WHERE bo.book_id = b.book_id AND age(m.created) < '1 day'::interval
        LIMIT 1
     ) AS low_price,
     (
        SELECT SUM(o.volume)
        FROM "order" o
        WHERE o.book_id = b.book_id
        LIMIT 1
     ) AS volume
   FROM book b
   JOIN security bs ON bs.security_id::text = b.base_security_id::text
   JOIN security qs ON qs.security_id::text = b.quote_security_id::text
  ORDER BY b.base_security_id, b.quote_security_id;
