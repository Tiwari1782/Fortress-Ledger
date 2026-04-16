USE fortress_ledger;

-- 1. ADD PENDING STATE
ALTER TABLE loans MODIFY status ENUM('PENDING', 'APPROVED', 'DENIED', 'REPAID') DEFAULT 'PENDING';

-- 2. REFACTOR REQUEST LOAN (Advisory Only)
DROP PROCEDURE IF EXISTS sp_request_loan;

DELIMITER //
CREATE PROCEDURE sp_request_loan(
    IN p_account_id VARCHAR(36),
    IN p_amount DECIMAL(15,2)
)
BEGIN
    DECLARE v_user_id VARCHAR(36);
    DECLARE v_avg_daily_balance DECIMAL(15,2);
    DECLARE v_tx_count INT;
    DECLARE v_credit_score INT DEFAULT 500;
    DECLARE v_loan_id CHAR(36);
    
    SELECT user_id INTO v_user_id FROM accounts WHERE id = p_account_id;
    SELECT balance INTO v_avg_daily_balance FROM accounts WHERE id = p_account_id;
    
    SELECT COUNT(*) INTO v_tx_count 
    FROM transactions 
    WHERE (sender_id = p_account_id OR receiver_id = p_account_id) 
    AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Heuristic Scoring
    IF v_avg_daily_balance > 5000 THEN SET v_credit_score = v_credit_score + 100; END IF;
    IF v_tx_count > 5 THEN SET v_credit_score = v_credit_score + 50; END IF;
    
    SET v_loan_id = UUID();
    
    -- Algorithmic Gate: Auto-Deny outright terrible requests
    IF v_credit_score < 550 OR p_amount > (v_avg_daily_balance * 8.0) THEN
        INSERT INTO loans (id, user_id, amount, status, reason) 
        VALUES (v_loan_id, v_user_id, p_amount, 'DENIED', CONCAT('Score: ', v_credit_score, '. Algorithm auto-rejected due to extreme high risk ratios.'));
        
        SELECT 'DENIED' as status, v_credit_score as score, 'Algorithmic underwriter actively denied request due to extreme risk ratios vs liquidity.' as message;
    ELSE
        -- Forward good requests to Admin Desk
        INSERT INTO loans (id, user_id, amount, status, reason) 
        VALUES (v_loan_id, v_user_id, p_amount, 'PENDING', CONCAT('Score: ', v_credit_score, '. Algorithm recommends approval. Awaiting admin manual sign-off.'));
        
        SELECT 'PENDING' as status, v_credit_score as score, 'Algorithm approved risk profile. Forwarded to Admin War Room for final signature.' as message;
    END IF;
END //
DELIMITER ;


-- 3. CREATE ADMIN APPROVAL PROCEDURE
DROP PROCEDURE IF EXISTS sp_approve_loan;

DELIMITER //
CREATE PROCEDURE sp_approve_loan(
    IN p_loan_id VARCHAR(36)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_amount DECIMAL(15,2);
    DECLARE v_user_id VARCHAR(36);
    DECLARE v_account_id VARCHAR(36);
    
    -- Lock loan row
    SELECT status, amount, user_id INTO v_status, v_amount, v_user_id 
    FROM loans WHERE id = p_loan_id FOR UPDATE;
    
    IF v_status = 'PENDING' THEN
        -- Mark as approved
        UPDATE loans SET status = 'APPROVED' WHERE id = p_loan_id;
        
        -- Get user's primary account
        SELECT id INTO v_account_id FROM accounts WHERE user_id = v_user_id ORDER BY created_at ASC LIMIT 1;
        
        -- Mint Money & Bookkeep
        UPDATE accounts SET balance = balance + v_amount WHERE id = v_account_id;
        INSERT INTO transactions (id, sender_id, receiver_id, amount, type)
        VALUES (UUID(), NULL, v_account_id, v_amount, 'DEPOSIT');
        
        SELECT 'SUCCESS' as result;
    ELSE
        SELECT 'INVALID_STATE' as result;
    END IF;
END //
DELIMITER ;
