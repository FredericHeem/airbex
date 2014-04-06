UPDATE settings
SET
    notify_email_default = notify_email_default || 'WithdrawRequest => true',
    notify_web_default = notify_web_default || 'WithdrawRequest => true';
 
UPDATE settings
SET
    notify_email_default = notify_email_default || 'CancelWithdrawRequest => true',
    notify_web_default = notify_web_default || 'CancelWithdrawRequest => true';
 