USE fortress_ledger;

-- ============================================================================
-- FortressLedger Phase 2: Advanced Mechanics Update
-- ============================================================================

-- 1. SCHEDULED TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS scheduled_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    receiver_account VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interval_days INT NOT NULL,
    next_execution DATETIME NOT NULL,
    status ENUM('ACTIVE', 'PAUSED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_st_execution (next_execution, status)
);

-- 3. STORED PROCEDURE: sp_process_scheduled_transfers
-- Uses a Cursor to bulk-process pending subscriptions/payments
DROP PROCEDURE IF EXISTS sp_process_scheduled_transfers;
DELIMITER //
CREATE PROCEDURE sp_process_scheduled_transfers()
BEGIN
    DECLARE v_id INT;
    DECLARE v_sender_id VARCHAR(36);
    DECLARE v_receiver_account VARCHAR(20);
    DECLARE v_amount DECIMAL(15,2);
    DECLARE v_interval INT;
    DECLARE v_done INT DEFAULT 0;
    
    DECLARE cur CURSOR FOR
        SELECT id, sender_id, receiver_account, amount, interval_days
        FROM scheduled_transfers
        WHERE status = 'ACTIVE' AND next_execution <= NOW();
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    
    -- Fast exit if nothing to process
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        -- Failsafe log could go here
    END;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_id, v_sender_id, v_receiver_account, v_amount, v_interval;
        IF v_done THEN LEAVE read_loop; END IF;
        
        -- Call our existing extremely robust atomic transfer procedure!
        CALL sp_atomic_transfer(v_sender_id, v_receiver_account, v_amount, @out_status, @out_msg);
        
        IF @out_status = 0 THEN
            -- Success: advance the next_execution date
            UPDATE scheduled_transfers 
            SET next_execution = DATE_ADD(NOW(), INTERVAL v_interval MINUTE) -- MINUTE instead of DAY for demo purposes!
            WHERE id = v_id;
        ELSE
            -- Insufficient funds or frozen: pause the subscription
            UPDATE scheduled_transfers 
            SET status = 'PAUSED'
            WHERE id = v_id;
        END IF;
    END LOOP;
    CLOSE cur;
END //
DELIMITER ;

-- 4. THE MYSQL EVENT SCHEDULER
-- We will run it every 1 MINUTE specifically for the portfolio DEMO so you don't wait a month!
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_process_scheduled_transfers;
DELIMITER //
CREATE EVENT evt_process_scheduled_transfers
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    CALL sp_process_scheduled_transfers();
END //
DELIMITER ;
