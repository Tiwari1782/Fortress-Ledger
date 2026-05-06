-- ============================================================================
-- FortressLedger — Master Schema (All Phases Consolidated)
-- Run once on a fresh MySQL 8+ instance:
--   mysql -u root -p < schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS fortress_ledger;
USE fortress_ledger;


-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(36)  PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        ENUM('ADMIN', 'CUSTOMER') DEFAULT 'CUSTOMER',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id          VARCHAR(36)  PRIMARY KEY,
    user_id     VARCHAR(36)  NOT NULL,
    account_no  VARCHAR(20)  UNIQUE NOT NULL,
    balance     DECIMAL(15,2) DEFAULT 0.00,
    status      ENUM('ACTIVE', 'FROZEN') DEFAULT 'ACTIVE',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_positive_balance CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
    id          VARCHAR(36)  PRIMARY KEY,
    sender_id   VARCHAR(36),
    receiver_id VARCHAR(36),
    amount      DECIMAL(15,2) NOT NULL,
    type        ENUM('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') NOT NULL,
    location    POINT NULL SRID 4326,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES accounts(id),
    FOREIGN KEY (receiver_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    entity_id   VARCHAR(36)  NOT NULL,
    entity_type VARCHAR(20)  DEFAULT 'ACCOUNT',
    action      VARCHAR(50)  NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    admin_id    VARCHAR(36),
    changed_by  VARCHAR(36)  DEFAULT NULL,
    chain_hash  VARCHAR(64)  DEFAULT NULL,
    timestamp   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Loans: starts with PENDING state (Phase 4 final version)
CREATE TABLE IF NOT EXISTS loans (
    id            CHAR(36)     PRIMARY KEY,
    user_id       VARCHAR(36)  NOT NULL,
    amount        DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2)  DEFAULT 5.00,
    status        ENUM('PENDING', 'APPROVED', 'DENIED', 'REPAID') DEFAULT 'PENDING',
    reason        VARCHAR(255),
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spatial_fraud_logs (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    user_id              VARCHAR(36) NOT NULL,
    attempted_tx_id      CHAR(36),
    previous_location    POINT SRID 4326,
    attempted_location   POINT SRID 4326,
    calculated_speed_kmh DECIMAL(10,2),
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_transfers (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    sender_id        VARCHAR(36)   NOT NULL,
    receiver_account VARCHAR(20)   NOT NULL,
    amount           DECIMAL(15,2) NOT NULL,
    interval_days    INT           NOT NULL,
    next_execution   DATETIME      NOT NULL,
    status           ENUM('ACTIVE', 'PAUSED') DEFAULT 'ACTIVE',
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_st_execution (next_execution, status)
);

CREATE TABLE IF NOT EXISTS fraud_summary (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    sender_id    VARCHAR(36)   NOT NULL,
    account_no   VARCHAR(20),
    tx_count     INT           NOT NULL,
    total_volume DECIMAL(15,2) NOT NULL,
    window_start TIMESTAMP     NULL,
    refreshed_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fraud_sender (sender_id)
);

CREATE TABLE IF NOT EXISTS monthly_statements (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    account_id       VARCHAR(36)   NOT NULL,
    tx_id            VARCHAR(36),
    tx_date          TIMESTAMP     NULL,
    description      VARCHAR(100),
    debit            DECIMAL(15,2) DEFAULT 0,
    credit           DECIMAL(15,2) DEFAULT 0,
    running_balance  DECIMAL(15,2),
    statement_period VARCHAR(7),
    generated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stmt_account (account_id, statement_period)
);

-- Partitioned transactions table (reference DDL; migration requires downtime)
CREATE TABLE IF NOT EXISTS transactions_partitioned (
    id          VARCHAR(36)   NOT NULL,
    sender_id   VARCHAR(36),
    receiver_id VARCHAR(36),
    amount      DECIMAL(15,2) NOT NULL,
    type        ENUM('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') NOT NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),
    INDEX idx_part_sender   (sender_id,   created_at),
    INDEX idx_part_receiver (receiver_id, created_at)
)
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p202504 VALUES LESS THAN (202505),
    PARTITION p202505 VALUES LESS THAN (202506),
    PARTITION p202506 VALUES LESS THAN (202507),
    PARTITION p202507 VALUES LESS THAN (202508),
    PARTITION p202508 VALUES LESS THAN (202509),
    PARTITION p202509 VALUES LESS THAN (202510),
    PARTITION p202510 VALUES LESS THAN (202511),
    PARTITION p202511 VALUES LESS THAN (202512),
    PARTITION p202512 VALUES LESS THAN (202601),
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p202603 VALUES LESS THAN (202604),
    PARTITION p202604 VALUES LESS THAN (202605),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);


