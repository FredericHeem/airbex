DROP VIEW IF EXISTS vohlc;
DROP VIEW IF EXISTS admin_order_view;                                                              
DROP VIEW IF EXISTS account_transaction_view; 
DROP VIEW IF EXISTS market_summary_view;
DROP VIEW IF EXISTS active_order_view;
DROP VIEW IF EXISTS order_depth_view;
DROP VIEW IF EXISTS match_view;
DROP VIEW IF EXISTS transaction_view;  
DROP VIEW IF EXISTS order_view;
 
ALTER TABLE currency
    ALTER currency_id TYPE text;
    
    