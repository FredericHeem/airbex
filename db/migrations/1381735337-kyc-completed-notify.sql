UPDATE settings
SET
    notify_email_default = notify_email_default || 'KycCompleted => true',
    notify_web_default = notify_web_default || 'KycCompleted => true';