-- ============================================================================
-- SECTION 2: COMPOSITE INDEXES
-- ============================================================================

-- Transaction history by sender + time range
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = database() AND table_name = 'transactions' AND index_name = 'idx_tx_sender_time');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tx_sender_time   ON transactions(sender_id,   created_at)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Transaction history by receiver + time range
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = database() AND table_name = 'transactions' AND index_name = 'idx_tx_receiver_time');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tx_receiver_time ON transactions(receiver_id, created_at)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Analytics by type + time range
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = database() AND table_name = 'transactions' AND index_name = 'idx_tx_type_time');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tx_type_time     ON transactions(type,        created_at)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Standalone time index for partition pruning / fraud velocity
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = database() AND table_name = 'transactions' AND index_name = 'idx_tx_created');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_tx_created       ON transactions(created_at)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Audit log lookups
SET @idx = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = database() AND table_name = 'audit_logs' AND index_name = 'idx_audit_entity');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_audit_entity     ON audit_logs(entity_id, timestamp)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- ============================================================================
-- SECTION 3: HELPER FUNCTION (Row-Level Security)
-- ============================================================================

DROP FUNCTION IF EXISTS fn_get_current_user_id;

DELIMITER //
CREATE FUNCTION fn_get_current_user_id() RETURNS VARCHAR(36)
NO SQL
BEGIN
    RETURN @current_user_id;
END //
DELIMITER ;


-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_audit_balance;
DROP TRIGGER IF EXISTS trg_audit_chain_hash;
DROP TRIGGER IF EXISTS trg_audit_accounts_update;
DROP TRIGGER IF EXISTS trg_audit_accounts_insert;
DROP TRIGGER IF EXISTS trg_audit_transactions_insert;
DROP TRIGGER IF EXISTS trg_audit_users_insert;
DROP TRIGGER IF EXISTS trg_audit_users_update;
DROP TRIGGER IF EXISTS trg_impossible_travel;

-- ── 4a. SHA-256 chain hash — tamper-evident audit trail ──────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_chain_hash
BEFORE INSERT ON audit_logs
FOR EACH ROW
BEGIN
    DECLARE v_prev_hash VARCHAR(64);

    SELECT chain_hash INTO v_prev_hash
    FROM audit_logs ORDER BY id DESC LIMIT 1;

    IF v_prev_hash IS NULL THEN
        SET v_prev_hash = 'GENESIS_BLOCK_FORTRESS_LEDGER';
    END IF;

    SET NEW.chain_hash = SHA2(CONCAT(
        COALESCE(NEW.entity_id,   ''),
        COALESCE(NEW.entity_type, ''),
        COALESCE(NEW.action,      ''),
        COALESCE(NEW.old_value,   ''),
        COALESCE(NEW.new_value,   ''),
        CAST(NEW.timestamp AS CHAR),
        v_prev_hash
    ), 256);
END //
DELIMITER ;

-- ── 4b. Accounts UPDATE ───────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_accounts_update
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF OLD.balance != NEW.balance OR OLD.status != NEW.status THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
        VALUES (
            'ACCOUNT', NEW.id, 'UPDATE',
            JSON_OBJECT('balance', OLD.balance, 'status', OLD.status),
            JSON_OBJECT('balance', NEW.balance, 'status', NEW.status),
            @current_user_id
        );
    END IF;
END //
DELIMITER ;

-- ── 4c. Accounts INSERT ───────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_accounts_insert
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'ACCOUNT', NEW.id, 'INSERT', NULL,
        JSON_OBJECT('account_no', NEW.account_no, 'user_id', NEW.user_id,
                    'balance', NEW.balance, 'status', NEW.status),
        @current_user_id
    );
END //
DELIMITER ;

-- ── 4d. Transactions INSERT ───────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_transactions_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'TRANSACTION', NEW.id, 'INSERT', NULL,
        JSON_OBJECT(
            'sender_id',   COALESCE(NEW.sender_id,   'SYSTEM'),
            'receiver_id', COALESCE(NEW.receiver_id, 'SYSTEM'),
            'amount', NEW.amount,
            'type',   NEW.type
        ),
        @current_user_id
    );
