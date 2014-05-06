UPDATE settings
SET
    notify_email_default = notify_email_default || 'PurchaseOrderCreate => true',
    notify_web_default = notify_web_default || 'PurchaseOrderCreate => true';
 
