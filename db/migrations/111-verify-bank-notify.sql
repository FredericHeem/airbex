UPDATE settings
SET
    notify_email_default = notify_email_default || 'VerifyBankAccount => true',
    notify_web_default = notify_web_default || 'VerifyBankAccount => true';