END //
DELIMITER ;

-- ── 4e. Users INSERT ──────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_users_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'USER', NEW.id, 'INSERT', NULL,
        JSON_OBJECT('email', NEW.email, 'role', NEW.role),
        @current_user_id
    );
END //
DELIMITER ;

-- ── 4f. Users UPDATE ──────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_users_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.role != NEW.role OR OLD.email != NEW.email THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
        VALUES (
            'USER', NEW.id, 'UPDATE',
            JSON_OBJECT('email', OLD.email, 'role', OLD.role),
            JSON_OBJECT('email', NEW.email, 'role', NEW.role),
            @current_user_id
        );
    END IF;
END //
DELIMITER ;

-- ── 4g. Impossible-travel fraud detection ────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_impossible_travel
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE prev_location POINT;
    DECLARE prev_time     DATETIME;
    DECLARE time_diff_hours DECIMAL(10,4);
    DECLARE dist_km         DECIMAL(10,2);
    DECLARE speed_kmh       DECIMAL(10,2);

    IF NEW.location IS NOT NULL THEN
        SELECT location, created_at INTO prev_location, prev_time
        FROM transactions
        WHERE sender_id = NEW.sender_id AND location IS NOT NULL
        ORDER BY created_at DESC LIMIT 1;

        IF prev_location IS NOT NULL THEN
            SET dist_km         = ST_Distance_Sphere(prev_location, NEW.location) / 1000;
            SET time_diff_hours = TIMESTAMPDIFF(SECOND, prev_time, NOW()) / 3600;

            IF time_diff_hours > 0 THEN
                SET speed_kmh = dist_km / time_diff_hours;

                IF speed_kmh > 1200 THEN
                    SET @msg = CONCAT('IMPOSSIBLE_TRAVEL|', speed_kmh);
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = @msg;
                END IF;
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;


-- ============================================================================
-- SECTION 5: STORED PROCEDURES
-- ============================================================================

-- ── 5a. sp_atomic_transfer ────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_atomic_transfer;

DELIMITER //
CREATE PROCEDURE sp_atomic_transfer(
    IN  p_sender_user_id     VARCHAR(36),
    IN  p_receiver_account_no VARCHAR(20),
    IN  p_amount             DECIMAL(15,2),
    OUT p_status_code        INT,
    OUT p_message            VARCHAR(255)
)
BEGIN
    DECLARE v_sender_id      VARCHAR(36);
    DECLARE v_receiver_id    VARCHAR(36);
    DECLARE v_sender_balance DECIMAL(15,2);
    DECLARE v_sender_status  VARCHAR(10);
    DECLARE v_receiver_status VARCHAR(10);
    DECLARE v_first_lock     VARCHAR(36);
    DECLARE v_second_lock    VARCHAR(36);
    DECLARE v_tx_id          VARCHAR(36);
    DECLARE v_dummy_bal      DECIMAL(15,2);
    DECLARE v_dummy_status   VARCHAR(10);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = -1;
        SET p_message = 'Transaction failed due to database error';
    END;

    IF p_amount <= 0 THEN
        SET p_status_code = -2;
        SET p_message = 'Invalid transfer amount';
    ELSE
        SELECT id INTO v_sender_id   FROM accounts WHERE user_id    = p_sender_user_id        LIMIT 1;
        SELECT id INTO v_receiver_id FROM accounts WHERE account_no = p_receiver_account_no  LIMIT 1;

        IF v_sender_id IS NULL THEN
            SET p_status_code = -3; SET p_message = 'Sender account not found';
        ELSEIF v_receiver_id IS NULL THEN
            SET p_status_code = -4; SET p_message = 'Receiver account not found';
        ELSEIF v_sender_id = v_receiver_id THEN
            SET p_status_code = -5; SET p_message = 'Cannot transfer to yourself';
        ELSE
            START TRANSACTION;

            -- Canonical lock ordering: always acquire lower UUID first
            IF v_sender_id < v_receiver_id THEN
                SET v_first_lock = v_sender_id; SET v_second_lock = v_receiver_id;
            ELSE
                SET v_first_lock = v_receiver_id; SET v_second_lock = v_sender_id;
            END IF;

            SELECT balance, status INTO v_dummy_bal, v_dummy_status FROM accounts WHERE id = v_first_lock  FOR UPDATE;
            SELECT balance, status INTO v_dummy_bal, v_dummy_status FROM accounts WHERE id = v_second_lock FOR UPDATE;

            SELECT balance, status INTO v_sender_balance,   v_sender_status   FROM accounts WHERE id = v_sender_id;
            SELECT status          INTO v_receiver_status                      FROM accounts WHERE id = v_receiver_id;

            IF v_sender_status != 'ACTIVE' THEN
                ROLLBACK; SET p_status_code = -6; SET p_message = 'Sender account is frozen';
            ELSEIF v_receiver_status != 'ACTIVE' THEN
                ROLLBACK; SET p_status_code = -7; SET p_message = 'Receiver account is frozen';
            ELSEIF v_sender_balance < p_amount THEN
                ROLLBACK; SET p_status_code = -8; SET p_message = 'Insufficient funds';
            ELSE
                UPDATE accounts SET balance = balance - p_amount WHERE id = v_sender_id;
                UPDATE accounts SET balance = balance + p_amount WHERE id = v_receiver_id;

                SET v_tx_id = UUID();
                INSERT INTO transactions (id, sender_id, receiver_id, amount, type)
                VALUES (v_tx_id, v_sender_id, v_receiver_id, p_amount, 'TRANSFER');

                COMMIT;
                SET p_status_code = 0;
                SET p_message = CONCAT('Transfer successful. TxID: ', v_tx_id);
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;

