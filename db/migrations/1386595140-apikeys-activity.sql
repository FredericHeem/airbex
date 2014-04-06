UPDATE settings
SET
    notify_email_default = notify_email_default || 'ApiKeyCreate => true',
    notify_web_default = notify_web_default || 'ApiKeyCreate => true';
 
