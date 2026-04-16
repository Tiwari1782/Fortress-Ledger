-- ============================================================================
-- PHASE 3 SCHEMA EXTENSION: SPATIAL DATA & ALGORITHMIC LOANS
-- ============================================================================

USE fortress_ledger;

-- 1. SPATIAL GEOMETRY FOR IMPOSSIBLE TRAVEL FRAUD
-- Add location column if not exists
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'fortress_ledger' AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'location');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE transactions ADD COLUMN location POINT NULL SRID 4326', 'SELECT ''location column already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS spatial_fraud_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    attempted_tx_id CHAR(36),
    previous_location POINT SRID 4326,
    attempted_location POINT SRID 4326,
    calculated_speed_kmh DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_impossible_travel;

DELIMITER //
CREATE TRIGGER trg_impossible_travel
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE prev_location POINT;
    DECLARE prev_time DATETIME;
    DECLARE time_diff_hours DECIMAL(10,4);
    DECLARE dist_km DECIMAL(10,2);
    DECLARE speed_kmh DECIMAL(10,2);
    
    IF NEW.location IS NOT NULL THEN
        SELECT location, created_at INTO prev_location, prev_time 
        FROM transactions 
        WHERE sender_id = NEW.sender_id AND location IS NOT NULL 
        ORDER BY created_at DESC LIMIT 1;
        
        IF prev_location IS NOT NULL THEN
            -- Calculate distance
            SET dist_km = ST_Distance_Sphere(prev_location, NEW.location) / 1000;
            SET time_diff_hours = TIMESTAMPDIFF(SECOND, prev_time, NOW()) / 3600;
            
            IF time_diff_hours > 0 THEN
                SET speed_kmh = dist_km / time_diff_hours;
                
                -- Reject if speed > 1200 km/h
                IF speed_kmh > 1200 THEN
                    SET @msg = CONCAT('IMPOSSIBLE_TRAVEL|', speed_kmh);
                    SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = @msg;
                END IF;
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;


-- 2. LOANS & ALGORITHMIC UNDERWRITING
CREATE TABLE IF NOT EXISTS loans (
    id CHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 5.00,
    status ENUM('APPROVED', 'DENIED', 'REPAID') DEFAULT 'APPROVED',
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
    
    -- Business Logic Gate
    IF v_credit_score >= 550 AND p_amount <= (v_avg_daily_balance * 2.0) THEN
        INSERT INTO loans (id, user_id, amount, status, reason) 
        VALUES (v_loan_id, v_user_id, p_amount, 'APPROVED', CONCAT('Score: ', v_credit_score));
        
        -- Mint Money via Central Authority
        UPDATE accounts SET balance = balance + p_amount WHERE id = p_account_id;
        INSERT INTO transactions (id, sender_id, receiver_id, amount, type)
        VALUES (UUID(), NULL, p_account_id, p_amount, 'DEPOSIT');
        
        SELECT 'APPROVED' as status, v_credit_score as score, 'Loan capital instantiated by central bank and deposited.' as message;
    ELSE
        INSERT INTO loans (id, user_id, amount, status, reason) 
        VALUES (v_loan_id, v_user_id, p_amount, 'DENIED', CONCAT('Score: ', v_credit_score, ' inadequate for risk exposure'));
        
        SELECT 'DENIED' as status, v_credit_score as score, 'Algorithmic underwriter denied request due to high risk ratio.' as message;
    END IF;
END //
DELIMITER ;