-- ── 5b. sp_generate_monthly_statement ────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_generate_monthly_statement;

DELIMITER //
CREATE PROCEDURE sp_generate_monthly_statement(
    IN p_account_id VARCHAR(36),
    IN p_year       INT,
    IN p_month      INT
)
BEGIN
    DECLARE v_tx_id          VARCHAR(36);
    DECLARE v_sender_id      VARCHAR(36);
    DECLARE v_receiver_id    VARCHAR(36);
    DECLARE v_amount         DECIMAL(15,2);
    DECLARE v_type           VARCHAR(20);
    DECLARE v_created_at     TIMESTAMP;
    DECLARE v_running_balance DECIMAL(15,2) DEFAULT 0;
    DECLARE v_done           INT DEFAULT 0;
    DECLARE v_period         VARCHAR(7);

    DECLARE cur CURSOR FOR
        SELECT t.id, t.sender_id, t.receiver_id, t.amount, t.type, t.created_at
        FROM transactions t
        WHERE (t.sender_id = p_account_id OR t.receiver_id = p_account_id)
          AND YEAR(t.created_at) = p_year AND MONTH(t.created_at) = p_month
        ORDER BY t.created_at ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    SET v_period = CONCAT(p_year, '-', LPAD(p_month, 2, '0'));

    -- Opening balance: sum of all prior transactions + assumed initial deposit
    SELECT COALESCE(SUM(
        CASE
            WHEN receiver_id = p_account_id THEN  amount
            WHEN sender_id   = p_account_id THEN -amount
            ELSE 0
        END
    ), 0) + 1000.00
    INTO v_running_balance
    FROM transactions
    WHERE (sender_id = p_account_id OR receiver_id = p_account_id)
      AND created_at < CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01');

    DELETE FROM monthly_statements WHERE account_id = p_account_id AND statement_period = v_period;

    INSERT INTO monthly_statements (account_id, tx_id, tx_date, description, running_balance, statement_period)
    VALUES (p_account_id, 'OPENING',
            CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01'),
            'Opening Balance', v_running_balance, v_period);

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_tx_id, v_sender_id, v_receiver_id, v_amount, v_type, v_created_at;
        IF v_done THEN LEAVE read_loop; END IF;

        IF v_sender_id = p_account_id THEN
            SET v_running_balance = v_running_balance - v_amount;
            INSERT INTO monthly_statements (account_id, tx_id, tx_date, description, debit, running_balance, statement_period)
            VALUES (p_account_id, v_tx_id, v_created_at, CONCAT(v_type, ' - Sent'), v_amount, v_running_balance, v_period);
        ELSE
            SET v_running_balance = v_running_balance + v_amount;
            INSERT INTO monthly_statements (account_id, tx_id, tx_date, description, credit, running_balance, statement_period)
            VALUES (p_account_id, v_tx_id, v_created_at, CONCAT(v_type, ' - Received'), v_amount, v_running_balance, v_period);
        END IF;
    END LOOP;
    CLOSE cur;

    INSERT INTO monthly_statements (account_id, tx_id, tx_date, description, running_balance, statement_period)
    VALUES (p_account_id, 'CLOSING',
            LAST_DAY(CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01')),
            'Closing Balance', v_running_balance, v_period);

    SELECT * FROM monthly_statements
    WHERE account_id = p_account_id AND statement_period = v_period
    ORDER BY id;
END //
DELIMITER ;

-- ── 5c. sp_process_scheduled_transfers ───────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_process_scheduled_transfers;

DELIMITER //
CREATE PROCEDURE sp_process_scheduled_transfers()
BEGIN
    DECLARE v_id               INT;
    DECLARE v_sender_id        VARCHAR(36);
    DECLARE v_receiver_account VARCHAR(20);
    DECLARE v_amount           DECIMAL(15,2);
    DECLARE v_interval         INT;
    DECLARE v_done             INT DEFAULT 0;

    DECLARE cur CURSOR FOR
        SELECT id, sender_id, receiver_account, amount, interval_days
        FROM scheduled_transfers
        WHERE status = 'ACTIVE' AND next_execution <= NOW();

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN END;  -- Failsafe

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_id, v_sender_id, v_receiver_account, v_amount, v_interval;
        IF v_done THEN LEAVE read_loop; END IF;

        CALL sp_atomic_transfer(v_sender_id, v_receiver_account, v_amount, @out_status, @out_msg);

        IF @out_status = 0 THEN
            -- Advance schedule (MINUTE for demo; change to DAY for production)
            UPDATE scheduled_transfers
            SET next_execution = DATE_ADD(NOW(), INTERVAL v_interval MINUTE)
            WHERE id = v_id;
        ELSE
            -- Pause on failure (insufficient funds / frozen account)
            UPDATE scheduled_transfers SET status = 'PAUSED' WHERE id = v_id;
        END IF;
    END LOOP;
    CLOSE cur;
END //
DELIMITER ;

-- ── 5d. sp_request_loan (Phase 4: advisory + PENDING flow) ───────────────────
DROP PROCEDURE IF EXISTS sp_request_loan;

DELIMITER //
CREATE PROCEDURE sp_request_loan(
    IN p_account_id VARCHAR(36),
    IN p_amount     DECIMAL(15,2)
)
BEGIN
    DECLARE v_user_id           VARCHAR(36);
    DECLARE v_avg_daily_balance DECIMAL(15,2);
    DECLARE v_tx_count          INT;
    DECLARE v_credit_score      INT DEFAULT 500;
    DECLARE v_loan_id           CHAR(36);

    SELECT user_id  INTO v_user_id           FROM accounts WHERE id = p_account_id;
    SELECT balance  INTO v_avg_daily_balance FROM accounts WHERE id = p_account_id;

    SELECT COUNT(*) INTO v_tx_count
    FROM transactions
    WHERE (sender_id = p_account_id OR receiver_id = p_account_id)
      AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY);

    -- Heuristic scoring
    IF v_avg_daily_balance > 5000 THEN SET v_credit_score = v_credit_score + 100; END IF;
    IF v_tx_count > 5            THEN SET v_credit_score = v_credit_score + 50;  END IF;

    SET v_loan_id = UUID();

    IF v_credit_score < 550 OR p_amount > (v_avg_daily_balance * 8.0) THEN
        -- Auto-deny: extreme risk
        INSERT INTO loans (id, user_id, amount, status, reason)
        VALUES (v_loan_id, v_user_id, p_amount, 'DENIED',
                CONCAT('Score: ', v_credit_score, '. Algorithm auto-rejected due to extreme high risk ratios.'));

        SELECT 'DENIED'  AS status, v_credit_score AS score,
               'Algorithmic underwriter actively denied request due to extreme risk ratios vs liquidity.' AS message;
    ELSE
        -- Forward good requests to admin for final sign-off
        INSERT INTO loans (id, user_id, amount, status, reason)
        VALUES (v_loan_id, v_user_id, p_amount, 'PENDING',
                CONCAT('Score: ', v_credit_score, '. Algorithm recommends approval. Awaiting admin manual sign-off.'));

        SELECT 'PENDING' AS status, v_credit_score AS score,
               'Algorithm approved risk profile. Forwarded to Admin War Room for final signature.' AS message;
    END IF;
