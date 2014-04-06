ALTER TABLE "user"
    ADD COLUMN notify_web hstore NOT NULL DEFAULT(''::hstore);

ALTER TABLE settings
    ADD COLUMN notify_web_default hstore DEFAULT((
        'AdminBankAccountCredit => true,' ||
        'AdminEditUser => true,' ||
        'AdminWithdrawCancel => true,' ||
        'AdminWithdrawProcess => true,' ||
        'AdminWithdrawComplete => true,' ||
        'AddBankAccount => true,' ||
        'VerifyBankAccount => true,' ||
        'ChangePassword => true,' ||
        'RemoveApiKey => true,' ||
        'CreateOrder => true,' ||
        'CancelOrder => true,' ||
        'SendToUser => true,' ||
        'ReceiveFromUser => true,' ||
        'ConvertBid => true,' ||
        'UpdateUser => true,' ||
        'CreateVoucher => true,' ||
        'Withdraw => true,' ||
        'FillOrder => true,' ||
        'Credit => true,' ||
        'WithdrawComplete => true'
    )::hstore);

CREATE VIEW activity_web AS
SELECT a.*
FROM
    activity a
        INNER JOIN "user" u ON u.user_id = a.user_id,
    settings s
WHERE
    ((s.notify_web_default || u.notify_web || s.notify_user_visible) -> a.type)::bool IS TRUE;
