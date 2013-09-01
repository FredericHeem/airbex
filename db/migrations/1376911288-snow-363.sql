UPDATE settings
SET
    notify_email_default = notify_email_default || 'EnableTwoFactor => true, RemoveTwoFactor => true',
    notify_web_default = notify_web_default || 'EnableTwoFactor => true, RemoveTwoFactor => true';