END //
DELIMITER ;

-- ── 5e. sp_approve_loan ───────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_approve_loan;

DELIMITER //
CREATE PROCEDURE sp_approve_loan(
    IN p_loan_id VARCHAR(36)
)
BEGIN
    DECLARE v_status     VARCHAR(20);
    DECLARE v_amount     DECIMAL(15,2);
    DECLARE v_user_id    VARCHAR(36);
    DECLARE v_account_id VARCHAR(36);

    SELECT status, amount, user_id INTO v_status, v_amount, v_user_id
    FROM loans WHERE id = p_loan_id FOR UPDATE;

    IF v_status = 'PENDING' THEN
        UPDATE loans SET status = 'APPROVED' WHERE id = p_loan_id;

        SELECT id INTO v_account_id
        FROM accounts WHERE user_id = v_user_id ORDER BY created_at ASC LIMIT 1;

        -- Mint capital and bookkeep
        UPDATE accounts SET balance = balance + v_amount WHERE id = v_account_id;
        INSERT INTO transactions (id, sender_id, receiver_id, amount, type)
        VALUES (UUID(), NULL, v_account_id, v_amount, 'DEPOSIT');

        SELECT 'SUCCESS' AS result;
    ELSE
        SELECT 'INVALID_STATE' AS result;
    END IF;
