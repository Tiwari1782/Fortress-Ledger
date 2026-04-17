const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getBalance = async (req, res) => {
    try {
        const [accounts] = await db.execute(
            'SELECT account_no, balance, status FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
            [req.user.id]
        );

        if (accounts.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json(accounts[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving balance' });
    }
};

//History
exports.getHistory = async (req, res) => {
    try {
        // First get the user's account ID deterministically
        const [accounts] = await db.execute('SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [req.user.id]);
        if (accounts.length === 0) return res.status(404).json({ error: 'Account not found' });
        
        const accountId = accounts[0].id;

        // Fetch transactions where this account is either sender or receiver
        const [transactions] = await db.execute(
            `SELECT t.id, t.amount, t.type, t.created_at, 
             s.account_no as sender_account, r.account_no as receiver_account
             FROM transactions t
             LEFT JOIN accounts s ON t.sender_id = s.id
             LEFT JOIN accounts r ON t.receiver_id = r.id
             WHERE t.sender_id = ? OR t.receiver_id = ?
             ORDER BY t.created_at DESC LIMIT 50`,
            [accountId, accountId]
        );

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving history' });
    }
};

// Transfer — with SERIALIZABLE isolation + canonical lock ordering (deadlock prevention)
exports.transfer = async (req, res) => {
    if (global.IS_GLOBAL_LOCKDOWN) {
        return res.status(503).json({ error: 'DEFCON 1 ACTIVE: All financial networks are locked down.' });
    }

    const { receiver_account_no, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (transferAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const connection = await db.getConnection();

    try {
        // 1. ISOLATION: Set SERIALIZABLE for maximum safety against phantoms
        await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        await connection.beginTransaction();

        // Set session variable for audit trail (RLS context)
        await connection.execute('SET @current_user_id = ?', [req.user.id]);

        // 2. RESOLVE: Get both account IDs BEFORE locking (non-locking reads)
        const [senderRows] = await connection.execute(
            'SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
            [req.user.id]
        );
        if (senderRows.length === 0) throw new Error('Sender account not found');
        const senderId = senderRows[0].id;

        const [receiverRows] = await connection.execute(
            'SELECT id FROM accounts WHERE account_no = ?',
            [receiver_account_no]
        );
        if (receiverRows.length === 0) throw new Error('Receiver account not found');
        const receiverId = receiverRows[0].id;

        if (senderId === receiverId) throw new Error('Cannot transfer to yourself');

        // 3. CANONICAL LOCK ORDERING: Always lock lower ID first to prevent deadlocks
        const [firstLockId, secondLockId] = senderId < receiverId
            ? [senderId, receiverId]
            : [receiverId, senderId];

        // Acquire locks in deterministic order
        await connection.execute(
            'SELECT id, balance, status FROM accounts WHERE id = ? FOR UPDATE',
            [firstLockId]
        );
        await connection.execute(
            'SELECT id, balance, status FROM accounts WHERE id = ? FOR UPDATE',
            [secondLockId]
        );

        // 4. VALIDATION: Read actual data after both locks acquired
        const [senders] = await connection.execute(
            'SELECT id, balance, status FROM accounts WHERE id = ?',
            [senderId]
        );
        const sender = senders[0];

        const [receivers] = await connection.execute(
            'SELECT id, status FROM accounts WHERE id = ?',
            [receiverId]
        );
        const receiver = receivers[0];

        if (sender.status !== 'ACTIVE') throw new Error('Account is frozen');
        if (receiver.status !== 'ACTIVE') throw new Error('Receiver account is frozen');
        if (parseFloat(sender.balance) < transferAmount) throw new Error('Insufficient funds');

        // 5. EXECUTION: Double-entry bookkeeping
        await connection.execute(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [transferAmount, sender.id]
        );

        await connection.execute(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [transferAmount, receiver.id]
        );

        // Log transaction
        const txId = uuidv4();
        if (req.body.lat && req.body.lng) {
            await connection.execute(
                "INSERT INTO transactions (id, sender_id, receiver_id, amount, type, location) VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?, 4326))",
                [txId, sender.id, receiver.id, transferAmount, 'TRANSFER', `POINT(${req.body.lat} ${req.body.lng})`]
            );
        } else {
            await connection.execute(
                'INSERT INTO transactions (id, sender_id, receiver_id, amount, type) VALUES (?, ?, ?, ?, ?)',
                [txId, sender.id, receiver.id, transferAmount, 'TRANSFER']
            );
        }

        // 6. COMMIT: ACID guarantee
        await connection.commit();

        // 7. EMIT: Real-time socket notification to receiver
        const io = req.app.get('io');
        if (io) {
            // we need the receiver's actual account no to emit to their room
            const [ra] = await db.execute('SELECT account_no FROM accounts WHERE id=?', [receiver.id]);
            const [sa] = await db.execute('SELECT account_no FROM accounts WHERE id=?', [sender.id]);
            io.to(ra[0].account_no).emit("transfer_received", {
                amount: transferAmount,
                sender: sa[0].account_no,
                txId: txId
            });
        }

        res.json({ message: 'Transfer successful', transaction_id: txId });

    } catch (error) {
        await connection.rollback();
        
        // DETECTION: Geographic Interception
        if (error.message && error.message.includes('IMPOSSIBLE_TRAVEL')) {
            const [speed] = error.message.split('|')[1].split(' '); // Capture KM/H from SQL signal
            
            try {
                // Log manually outside of the rolled-back connection to ensure persistence
                await db.execute(
                    `INSERT INTO spatial_fraud_logs (user_id, calculated_speed_kmh, previous_location, attempted_location) 
                     SELECT ?, ?, location, ST_GeomFromText(?, 4326) 
                     FROM transactions WHERE sender_id = ? AND location IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
                    [req.user.id, speed, `POINT(${req.body.lat} ${req.body.lng})`, senderId]
                );
            } catch (logErr) {
                console.error("Forensic Log Failure:", logErr);
            }
            
            return res.status(400).json({ 
                error: `Fraud Alert: Impossible Travel Detected (${parseFloat(speed).toLocaleString()} KM/H). Transaction Aborted for Security.` 
            });
        }

        res.status(400).json({ error: error.message || 'Transfer failed' });
    } finally {
        connection.release();
    }
};

    // Monthly Statement — calls sp_generate_monthly_statement stored procedure
exports.getStatement = async (req, res) => {
    const { year, month } = req.params;
    
    try {
        // Get user's account ID deterministically
        const [accounts] = await db.execute('SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [req.user.id]);
        if (accounts.length === 0) return res.status(404).json({ error: 'Account not found' });
        
        const accountId = accounts[0].id;
        const y = parseInt(year);
        const m = parseInt(month);

        if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }

        // Call the stored procedure
        const [rows] = await db.execute('CALL sp_generate_monthly_statement(?, ?, ?)', [accountId, y, m]);
        
        // MySQL returns procedure results in the first element
        const statement = rows[0] || [];
        res.json(statement);
    } catch (error) {
        console.error('Statement Error:', error);
        res.status(500).json({ error: 'Server error generating statement. Ensure advanced_schema.sql has been applied.' });
    }
};

// ============================================================================
// BATCH PAYOUTS WITH SAVEPOINTS
// ============================================================================
exports.processBatchTransfer = async (req, res) => {
    if (global.IS_GLOBAL_LOCKDOWN) {
        return res.status(503).json({ error: 'DEFCON 1 ACTIVE: All financial networks are locked down.' });
    }

    const { batch } = req.body; // Expects array of { receiver_account_no, amount }
    if (!Array.isArray(batch) || batch.length === 0) {
        return res.status(400).json({ error: 'Invalid batch format' });
    }

    const connection = await db.getConnection();
    const results = [];
    let successfulTransfers = 0;

    try {
        await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        await connection.beginTransaction();

        // 1. Get Sender Info once for the entire batch
        const [senderRows] = await connection.execute(
            'SELECT id, balance, status FROM accounts WHERE user_id = ? FOR UPDATE',
            [req.user.id]
        );
        if (senderRows.length === 0) throw new Error('Sender account not found');
        const sender = senderRows[0];
        if (sender.status !== 'ACTIVE') throw new Error('Sender account is frozen');

        let currentBalance = parseFloat(sender.balance);

        // Process each transfer in the batch
        for (let i = 0; i < batch.length; i++) {
            const { receiver_account_no, amount } = batch[i];
            const transferAmount = parseFloat(amount);
            const savepointName = `batch_sp_${i}`;

            // Create a SAVEPOINT for this specific transfer
            await connection.query(`SAVEPOINT ${savepointName}`);

            try {
                if (transferAmount <= 0) throw new Error('Invalid amount');
                if (currentBalance < transferAmount) throw new Error('Insufficient funds');

                // Find receiver
                const [receiverRows] = await connection.execute(
                    'SELECT id, status FROM accounts WHERE account_no = ? FOR UPDATE',
                    [receiver_account_no]
                );
                
                if (receiverRows.length === 0) throw new Error('Receiver not found');
                const receiver = receiverRows[0];

                if (sender.id === receiver.id) throw new Error('Cannot transfer to yourself');
                if (receiver.status !== 'ACTIVE') throw new Error('Receiver account frozen');

                // Execute transfer for this specific iteration
                await connection.execute(
                    'UPDATE accounts SET balance = balance - ? WHERE id = ?',
                    [transferAmount, sender.id]
                );
                await connection.execute(
                    'UPDATE accounts SET balance = balance + ? WHERE id = ?',
                    [transferAmount, receiver.id]
                );

                const txId = uuidv4();
                await connection.execute(
                    'INSERT INTO transactions (id, sender_id, receiver_id, amount, type) VALUES (?, ?, ?, ?, ?)',
                    [txId, sender.id, receiver.id, transferAmount, 'TRANSFER']
                );

                // Update runtime tracking variable
                currentBalance -= transferAmount;
                successfulTransfers++;

                results.push({
                    receiver: receiver_account_no,
                    amount: transferAmount,
                    status: 'SUCCESS',
                    transaction_id: txId
                });

            } catch (stepError) {
                // PARTIAL ROLLBACK: Only undo this specific transfer, keeping the rest intact
                await connection.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                
                results.push({
                    receiver: receiver_account_no,
                    amount: transferAmount || 0,
                    status: 'FAILED',
                    error: stepError.message
                });
            }
        }

        // Commit all successful transactions in the batch
        await connection.commit();

        res.json({
            message: `Batch processed. ${successfulTransfers}/${batch.length} successful.`,
            results
        });

    } catch (criticalError) {
        // Complete rollback if the entire batch process fails (e.g., sender issue)
        await connection.rollback();
        res.status(500).json({ error: criticalError.message || 'Critical batch failure' });
    } finally {
        connection.release();
    }
};

// ============================================================================
// PHASE 2 CUSTOMER ADDITIONS
// ============================================================================

// 1. Expense Analytics (Window Functions)
exports.getExpenseAnalytics = async (req, res) => {
    try {
        const [accRows] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accRows.length === 0) return res.status(404).json({ error: 'Account not found' });
        const accountId = accRows[0].id;
        
        // Advanced SQL: RANK() and SUM() OVER PARTITION BY
        const [rows] = await db.execute(`
            SELECT 
                amount,
                type,
                created_at,
                RANK() OVER (ORDER BY amount DESC) as largest_tx_rank,
                SUM(amount) OVER (PARTITION BY type) as total_by_type,
                ROUND(AVG(amount) OVER (PARTITION BY type), 2) as avg_by_type
            FROM transactions
            WHERE sender_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [accountId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Analytics DB Error' });
    }
};

// 3. Scheduled Transfers Endpoint
exports.createScheduledTransfer = async (req, res) => {
    try {
        const { receiver_account_no, amount, interval_days } = req.body;
        const [accRows] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accRows.length === 0) return res.status(404).json({ error: 'Account not found' });
        
        const senderId = accRows[0].id;

        // Start exactly {interval_days} days from now
        const nextExecution = new Date(Date.now() + interval_days * 86400000);
        await db.execute(
            'INSERT INTO scheduled_transfers (sender_id, receiver_account, amount, interval_days, next_execution) VALUES (?, ?, ?, ?, ?)',
            [senderId, receiver_account_no, amount, interval_days, nextExecution]
        );
        res.json({ message: 'Scheduled transfer registered successfully in MySQL Event scheduler' });
    } catch (e) {
        res.status(500).json({ error: 'Server error scheduling transfer' });
    }
};

exports.getScheduledTransfers = async (req, res) => {
    try {
        const [accRows] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accRows.length === 0) return res.status(404).json({ error: 'Account not found' });
        const senderId = accRows[0].id;
        
        const [rows] = await db.execute('SELECT * FROM scheduled_transfers WHERE sender_id = ? ORDER BY next_execution ASC', [senderId]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Server error fetching scheduled transfers' });
    }
};

// 4. Algorithmic Loan Request
exports.requestLoan = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        const [accRows] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accRows.length === 0) return res.status(404).json({ error: 'Account not found' });
        
        const accountId = accRows[0].id;

        // Execute the procedural underwriter
        const [rows] = await db.execute('CALL sp_request_loan(?, ?)', [accountId, amount]);
        
        // Return underwriting decision
        const decision = rows[0][0];
        res.json(decision);
    } catch (e) {
        console.error("Loan Request Error:", e);
        res.status(500).json({ error: 'Server error parsing underwriting decision. Assure advanced_schema_v3 is loaded.' });
    }
};