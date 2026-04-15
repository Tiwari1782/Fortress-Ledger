# FortressLedger — DBMS Engineering Deep Dive

> A comprehensive reference covering every advanced database concept implemented in this project.  
> Each section includes: **(a) Theory**, **(b) FortressLedger Implementation**, **(c) Interview / Viva Questions**.

---

## Table of Contents

1. [Concurrency & Locking](#1-concurrency--locking)
2. [Index Strategy](#2-index-strategy)
3. [Stored Procedures & Advanced SQL Objects](#3-stored-procedures--advanced-sql-objects)
4. [Query Optimization & Execution Plans](#4-query-optimization--execution-plans)
5. [Partitioning & Scalability](#5-partitioning--scalability)
6. [Forensic Audit System](#6-forensic-audit-system)
7. [Row-Level Security & Data Access Patterns](#7-row-level-security--data-access-patterns)

---

## 1. Concurrency & Locking

### 1.1 SERIALIZABLE vs REPEATABLE READ

#### Theory

MySQL's InnoDB engine supports four isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE). The default is REPEATABLE READ.

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | ✅ Possible | ✅ Possible | ✅ Possible |
| READ COMMITTED | ❌ Prevented | ✅ Possible | ✅ Possible |
| REPEATABLE READ | ❌ Prevented | ❌ Prevented | ✅ Possible* |
| SERIALIZABLE | ❌ Prevented | ❌ Prevented | ❌ Prevented |

*InnoDB's REPEATABLE READ uses gap locking to prevent most phantom reads, but not all edge cases.

**What SERIALIZABLE buys for transfers:**

Under REPEATABLE READ, two concurrent transactions could both read the same sender balance (e.g., $1000) and both decide there are sufficient funds to transfer $800, leading to a **double-spend**. SERIALIZABLE prevents this by:

1. Converting all `SELECT` statements into `SELECT ... LOCK IN SHARE MODE` implicitly
2. Using **range locks** (gap + next-key locks) that prevent any new rows from being inserted into locked ranges
3. Transactions that would create a conflict are forced to wait or are rolled back

**Where phantom reads occur without SERIALIZABLE:**

```
-- Transaction A (REPEATABLE READ):
SELECT COUNT(*) FROM transactions WHERE sender_id = 'acc-1' AND created_at > NOW() - INTERVAL 1 MINUTE;
-- Returns: 9 (under fraud threshold of 10)

-- Transaction B INSERTS a new transaction for acc-1 here (COMMITS)

-- Transaction A reads again:
SELECT COUNT(*) FROM transactions WHERE sender_id = 'acc-1' AND created_at > NOW() - INTERVAL 1 MINUTE;
-- Still returns 9! (snapshot isolation) -- but actual count is 10 (FRAUD!)
-- Transaction A allows the transfer because it doesn't see B's insert = PHANTOM READ
```

Under SERIALIZABLE, Transaction B would be blocked until A completes because A's SELECT acquires a range lock on the `sender_id = 'acc-1'` range.

#### FortressLedger Implementation

```javascript
// In bankingController.js — transfer()
await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
await connection.beginTransaction();
// All SELECTs now implicitly acquire shared locks
// FOR UPDATE escalates to exclusive locks
```

#### Interview Questions

> **Q: Why use SERIALIZABLE isolation for bank transfers instead of the default REPEATABLE READ?**
>
> A: REPEATABLE READ uses snapshot isolation, which means two concurrent transactions can both read the same balance and both decide they have sufficient funds — creating a double-spend scenario. SERIALIZABLE prevents this by converting all reads into locking reads, ensuring mutual exclusion. In banking, the performance cost of SERIALIZABLE is justified because financial integrity is non-negotiable.

> **Q: What is a phantom read and how does SERIALIZABLE prevent it?**
>
> A: A phantom read occurs when a transaction re-executes a range query and finds new rows that were inserted by another committed transaction. SERIALIZABLE prevents this using gap locks and next-key locks that block insertions into the locked range until the transaction completes.

---

### 1.2 Deadlock Prevention via Canonical Lock Ordering

#### Theory

A **deadlock** occurs when two transactions hold locks that the other needs:

```
Time 1: Tx-A locks Account #101 (sender), Tx-B locks Account #102 (sender)
Time 2: Tx-A tries to lock Account #102 (receiver) → BLOCKED by Tx-B
         Tx-B tries to lock Account #101 (receiver) → BLOCKED by Tx-A
→ DEADLOCK: Neither can proceed.
```

**The exact scenario in FortressLedger:**

```
User Alice (Account #101) transfers $100 to Bob (Account #102)
User Bob   (Account #102) transfers $50  to Alice (Account #101)

Without ordering:
  Tx-A: SELECT ... FROM accounts WHERE id='101' FOR UPDATE  ← locks 101
  Tx-B: SELECT ... FROM accounts WHERE id='102' FOR UPDATE  ← locks 102
  Tx-A: SELECT ... FROM accounts WHERE id='102' FOR UPDATE  ← WAITS for Tx-B
  Tx-B: SELECT ... FROM accounts WHERE id='101' FOR UPDATE  ← WAITS for Tx-A
  → DEADLOCK DETECTED → MySQL kills one transaction
```

**Solution — Canonical Lock Ordering:**

Always lock the account with the **lower ID** first, regardless of who is sender/receiver:

```
With ordering (lock lower ID first):
  Tx-A: SELECT ... FROM accounts WHERE id='101' FOR UPDATE  ← locks 101
  Tx-B: SELECT ... FROM accounts WHERE id='101' FOR UPDATE  ← WAITS for Tx-A (same order!)
  Tx-A: SELECT ... FROM accounts WHERE id='102' FOR UPDATE  ← locks 102
  Tx-A: COMMIT → releases both locks
  Tx-B: Now acquires lock on 101, then 102 → succeeds
  → NO DEADLOCK — transactions are serialized naturally
```

#### FortressLedger Implementation

```javascript
// bankingController.js — transfer() with canonical lock ordering
// 1. Resolve both account IDs BEFORE locking
const [senderRows] = await connection.execute(
    'SELECT id FROM accounts WHERE user_id = ?', [req.user.id]
);
const [receiverRows] = await connection.execute(
    'SELECT id FROM accounts WHERE account_no = ?', [receiver_account_no]
);
const senderId = senderRows[0].id;
const receiverId = receiverRows[0].id;

// 2. Determine canonical lock order (lower UUID first)
const [firstLock, secondLock] = senderId < receiverId
    ? [senderId, receiverId]
    : [receiverId, senderId];

// 3. Lock in canonical order
const [first] = await connection.execute(
    'SELECT id, balance, status, user_id FROM accounts WHERE id = ? FOR UPDATE',
    [firstLock]
);
const [second] = await connection.execute(
    'SELECT id, balance, status, user_id FROM accounts WHERE id = ? FOR UPDATE',
    [secondLock]
);
```

#### Interview Questions

> **Q: What causes a deadlock in a peer-to-peer transfer system?**
>
> A: When User A sends money to User B while User B simultaneously sends money to User A, each transaction locks its own sender account first, then tries to lock the other's account. Since both hold locks the other needs, neither can proceed — this is a circular wait condition, one of the four Coffman conditions for deadlock.

> **Q: How do you prevent deadlocks without using timeouts?**
>
> A: By enforcing a canonical (deterministic) lock ordering. If all transactions always acquire locks in the same global order (e.g., by ascending account ID), circular wait is impossible because no transaction can hold a "later" lock while waiting for an "earlier" one.

---

### 1.3 SELECT FOR UPDATE vs SELECT FOR SHARE

#### Theory

| Lock Type | Allows Other Reads | Allows Other Writes | Use Case |
|---|---|---|---|
| `FOR UPDATE` (Exclusive) | ❌ Blocked if also FOR UPDATE | ❌ Blocked | When you WILL modify the row |
| `FOR SHARE` (Shared) | ✅ Other FOR SHARE allowed | ❌ Blocked | When you only need to READ and validate |

#### FortressLedger Implementation

```sql
-- Validating receiver exists and is ACTIVE (read-only check):
-- FOR SHARE is theoretically sufficient since we don't modify receiver status
SELECT id, status FROM accounts WHERE account_no = ? FOR SHARE;

-- But: We DO modify receiver balance, so FOR UPDATE is correct:
SELECT id, balance, status FROM accounts WHERE id = ? FOR UPDATE;
-- This prevents another transaction from reading stale balance
```

**In FortressLedger, we use `FOR UPDATE` for both sender and receiver** because we modify both balances. `FOR SHARE` would only be appropriate if we had a read-only validation step (e.g., checking if the receiver account exists) that is separate from the balance modification — but combining the lookup with the lock is more efficient.

#### Interview Questions

> **Q: When should you use SELECT FOR SHARE instead of SELECT FOR UPDATE?**
>
> A: Use FOR SHARE when you need to read a row and ensure it doesn't get modified before your transaction completes, but you yourself won't modify it. Multiple transactions can hold shared locks on the same row simultaneously. Use FOR UPDATE when you intend to modify the row — it acquires an exclusive lock preventing all other locking reads.

---

## 2. Index Strategy

### 2.1 Composite Index Design for Transactions Table

#### Theory

An index is a B+ tree structure that allows the database to find rows without scanning the entire table. The key principles:

1. **Leftmost prefix rule**: A composite index `(A, B, C)` can serve queries on `(A)`, `(A, B)`, or `(A, B, C)`, but NOT `(B)` or `(B, C)` alone
2. **Index selectivity**: The ratio of distinct values to total rows. Higher selectivity = more useful index
3. **Covering index**: When all columns needed by a query are in the index itself, MySQL can answer the query from the index alone (no table lookup needed — "Using index" in EXPLAIN)

#### FortressLedger Implementation

```sql
-- Query patterns in FortressLedger:
-- 1. Transaction history by sender: WHERE sender_id = ? ORDER BY created_at DESC
-- 2. Transaction history by receiver: WHERE receiver_id = ? ORDER BY created_at DESC  
-- 3. Fraud velocity: WHERE created_at >= NOW() - INTERVAL 1 HOUR GROUP BY sender_id
-- 4. Monthly statements: WHERE (sender_id = ? OR receiver_id = ?) AND created_at BETWEEN ? AND ?
-- 5. Admin analytics: WHERE type = ? AND created_at BETWEEN ? AND ?

-- OPTIMAL INDEX PLAN:
CREATE INDEX idx_tx_sender_time ON transactions(sender_id, created_at);
CREATE INDEX idx_tx_receiver_time ON transactions(receiver_id, created_at);
CREATE INDEX idx_tx_type_time ON transactions(type, created_at);
CREATE INDEX idx_tx_created ON transactions(created_at);  -- For partition pruning
```

**Why each index exists:**

| Index | Serves Query | Why Composite |
|---|---|---|
| `(sender_id, created_at)` | History, Fraud velocity | Sender lookup + time-range scan in one seek |
| `(receiver_id, created_at)` | History (received) | Same pattern for incoming transactions |
| `(type, created_at)` | Admin analytics by type | Type filter + time range in one index |
| `(created_at)` | Partition pruning, range scans | Standalone time-based queries |

### 2.2 Index Selectivity — Why ENUM Indexes Are Useless

#### Theory

**Selectivity** = `COUNT(DISTINCT column) / COUNT(*)`.

For the `type` column with 3 values (`TRANSFER`, `DEPOSIT`, `WITHDRAWAL`) over 10M rows:
- Selectivity = 3 / 10,000,000 = **0.0000003** (terrible!)
- An index on `type` alone would point to ~3.3M rows each — MySQL's optimizer will ignore this index and do a full table scan instead, because reading 3.3M random index lookups is SLOWER than a sequential scan.

**How a composite index fixes this:**

```sql
-- Bad: INDEX(type) → selectivity 0.0000003
-- MySQL says: "I'd have to look up 3.3M rows, might as well scan the table"

-- Good: INDEX(type, created_at) → selectivity approaches 1.0
-- MySQL says: "type='TRANSFER' AND created_at > '2024-01-01' narrows to a few rows — perfect range!"
```

The composite index `(type, created_at)` first filters by type (narrows to ~33% of rows), then uses the B+ tree ordering of `created_at` to efficiently range-scan only the relevant time window — potentially touching just a few hundred rows instead of millions.

### 2.3 EXPLAIN ANALYZE Verification

#### Theory

`EXPLAIN ANALYZE` (MySQL 8.0.18+) actually **executes** the query and reports real timing:

```sql
EXPLAIN ANALYZE
SELECT sender_id, COUNT(*) as tx_count
FROM transactions
WHERE created_at >= NOW() - INTERVAL 1 HOUR
GROUP BY sender_id
HAVING tx_count > 10;
```

**What to look for in the output:**

| Output Term | Good Sign | Bad Sign |
|---|---|---|
| `Using index` | ✅ Index-only scan | |
| `Using index condition` | ✅ Index pushdown | |
| `Using where; Using filesort` | | ❌ Post-filter + sort |
| `Full table scan` | | ❌ No index used |
| `rows_examined vs rows_sent` | Close ratio ✅ | Huge ratio ❌ (scanning too many rows) |
| `actual time=0.005..0.023` | Fast ✅ | `actual time=0.5..3.2` ❌ Slow |

#### FortressLedger Implementation

```sql
-- Verify fraud velocity view uses our composite index:
EXPLAIN ANALYZE
SELECT sender_id, COUNT(*) as tx_count, SUM(amount) as total_volume
FROM transactions
WHERE created_at >= NOW() - INTERVAL 1 HOUR
GROUP BY sender_id
HAVING tx_count > 10 OR total_volume > 50000;

-- Expected output should show:
-- → Using index condition on idx_tx_created (created_at)
-- → NOT "Full table scan"
```

#### Interview Questions

> **Q: Why is an index on a low-cardinality ENUM column (3 values) mostly useless?**
>
> A: Index selectivity is the ratio of distinct values to total rows. With only 3 distinct values over millions of rows, each index entry points to ~33% of the table. MySQL's optimizer knows that random-access lookups through an index for 33% of the table is actually SLOWER than a sequential full-table scan, so it ignores the index entirely. A composite index (type, created_at) fixes this by combining the low-selectivity column with a high-selectivity column, enabling efficient range scans.

> **Q: Explain the leftmost prefix rule for composite indexes.**
>
> A: A composite index (A, B, C) creates a B+ tree sorted first by A, then by B within each A, then by C within each (A,B). This means the index can efficiently serve queries that filter on A, (A,B), or (A,B,C), but NOT queries that only filter on B or C alone — because the B+ tree isn't sorted by those columns independently.

> **Q: What does "Using index" in EXPLAIN output mean?**
>
> A: It means the query is a "covering index" scan — all columns needed by the query exist within the index itself, so MySQL can answer the query entirely from the index without touching the actual table data pages. This is the most efficient type of query execution.

---

## 3. Stored Procedures & Advanced SQL Objects

### 3.1 sp_atomic_transfer — Full Transfer Procedure

#### Theory

A stored procedure encapsulates SQL logic directly in the database engine. For banking:
- **Atomicity**: The entire procedure runs within a transaction
- **Error handling**: `DECLARE ... HANDLER FOR SQLEXCEPTION` catches any error and triggers rollback
- **Performance**: One network round-trip instead of 6+ individual queries
- **Security**: Application only needs `EXECUTE` permission, not direct table access

#### FortressLedger Implementation

```sql
DELIMITER //
CREATE PROCEDURE sp_atomic_transfer(
    IN p_sender_user_id VARCHAR(36),
    IN p_receiver_account_no VARCHAR(20),
    IN p_amount DECIMAL(15,2),
    OUT p_status_code INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_sender_id VARCHAR(36);
    DECLARE v_receiver_id VARCHAR(36);
    DECLARE v_sender_balance DECIMAL(15,2);
    DECLARE v_sender_status ENUM('ACTIVE','FROZEN');
    DECLARE v_receiver_status ENUM('ACTIVE','FROZEN');
    DECLARE v_first_lock VARCHAR(36);
    DECLARE v_second_lock VARCHAR(36);
    DECLARE v_tx_id VARCHAR(36);

    -- Error handler: if ANYTHING fails, rollback and set error status
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = -1;
        SET p_message = 'Transaction failed due to database error';
    END;

    -- Validate amount
    IF p_amount <= 0 THEN
        SET p_status_code = -2;
        SET p_message = 'Invalid transfer amount';
    ELSE
        -- Resolve account IDs (without locking)
        SELECT id INTO v_sender_id FROM accounts WHERE user_id = p_sender_user_id LIMIT 1;
        SELECT id INTO v_receiver_id FROM accounts WHERE account_no = p_receiver_account_no LIMIT 1;

        IF v_sender_id IS NULL THEN
            SET p_status_code = -3;
            SET p_message = 'Sender account not found';
        ELSEIF v_receiver_id IS NULL THEN
            SET p_status_code = -4;
            SET p_message = 'Receiver account not found';
        ELSEIF v_sender_id = v_receiver_id THEN
            SET p_status_code = -5;
            SET p_message = 'Cannot transfer to yourself';
        ELSE
            START TRANSACTION;

            -- Canonical lock ordering (lower ID first)
            IF v_sender_id < v_receiver_id THEN
                SET v_first_lock = v_sender_id;
                SET v_second_lock = v_receiver_id;
            ELSE
                SET v_first_lock = v_receiver_id;
                SET v_second_lock = v_sender_id;
            END IF;

            -- Lock first account
            SELECT balance, status INTO v_sender_balance, v_sender_status 
            FROM accounts WHERE id = v_first_lock FOR UPDATE;
            -- Lock second account
            SELECT balance, status INTO @dummy_bal, @dummy_status 
            FROM accounts WHERE id = v_second_lock FOR UPDATE;

            -- Re-read sender balance after locking
            SELECT balance, status INTO v_sender_balance, v_sender_status 
            FROM accounts WHERE id = v_sender_id;
            SELECT status INTO v_receiver_status 
            FROM accounts WHERE id = v_receiver_id;

            IF v_sender_status != 'ACTIVE' THEN
                ROLLBACK;
                SET p_status_code = -6;
                SET p_message = 'Sender account is frozen';
            ELSEIF v_receiver_status != 'ACTIVE' THEN
                ROLLBACK;
                SET p_status_code = -7;
                SET p_message = 'Receiver account is frozen';
            ELSEIF v_sender_balance < p_amount THEN
                ROLLBACK;
                SET p_status_code = -8;
                SET p_message = 'Insufficient funds';
            ELSE
                -- Execute double-entry update
                UPDATE accounts SET balance = balance - p_amount WHERE id = v_sender_id;
                UPDATE accounts SET balance = balance + p_amount WHERE id = v_receiver_id;

                -- Generate transaction ID
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
```

### 3.2 sp_generate_monthly_statement — Cursor-Based Ledger

#### Theory

A **cursor** iterates over a result set row by row — like a `for` loop in SQL. While generally avoided for performance (set-based operations are faster), cursors are appropriate for:
- Building running totals where each row depends on the previous
- Row-by-row processing with side effects (inserting into another table)
- Generating sequential reports like bank statements

#### FortressLedger Implementation

```sql
DELIMITER //
CREATE PROCEDURE sp_generate_monthly_statement(
    IN p_account_id VARCHAR(36),
    IN p_year INT,
    IN p_month INT
)
BEGIN
    DECLARE v_tx_id VARCHAR(36);
    DECLARE v_sender_id VARCHAR(36);
    DECLARE v_receiver_id VARCHAR(36);
    DECLARE v_amount DECIMAL(15,2);
    DECLARE v_type VARCHAR(20);
    DECLARE v_created_at TIMESTAMP;
    DECLARE v_running_balance DECIMAL(15,2) DEFAULT 0;
    DECLARE v_done INT DEFAULT 0;

    DECLARE cur CURSOR FOR
        SELECT t.id, t.sender_id, t.receiver_id, t.amount, t.type, t.created_at
        FROM transactions t
        WHERE (t.sender_id = p_account_id OR t.receiver_id = p_account_id)
          AND YEAR(t.created_at) = p_year
          AND MONTH(t.created_at) = p_month
        ORDER BY t.created_at ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- Get opening balance (balance at start of month)
    -- Calculate from all prior transactions
    SELECT COALESCE(
        (SELECT SUM(CASE 
            WHEN receiver_id = p_account_id THEN amount
            WHEN sender_id = p_account_id THEN -amount
            ELSE 0 END)
         FROM transactions
         WHERE (sender_id = p_account_id OR receiver_id = p_account_id)
           AND created_at < CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01')
        ), 0) + 1000.00  -- 1000 = default opening deposit
    INTO v_running_balance;

    -- Temp table for the statement
    DROP TEMPORARY TABLE IF EXISTS tmp_statement;
    CREATE TEMPORARY TABLE tmp_statement (
        seq INT AUTO_INCREMENT PRIMARY KEY,
        tx_id VARCHAR(36),
        tx_date TIMESTAMP,
        description VARCHAR(100),
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        running_balance DECIMAL(15,2)
    );

    -- Insert opening balance row
    INSERT INTO tmp_statement (tx_id, tx_date, description, running_balance)
    VALUES ('OPENING', CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01'), 
            'Opening Balance', v_running_balance);

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_tx_id, v_sender_id, v_receiver_id, v_amount, v_type, v_created_at;
        IF v_done THEN LEAVE read_loop; END IF;

        IF v_sender_id = p_account_id THEN
            SET v_running_balance = v_running_balance - v_amount;
            INSERT INTO tmp_statement (tx_id, tx_date, description, debit, running_balance)
            VALUES (v_tx_id, v_created_at, CONCAT(v_type, ' OUT'), v_amount, v_running_balance);
        ELSE
            SET v_running_balance = v_running_balance + v_amount;
            INSERT INTO tmp_statement (tx_id, tx_date, description, credit, running_balance)
            VALUES (v_tx_id, v_created_at, CONCAT(v_type, ' IN'), v_amount, v_running_balance);
        END IF;
    END LOOP;
    CLOSE cur;

    -- Return the statement
    SELECT * FROM tmp_statement ORDER BY seq;
    DROP TEMPORARY TABLE tmp_statement;
END //
DELIMITER ;
```

### 3.3 Stored Procedures vs Application-Layer Transactions

#### Tradeoff Analysis for Banking

| Factor | Stored Procedure | Application-Layer (Node.js) |
|---|---|---|
| **Network round-trips** | 1 CALL | 6-8 individual queries |
| **Latency** | ~2ms total | ~15ms total (each query = ~2ms + network) |
| **Error handling** | DECLARE HANDLER (SQL) | try/catch (JavaScript) |
| **Debugging** | Harder — no console.log | Easier — full stack traces |
| **Version control** | Must manage via migrations | Code lives in Git naturally |
| **Security** | App needs only EXECUTE privilege | App needs SELECT/INSERT/UPDATE on all tables |
| **Portability** | MySQL-specific syntax | Works with any DB driver |
| **Business logic coupling** | Logic lives in DB | Logic lives in app (team familiarity) |

**Verdict for FortressLedger:** We implement **both** — the stored procedure exists as a DBMS showcase object, while the application-layer code remains the primary path for flexibility and debuggability. In production banking, stored procedures are often mandated by compliance teams because they prevent the application from directly manipulating table data.

#### Interview Questions

> **Q: Why use a stored procedure for bank transfers instead of application code?**
>
> A: Stored procedures reduce network round-trips (1 CALL vs 6+ queries), enforce atomicity at the database level (the app can't forget to COMMIT), and allow the DBA to grant only EXECUTE permission — preventing the application from running arbitrary SQL. However, they're harder to debug and version-control, so the choice depends on organizational constraints.

> **Q: What is a cursor and when should you use one?**
>
> A: A cursor iterates over a result set row-by-row, like a loop in procedural code. You should use them sparingly — set-based operations are almost always faster. Cursors are appropriate when each row's computation depends on the previous row's result (like building a running balance), or when you need row-by-row side effects.

> **Q: What does DECLARE EXIT HANDLER FOR SQLEXCEPTION do?**
>
> A: It defines an error handler that catches any SQL error during procedure execution. EXIT means it terminates the current BEGIN...END block. Inside the handler, you typically ROLLBACK the transaction and set an error status. Without it, MySQL would silently pass the error to the caller, potentially leaving the transaction in an inconsistent state.

---

## 4. Query Optimization & Execution Plans

### 4.1 Fraud Velocity View — Correlated Subquery vs Window Function

#### Theory

The original `vw_fraud_velocity` does a simple GROUP BY + HAVING:

```sql
-- Original (adequate for small data):
SELECT sender_id, COUNT(*) as tx_count, SUM(amount) as total_volume
FROM transactions
WHERE created_at >= NOW() - INTERVAL 1 HOUR
GROUP BY sender_id
HAVING tx_count > 10 OR total_volume > 50000;
```

At **10 million rows**, we can rewrite this two ways:

**Option A — Correlated Subquery:**
```sql
SELECT DISTINCT t1.sender_id,
    (SELECT COUNT(*) FROM transactions t2 
     WHERE t2.sender_id = t1.sender_id 
     AND t2.created_at >= NOW() - INTERVAL 1 HOUR) as tx_count,
    (SELECT SUM(amount) FROM transactions t3 
     WHERE t3.sender_id = t1.sender_id 
     AND t3.created_at >= NOW() - INTERVAL 1 HOUR) as total_volume
FROM transactions t1
WHERE t1.created_at >= NOW() - INTERVAL 1 HOUR
HAVING tx_count > 10 OR total_volume > 50000;
```
**Performance**: O(n²) — the subquery executes once PER ROW of the outer query. Terrible at scale.

**Option B — Window Function:**
```sql
SELECT sender_id, tx_count, total_volume FROM (
    SELECT sender_id,
        COUNT(*) OVER (PARTITION BY sender_id) as tx_count,
        SUM(amount) OVER (PARTITION BY sender_id) as total_volume,
        ROW_NUMBER() OVER (PARTITION BY sender_id ORDER BY created_at) as rn
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL 1 HOUR
) ranked
WHERE rn = 1 AND (tx_count > 10 OR total_volume > 50000);
```
**Performance**: O(n) — single pass over the data with partition-based aggregation. Much faster.

**Winner**: The **GROUP BY** approach is actually the best for this specific pattern because window functions calculate OVER every row before filtering, creating overhead. GROUP BY + HAVING directly reduces the result set. The GROUP BY is O(n) with a hash aggregate.

### 4.2 Materialized View Pattern in MySQL

#### Theory

MySQL doesn't natively support materialized views (unlike PostgreSQL). To simulate one:

1. Create a **summary table** with pre-aggregated data
2. Create a **scheduled EVENT** that refreshes the summary table periodically
3. Queries read from the summary table instead of the base table

```sql
-- 1. Summary table
CREATE TABLE fraud_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    tx_count INT NOT NULL,
    total_volume DECIMAL(15,2) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fraud_sender (sender_id)
);

-- 2. Scheduled refresh event (every 60 seconds)
CREATE EVENT evt_refresh_fraud_stats
ON SCHEDULE EVERY 60 SECOND
DO
BEGIN
    TRUNCATE TABLE fraud_summary;
    INSERT INTO fraud_summary (sender_id, tx_count, total_volume, window_start)
    SELECT sender_id, COUNT(*), SUM(amount), MIN(created_at)
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL 1 HOUR
    GROUP BY sender_id
    HAVING COUNT(*) > 10 OR SUM(amount) > 50000;
END;

-- 3. Query the summary instead of the live view
SELECT * FROM fraud_summary;  -- instant! pre-computed!
```

**Tradeoff**: Data is up to 60 seconds stale. For fraud detection, this is acceptable because you're looking for patterns, not real-time individual transactions.

### 4.3 The N+1 Query Problem

#### Theory

The **N+1 problem** occurs when you fetch N records, then make 1 additional query for each record:

**Bad: N+1 in FortressLedger Admin Dashboard:**
```javascript
// Fetch all fraud alerts (1 query)
const [alerts] = await db.execute('SELECT * FROM vw_fraud_velocity');
// Then for each alert, fetch the account details (N queries!)
for (const alert of alerts) {
    const [account] = await db.execute(
        'SELECT * FROM accounts WHERE id = ?', [alert.sender_id]
    );
    alert.account = account[0];
}
// If 50 flagged accounts → 51 queries total!
```

**Fixed: Single JOIN:**
```sql
SELECT f.sender_id, f.tx_count, f.total_volume,
       a.account_no, a.balance, a.status, u.email
FROM vw_fraud_velocity f
JOIN accounts a ON f.sender_id = a.id
JOIN users u ON a.user_id = u.id;
-- 1 query, all data!
```

#### Interview Questions

> **Q: What is the N+1 query problem and how do you fix it?**
>
> A: N+1 occurs when you make 1 query to fetch N records, then N additional queries to fetch related data for each record. Total = N+1 queries. Fix: Use a JOIN to fetch all related data in a single query. In ORMs, use eager loading (include/populate) instead of lazy loading.

> **Q: Why might you prefer a materialized view over a regular view for analytics?**
>
> A: A regular view re-executes its underlying query every time it's accessed. For expensive aggregations over millions of rows, this creates unacceptable latency. A materialized view pre-computes and caches the result, trading freshness for performance. MySQL doesn't support them natively, so we simulate them with summary tables and scheduled events.

---

## 5. Partitioning & Scalability

### 5.1 RANGE Partitioning Strategy

#### Theory

**Partitioning** divides a large table into smaller physical segments (partitions) that MySQL can manage independently. Benefits:
- **Partition pruning**: Queries that filter on the partition key only scan relevant partitions
- **Maintenance**: Drop old partitions instead of DELETE (instant vs. hours)
- **Parallelism**: Some operations can run on partitions in parallel

#### FortressLedger Implementation

```sql
CREATE TABLE transactions_partitioned (
    id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36),
    receiver_id VARCHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at),  -- partition key MUST be in primary key
    INDEX idx_sender_time (sender_id, created_at),
    INDEX idx_receiver_time (receiver_id, created_at)
)
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    PARTITION p202403 VALUES LESS THAN (202404),
    PARTITION p202404 VALUES LESS THAN (202405),
    PARTITION p202405 VALUES LESS THAN (202406),
    PARTITION p202406 VALUES LESS THAN (202407),
    PARTITION p202407 VALUES LESS THAN (202408),
    PARTITION p202408 VALUES LESS THAN (202409),
    PARTITION p202409 VALUES LESS THAN (202410),
    PARTITION p202410 VALUES LESS THAN (202411),
    PARTITION p202411 VALUES LESS THAN (202412),
    PARTITION p202412 VALUES LESS THAN (202501),
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Partition Pruning in Action:**
```sql
-- This query ONLY scans partition p202403:
SELECT * FROM transactions_partitioned 
WHERE created_at BETWEEN '2024-03-01' AND '2024-03-31';

-- Verify with EXPLAIN:
EXPLAIN SELECT * FROM transactions_partitioned 
WHERE created_at BETWEEN '2024-03-01' AND '2024-03-31';
-- Output shows: partitions: p202403 (pruned!)
```

### 5.2 Horizontal vs Vertical Partitioning

| Type | What It Splits | Example in FortressLedger |
|---|---|---|
| **Horizontal** | Rows (same columns, different rows in each partition) | Transactions split by month — each partition has all columns but only that month's rows |
| **Vertical** | Columns (same rows, different columns in each partition) | Split `users` into `user_auth (id, email, password_hash)` and `user_profile (id, role, created_at)` — join on ID |

**Where to apply in FortressLedger:**
- **Horizontal**: Transactions table (by date) — our primary use case
- **Vertical**: Could split `audit_logs` into `audit_logs_header (id, entity_id, action, timestamp)` and `audit_logs_payload (id, old_value, new_value)` — the payload is large TEXT but rarely queried directly

### 5.3 Partition Pruning Bypass

#### Theory

**Partition pruning** fails (scans ALL partitions) when:
1. The query doesn't filter on the partition key: `WHERE sender_id = 'abc'` (no `created_at` filter)
2. You apply a function to the partition key: `WHERE YEAR(created_at) = 2024` (function wrapping prevents pruning in some cases)
3. You use `OR` across partition boundaries: `WHERE created_at = '2024-01-15' OR sender_id = 'abc'`

**How to avoid bypass:**

```sql
-- BAD: Function on partition key (may prevent pruning)
SELECT * FROM transactions_partitioned WHERE YEAR(created_at) = 2024;

-- GOOD: Use range that maps to partition boundaries  
SELECT * FROM transactions_partitioned 
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- For fraud queries that need ALL partitions, accept the full scan
-- OR use the materialized fraud_summary table instead!
```

#### Interview Questions

> **Q: What is partition pruning and when does it fail?**
>
> A: Partition pruning is MySQL's ability to skip partitions that can't contain relevant data based on the WHERE clause. It fails when the query doesn't filter on the partition key, applies functions to the partition key, or uses OR conditions that span partition boundaries. Always use direct range comparisons on the partition key.

> **Q: Why must the partition key be part of the primary key?**
>
> A: MySQL requires the partition key to be part of every unique index (including the primary key) because uniqueness must be enforced within each partition independently. If the partition key weren't in the PK, MySQL would have to check ALL partitions to ensure uniqueness, defeating the purpose of partitioning.

> **Q: What is the difference between horizontal and vertical partitioning?**
>
> A: Horizontal partitioning splits rows — each partition has the same schema but different subsets of data (e.g., transactions by month). Vertical partitioning splits columns — related columns are grouped into separate tables joined by a key (e.g., separating frequently-accessed columns from large BLOB data).

---

## 6. Forensic Audit System

### 6.1 Comprehensive Trigger-Based Auditing

#### Theory

Database triggers fire automatically on data changes, making them ideal for audit systems because:
- They **cannot be bypassed** by the application (unlike application-level logging, which a developer might forget)
- They capture changes even from direct SQL console access
- They run **within the same transaction**, so if the transaction rolls back, the audit log is also rolled back (consistent)

**Comparison: DB Triggers vs Application-Level Audit Logs:**

| Factor | DB Triggers | Application-Level |
|---|---|---|
| **Bypass-proof** | ✅ Cannot skip | ❌ Developer might forget |
| **Console changes** | ✅ Captured | ❌ Not captured |
| **Performance** | ⚠️ Adds overhead to every DML | ✅ Can be async |
| **Flexibility** | ⚠️ Limited to SQL | ✅ Can call APIs, send emails |
| **Debugging** | ❌ Hard to debug | ✅ Full stack traces |
| **Transactional** | ✅ Same transaction | ⚠️ Must manage separately |

#### FortressLedger Implementation — Full Row Diff Triggers

```sql
-- Audit trigger for accounts table using JSON_OBJECT
DELIMITER //
CREATE TRIGGER trg_audit_accounts_update
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'ACCOUNT',
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'balance', OLD.balance,
            'status', OLD.status,
            'account_no', OLD.account_no
        ),
        JSON_OBJECT(
            'balance', NEW.balance,
            'status', NEW.status,
            'account_no', NEW.account_no
        ),
        @current_user_id
    );
END //

-- Trigger for transaction inserts (capture every new transaction)
CREATE TRIGGER trg_audit_transactions_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'TRANSACTION',
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'sender_id', NEW.sender_id,
            'receiver_id', NEW.receiver_id,
            'amount', NEW.amount,
            'type', NEW.type
        ),
        @current_user_id
    );
END //

-- Trigger for user creation
CREATE TRIGGER trg_audit_users_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, changed_by)
    VALUES (
        'USER',
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT('email', NEW.email, 'role', NEW.role),
        @current_user_id
    );
END //
DELIMITER ;
```

### 6.2 Tamper-Evident Audit Trail — SHA2 Hash Chain

#### Theory

A **hash chain** makes retroactive tampering detectable. Each audit log entry stores a hash of:
- Its own content (entity_id, action, old/new values)
- The previous entry's hash

This creates a chain like blockchain blocks. If anyone modifies a past entry, the hash won't match, and every subsequent hash in the chain is also broken.

```
Row 1: hash_1 = SHA2("data_1" + "GENESIS")
Row 2: hash_2 = SHA2("data_2" + hash_1)
Row 3: hash_3 = SHA2("data_3" + hash_2)

If someone alters Row 2's data:
  Recomputed hash_2' = SHA2("altered_data_2" + hash_1)
  hash_2' ≠ hash_2 → TAMPERING DETECTED!
  Also: hash_3 was based on hash_2, so hash_3 is also invalid
```

#### FortressLedger Implementation

```sql
-- Updated audit_logs table with chain_hash column
ALTER TABLE audit_logs ADD COLUMN chain_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN entity_type VARCHAR(20) DEFAULT 'ACCOUNT';
ALTER TABLE audit_logs ADD COLUMN changed_by VARCHAR(36);

-- Trigger that computes chained hash
DELIMITER //
CREATE TRIGGER trg_audit_chain_hash
BEFORE INSERT ON audit_logs
FOR EACH ROW
BEGIN
    DECLARE v_prev_hash VARCHAR(64);
    
    -- Get previous row's hash
    SELECT chain_hash INTO v_prev_hash 
    FROM audit_logs 
    ORDER BY id DESC LIMIT 1;
    
    IF v_prev_hash IS NULL THEN
        SET v_prev_hash = 'GENESIS';
    END IF;
    
    -- Compute chain hash: SHA2(content + previous_hash)
    SET NEW.chain_hash = SHA2(
        CONCAT(
            COALESCE(NEW.entity_id, ''),
            COALESCE(NEW.action, ''),
            COALESCE(NEW.old_value, ''),
            COALESCE(NEW.new_value, ''),
            v_prev_hash
        ), 256
    );
END //
DELIMITER ;
```

**Verification Query — Detect Tampering:**

```sql
-- This query recomputes every hash and compares it to the stored hash
SELECT 
    a.id,
    a.chain_hash AS stored_hash,
    SHA2(
        CONCAT(
            COALESCE(a.entity_id, ''),
            COALESCE(a.action, ''),
            COALESCE(a.old_value, ''),
            COALESCE(a.new_value, ''),
            COALESCE(prev.chain_hash, 'GENESIS')
        ), 256
    ) AS computed_hash,
    CASE 
        WHEN a.chain_hash = SHA2(
            CONCAT(
                COALESCE(a.entity_id, ''),
                COALESCE(a.action, ''),
                COALESCE(a.old_value, ''),
                COALESCE(a.new_value, ''),
                COALESCE(prev.chain_hash, 'GENESIS')
            ), 256
        ) THEN 'VALID'
        ELSE 'TAMPERED'
    END AS integrity_status
FROM audit_logs a
LEFT JOIN audit_logs prev ON prev.id = (
    SELECT MAX(id) FROM audit_logs WHERE id < a.id
)
ORDER BY a.id;
```

#### Interview Questions

> **Q: How would you build a tamper-evident audit trail in a relational database?**
>
> A: Use a SHA2 chained hash. Each audit log row stores a hash of its own content concatenated with the previous row's hash. To verify integrity, recompute every hash starting from the genesis row and compare against stored hashes. If any row was modified, its hash won't match, and every subsequent hash in the chain is also invalidated — similar to how blockchain works.

> **Q: Why is database-level auditing (triggers) more reliable than application-level logging?**
>
> A: Database triggers fire automatically on every DML operation, regardless of whether the change came from the application, a cron job, or a direct SQL console session. Application-level logging only captures changes routed through the app code and can be accidentally or deliberately bypassed. Triggers also run within the same transaction, ensuring the audit log is consistent with the actual data change.

---

## 7. Row-Level Security & Data Access Patterns

### 7.1 Simulating Row-Level Security in MySQL

#### Theory

PostgreSQL has native ROW LEVEL SECURITY policies. MySQL doesn't. We simulate it using:

1. **Session variable** `@current_user_id` — set at connection time from the JWT payload
2. **Views with security barrier** — filter rows based on the session variable
3. **DEFINER security** — view executes with the definer's permissions, not the caller's

```sql
-- Step 1: Application sets session variable after JWT validation
SET @current_user_id = 'uuid-from-jwt';

-- Step 2: View that only shows current user's accounts
CREATE DEFINER='app_user'@'%' 
SQL SECURITY DEFINER
VIEW vw_my_accounts AS
SELECT a.id, a.account_no, a.balance, a.status, a.created_at
FROM accounts a
WHERE a.user_id = @current_user_id;

-- Step 3: View that only shows current user's transactions
CREATE DEFINER='app_user'@'%'
SQL SECURITY DEFINER
VIEW vw_my_transactions AS
SELECT t.id, t.amount, t.type, t.created_at,
       s.account_no as sender_account,
       r.account_no as receiver_account
FROM transactions t
LEFT JOIN accounts s ON t.sender_id = s.id
LEFT JOIN accounts r ON t.receiver_id = r.id
WHERE s.user_id = @current_user_id OR r.user_id = @current_user_id;

-- Now CUSTOMER role only has SELECT on vw_my_accounts and vw_my_transactions
-- They CANNOT access the base accounts or transactions tables directly
GRANT SELECT ON vw_my_accounts TO 'customer_role'@'%';
GRANT SELECT ON vw_my_transactions TO 'customer_role'@'%';
```

### 7.2 SQL Injection Prevention

#### The Attack Vector

```javascript
// VULNERABLE: String interpolation from JWT payload
const accountId = req.user.id; // from JWT — attacker could forge this!
const query = `SELECT * FROM accounts WHERE id = '${accountId}'`;
// If accountId = "'; DROP TABLE accounts; --"
// Becomes: SELECT * FROM accounts WHERE id = ''; DROP TABLE accounts; --'
// → TABLE DESTROYED
```

#### How Parameterized Queries + Stored Procedures Close This

```javascript
// SAFE: Parameterized query
const [rows] = await db.execute(
    'SELECT * FROM accounts WHERE id = ?',  // ? is a placeholder
    [accountId]  // value is bound separately, never interpolated
);
// MySQL receives: "SELECT * FROM accounts WHERE id = ?" + params: ["'; DROP TABLE..."]
// The entire string is treated as a LITERAL VALUE, not SQL code

// EVEN SAFER: Stored procedure
await db.execute('CALL sp_atomic_transfer(?, ?, ?, @status, @msg)', 
    [senderId, receiverAccountNo, amount]);
// The procedure only accepts typed parameters — no SQL injection possible
```

**Why parameterized queries work**: The SQL text and the parameter values are sent to MySQL in **separate channels**. The SQL is parsed and compiled first, then the parameters are bound as literal values. There is no point at which user input can be interpreted as SQL commands.

#### Interview Questions

> **Q: MySQL doesn't have native Row-Level Security. How would you implement it?**
>
> A: Use a combination of session variables (SET @current_user_id from the application after authentication), views filtered by that session variable, and DEFINER security mode. The view executes with the definer's permissions and filters rows based on the session variable, so customers can only see their own data even if they somehow access the view directly.

> **Q: Why are parameterized queries immune to SQL injection?**
>
> A: Because the SQL statement and the user-provided values are sent to the database engine through separate channels. The SQL text is parsed and compiled into an execution plan first, and then the parameter values are bound as literal data. Since the SQL structure is already fixed before any user input is introduced, there is no opportunity for the input to alter the query's logic.

---

## Appendix: Quick-Reference Concept Map

| DBMS Concept | Where in FortressLedger | Interview Topic |
|---|---|---|
| SERIALIZABLE Isolation | `bankingController.js` transfer | Transaction isolation levels |
| Canonical Lock Ordering | `sp_atomic_transfer` procedure | Deadlock prevention |
| SELECT FOR UPDATE | Account locking in transfers | Pessimistic concurrency |
| Composite Indexes | `idx_tx_sender_time`, `idx_tx_type_time` | Index design & selectivity |
| Covering Indexes | Fraud velocity query optimization | Query performance |
| Stored Procedures | `sp_atomic_transfer`, `sp_generate_monthly_statement` | Server-side SQL logic |
| Cursors | Monthly statement running balance | Row-by-row processing |
| DECLARE HANDLER | Error handling in procedures | SQL exception management |
| Window Functions | Fraud velocity (COUNT OVER PARTITION BY) | Advanced SQL |
| Materialized Views | `fraud_summary` + EVENT | Query optimization |
| N+1 Query Problem | Admin dashboard JOINs | ORM performance |
| RANGE Partitioning | `transactions_partitioned` | Scalability |
| Partition Pruning | Date-filtered queries | Query optimization |
| JSON_OBJECT Triggers | Full row-diff audit | CDC (Change Data Capture) |
| SHA2 Hash Chain | Tamper-evident audit trail | Data integrity |
| EXPLAIN ANALYZE | Index verification | Query tuning |
| Row-Level Security | Session-variable views | Access control |
| SQL Injection Prevention | Parameterized queries | Application security |
| ACID Compliance | Full transfer protocol | Transaction theory |
| CHECK Constraints | `chk_positive_balance` | Data integrity |
| ENUM Types | Account status, transaction type | Domain modeling |
| Foreign Keys | Referential integrity | Relational theory |
| Database Triggers | Automatic audit logging | Event-driven DB |
| Views | `vw_fraud_velocity`, `vw_global_liquidity` | Virtual tables |
| Connection Pooling | mysql2 pool (connectionLimit: 10) | Performance |
| JWT + HttpOnly Cookies | Stateless auth, XSS protection | Security |
| RBAC | ADMIN / CUSTOMER roles | Authorization |

---

## 8. Recursive CTEs & Temporal Architecture (Phase 2 Additions)

### 8.1 Money Laundering Detection via Recursive CTEs
**Concept:** A Common Table Expression (CTE) with a RECURSIVE definition allows for iterative self-joining within a single SQL statement.
**Implementation:** `cte_laundering_rings` traverses hop-by-hop up to 4 levels deep to find loops where an account eventually sends money back to itself through intermediaries.

### 8.2 Point-In-Time Snapshot (Temporal Log Playback)
**Concept:** Instead of creating periodic snapshots of the `accounts` table, the system acts as a differential ledger engine.
**Implementation:** The system mathematically reverse-plays JSON balance diffs extracted from the immutable `audit_logs` table backward from the present balance, precisely reconstructing the float state for any exact timestamp.

### 8.3 Window Functions Analytics
**Concept:** Window functions compute analytical aggregations (`SUM()`, `RANK()`, `AVG()`) over partitions of the result set, without flattening the individual rows.
**Implementation:** By calling `RANK() OVER (ORDER BY amount DESC)` and `SUM() OVER (PARTITION BY type)`, FortressLedger creates deep transactional insights synchronously in a single request without caching wait times.

### 8.4 Automated Event Schedulers
**Concept:** MySQL Event Schedulers act as cron tasks stored natively.
**Implementation:** We created `evt_process_scheduled_transfers` and configured it to routinely trigger cursor-based batches extracting scheduled actions, pushing completely automatic background sweeps for utility billing logic.

---

*Document authored for FortressLedger — Enterprise Banking & Fraud Analytics Engine*  
*Last updated: April 2026*