END //
DELIMITER ;


-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================

-- Global liquidity snapshot
CREATE OR REPLACE VIEW vw_global_liquidity AS
SELECT SUM(balance) AS total_liquidity, COUNT(*) AS active_accounts
FROM accounts WHERE status = 'ACTIVE';

-- Fraud velocity (transactions in last hour above thresholds)
DROP VIEW IF EXISTS vw_fraud_velocity;
CREATE OR REPLACE VIEW vw_fraud_velocity AS
SELECT
    t.sender_id,
    a.account_no,
    COUNT(*)        AS tx_count,
    SUM(t.amount)   AS total_volume,
    MIN(t.created_at) AS window_start,
    MAX(t.created_at) AS window_end
FROM transactions t
JOIN accounts a ON t.sender_id = a.id
WHERE t.created_at >= NOW() - INTERVAL 1 HOUR
GROUP BY t.sender_id, a.account_no
HAVING tx_count > 10 OR total_volume > 50000;

-- Row-level security: customer sees only their own accounts
CREATE OR REPLACE VIEW vw_customer_accounts AS
SELECT a.id, a.account_no, a.balance, a.status, a.created_at
FROM accounts a
WHERE a.user_id = fn_get_current_user_id();

-- Row-level security: customer sees only their own transactions
CREATE OR REPLACE VIEW vw_customer_transactions AS
SELECT
    t.id, t.amount, t.type, t.created_at,
    s.account_no AS sender_account,
    r.account_no AS receiver_account
FROM transactions t
LEFT JOIN accounts s ON t.sender_id   = s.id
LEFT JOIN accounts r ON t.receiver_id = r.id
WHERE s.user_id = fn_get_current_user_id()
   OR r.user_id = fn_get_current_user_id();


-- ============================================================================
-- SECTION 7: SCHEDULED EVENTS
-- ============================================================================

SET GLOBAL event_scheduler = ON;

-- Refresh materialized fraud summary every 60 seconds
DROP EVENT IF EXISTS evt_refresh_fraud_stats;

DELIMITER //
CREATE EVENT evt_refresh_fraud_stats
ON SCHEDULE EVERY 60 SECOND
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    TRUNCATE TABLE fraud_summary;
    INSERT INTO fraud_summary (sender_id, account_no, tx_count, total_volume, window_start)
    SELECT t.sender_id, a.account_no, COUNT(*), SUM(t.amount), MIN(t.created_at)
    FROM transactions t
    JOIN accounts a ON t.sender_id = a.id
    WHERE t.created_at >= NOW() - INTERVAL 1 HOUR
    GROUP BY t.sender_id, a.account_no
    HAVING COUNT(*) > 5 OR SUM(t.amount) > 25000;
END //
DELIMITER ;

-- Process scheduled/recurring transfers every 1 minute
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


-- ============================================================================
-- SETUP COMPLETE. Verify with:
--   SHOW TRIGGERS;
--   SHOW PROCEDURE STATUS WHERE Db = 'fortress_ledger';
--   SHOW EVENTS;
--   SHOW INDEX FROM transactions;
--   SHOW INDEX FROM audit_logs;
-- ============================================================================