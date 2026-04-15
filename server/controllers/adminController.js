const db = require('../config/db');
const crypto = require('crypto');

// Global System State
global.IS_GLOBAL_LOCKDOWN = false;

exports.getDashboard = async (req, res) => {
    try {
        const [stats] = await db.execute('SELECT * FROM vw_global_liquidity');
        res.json(stats[0] || { total_liquidity: 0, active_accounts: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving dashboard stats' });
    }
};

exports.getFraudAlerts = async (req, res) => {
    try {
        const [alerts] = await db.execute('SELECT * FROM vw_fraud_velocity');
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving fraud alerts' });
    }
};

exports.freezeAccount = async (req, res) => {
    const accountId = req.params.id;
    try {
        await db.execute('SET @current_user_id = ?', [req.user.id]);
        const [account] = await db.execute('SELECT status FROM accounts WHERE id = ?', [accountId]);
        if (account.length === 0) return res.status(404).json({ error: 'Account not found' });

        const newStatus = account[0].status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
        await db.execute('UPDATE accounts SET status = ? WHERE id = ?', [newStatus, accountId]);
        
        res.json({ message: `Account status updated to ${newStatus}` });
    } catch (error) {
        res.status(500).json({ error: 'Server error updating account status' });
    }
};

exports.getAuditTrail = async (req, res) => {
    try {
        const [logs] = await db.execute(
            `SELECT id, entity_type, entity_id, action, old_value, new_value, 
                    chain_hash, changed_by, timestamp
             FROM audit_logs ORDER BY timestamp DESC LIMIT 100`
        );
        res.json(logs);
    } catch (error) {
        // Fallback for databases without advanced_schema applied
        try {
            const [logs] = await db.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
            res.json(logs);
        } catch (e) {
            res.status(500).json({ error: 'Server error retrieving audit trail' });
        }
    }
};

// Central Bank Capital Injection
exports.supplyCapital = async (req, res) => {
    if (global.IS_GLOBAL_LOCKDOWN) {
        return res.status(503).json({ error: 'DEFCON 1 ACTIVE: Central Bank operations suspended.' });
    }

    const { account_no, amount } = req.body;
    
    if (!account_no || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid account number and positive amount required' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('SET @current_user_id = ?', [req.user.id]);

        const [acc] = await connection.execute('SELECT status FROM accounts WHERE account_no = ? FOR UPDATE', [account_no]);
        if (acc.length === 0) throw new Error('Target account not found');
        if (acc[0].status !== 'ACTIVE') throw new Error('Target account is frozen');

        await connection.execute('UPDATE accounts SET balance = balance + ? WHERE account_no = ?', [amount, account_no]);

        const txId = crypto.randomUUID();
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute(`
            INSERT INTO transactions (id, sender_id, receiver_id, amount, type) 
            SELECT ?, NULL, id, ?, 'DEPOSIT' FROM accounts WHERE account_no = ?
        `, [txId, amount, account_no]);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();
        res.json({ message: `Successfully injected $${amount} into ${account_no}` });
    } catch (error) {
        await connection.rollback();
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
        console.error("DB Error:", error);
        res.status(500).json({ error: error.message || 'Server error supplying capital' });
    } finally {
        connection.release();
    }
};

// Multi-Chart Analytics
exports.getChartData = async (req, res) => {
    try {
        const queryFlow = `
            SELECT 
                DATE_FORMAT(created_at, '%H:00') AS time, 
                SUM(amount) AS volume,
                COUNT(id) AS tx_count
            FROM transactions 
            WHERE created_at >= NOW() - INTERVAL 24 HOUR 
            GROUP BY DATE_FORMAT(created_at, '%H:00') 
            ORDER BY MAX(created_at) ASC
        `;
        const [flowRows] = await db.execute(queryFlow);

        const queryStatus = `
            SELECT status as name, SUM(balance) as value 
            FROM accounts 
            GROUP BY status
        `;
        const [statusRows] = await db.execute(queryStatus);

        res.json({
            flow: flowRows,
            distribution: statusRows
        });
    } catch (error) {
        console.error("Chart DB Error:", error);
        res.status(500).json({ error: 'Server error retrieving chart data' });
    }
};

// Deep Entity Inspector
exports.getAccountDetails = async (req, res) => {
    try {
        const { account_no } = req.params;
        const [acc] = await db.execute(
            'SELECT id, account_no, balance, status, created_at FROM accounts WHERE account_no = ?', 
            [account_no]
        );
        
        if (acc.length === 0) {
            return res.status(404).json({ error: 'Entity not found in ledger' });
        }
        
        res.json(acc[0]);
    } catch (error) {
        console.error("Inspector Error:", error);
        res.status(500).json({ error: 'Server error inspecting account' });
    }
};

// Global Ticker
exports.getTicker = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.amount, 
                COALESCE(s.account_no, 'CENTRAL MINT') as sender, 
                r.account_no as receiver,
                t.created_at
            FROM transactions t
            LEFT JOIN accounts s ON t.sender_id = s.id
            LEFT JOIN accounts r ON t.receiver_id = r.id
            ORDER BY t.created_at DESC
            LIMIT 20
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Ticker DB Error:", error);
        res.status(500).json({ error: 'Server error retrieving ticker data' });
    }
};

exports.getSystemStatus = async (req, res) => {
    try {
        res.json({ lockdown: global.IS_GLOBAL_LOCKDOWN });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
};

exports.toggleSystemLockdown = async (req, res) => {
    try {
        global.IS_GLOBAL_LOCKDOWN = !global.IS_GLOBAL_LOCKDOWN;
        
        try {
            await db.execute('SET @current_user_id = ?', [req.user.id]);
            await db.execute(
                `INSERT INTO audit_logs (action, entity_id, old_value, new_value) 
                 VALUES (?, ?, ?, ?)`,
                ['DEFCON', 'GLOBAL_NET', global.IS_GLOBAL_LOCKDOWN ? 'ONLINE' : 'LOCKED', global.IS_GLOBAL_LOCKDOWN ? 'LOCKED' : 'ONLINE']
            );
        } catch (dbError) {
            console.log("⚠️ DB Log Failsafe Triggered:", dbError.message);
        }

        res.json({ message: 'Global network status updated', lockdown: global.IS_GLOBAL_LOCKDOWN });
        
    } catch (error) {
        console.error("Critical Lockdown Error:", error); 
        res.status(500).json({ error: 'Failed to toggle system lockdown' });
    }
};

// ============================================================================
// NEW ENDPOINTS — Advanced DBMS Features
// ============================================================================

// Materialized Fraud Summary — reads pre-aggregated fraud_summary table
exports.getFraudSummary = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT sender_id, account_no, tx_count, total_volume, window_start, refreshed_at FROM fraud_summary ORDER BY total_volume DESC'
        );
        res.json(rows);
    } catch (error) {
        // Table may not exist yet if advanced_schema not applied
        console.error("Fraud Summary Error:", error);
        res.json([]);
    }
};

// Audit Chain Verification — SHA2 hash chain integrity check
exports.verifyAuditChain = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                a.id,
                a.entity_type,
                a.action,
                a.chain_hash AS stored_hash,
                SHA2(
                    CONCAT(
                        COALESCE(a.entity_id, ''),
                        COALESCE(a.entity_type, ''),
                        COALESCE(a.action, ''),
                        COALESCE(a.old_value, ''),
                        COALESCE(a.new_value, ''),
                        CAST(a.timestamp AS CHAR),
                        COALESCE(prev.chain_hash, 'GENESIS_BLOCK_FORTRESS_LEDGER')
                    ), 256
                ) AS computed_hash
            FROM audit_logs a
            LEFT JOIN audit_logs prev ON prev.id = (
                SELECT MAX(id) FROM audit_logs WHERE id < a.id
            )
            ORDER BY a.id DESC
            LIMIT 50
        `);

        const results = rows.map(row => ({
            id: row.id,
            entity_type: row.entity_type,
            action: row.action,
            stored_hash: row.stored_hash ? row.stored_hash.substring(0, 16) + '...' : null,
            computed_hash: row.computed_hash ? row.computed_hash.substring(0, 16) + '...' : null,
            integrity: row.stored_hash === null ? 'NO_HASH' : 
                       row.stored_hash === row.computed_hash ? 'VALID' : 'TAMPERED'
        }));

        const totalChecked = results.length;
        const validCount = results.filter(r => r.integrity === 'VALID').length;
        const tamperedCount = results.filter(r => r.integrity === 'TAMPERED').length;
        const noHashCount = results.filter(r => r.integrity === 'NO_HASH').length;

        res.json({
            summary: {
                total_checked: totalChecked,
                valid: validCount,
                tampered: tamperedCount,
                no_hash: noHashCount,
                chain_status: tamperedCount > 0 ? 'COMPROMISED' : validCount > 0 ? 'INTACT' : 'UNINITIALIZED'
            },
            entries: results
        });
    } catch (error) {
        console.error("Chain Verify Error:", error);
        res.json({
            summary: { total_checked: 0, valid: 0, tampered: 0, no_hash: 0, chain_status: 'ERROR' },
            entries: []
        });
    }
};

// EXPLAIN ANALYZE — returns query execution plan for fraud velocity
exports.getExplainFraud = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            EXPLAIN 
            SELECT sender_id, COUNT(*) as tx_count, SUM(amount) as total_volume
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL 1 HOUR
            GROUP BY sender_id
            HAVING tx_count > 10 OR total_volume > 50000
        `);
        
        // Also get index info
        const [indexes] = await db.execute('SHOW INDEX FROM transactions');
        
        res.json({
            explain_plan: rows,
            indexes: indexes.map(idx => ({
                key_name: idx.Key_name,
                column_name: idx.Column_name,
                non_unique: idx.Non_unique,
                seq: idx.Seq_in_index,
                cardinality: idx.Cardinality
            }))
        });
    } catch (error) {
        console.error("EXPLAIN Error:", error);
        res.status(500).json({ error: 'Server error running EXPLAIN' });
    }
};

// DBMS Concepts Summary — for Landing page showcase
exports.getDbmsConcepts = async (req, res) => {
    try {
        // Count real data to make the showcase dynamic
        const [txCount] = await db.execute('SELECT COUNT(*) as count FROM transactions');
        const [auditCount] = await db.execute('SELECT COUNT(*) as count FROM audit_logs');
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [indexCount] = await db.execute('SHOW INDEX FROM transactions');

        res.json({
            live_stats: {
                transactions: txCount[0].count,
                audit_entries: auditCount[0].count,
                users: userCount[0].count,
                indexes: indexCount.length
            }
        });
    } catch (error) {
        res.json({ live_stats: { transactions: 0, audit_entries: 0, users: 0, indexes: 0 } });
    }
};

// ============================================================================
// PHASE 2 ADMIN ADDITIONS
// ============================================================================

// 1. Recursive CTE: Money Laundering Rings
exports.getMoneyLaunderingRings = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            WITH RECURSIVE transfer_path AS (
                SELECT 
                    id as tx_id, 
                    sender_id, 
                    receiver_id, 
                    amount, 
                    1 as depth, 
                    CAST(sender_id AS CHAR(1000)) as path
                FROM transactions
                WHERE created_at > NOW() - INTERVAL 30 DAY
                
                UNION ALL
                
                SELECT 
                    t.id, 
                    t.sender_id, 
                    t.receiver_id, 
                    t.amount, 
                    tp.depth + 1, 
                    CONCAT(tp.path, '->', t.receiver_id)
                FROM transactions t
                JOIN transfer_path tp ON t.sender_id = tp.receiver_id
                WHERE tp.depth < 4 AND INSTR(tp.path, t.receiver_id) = 0
            )
            SELECT * FROM transfer_path ORDER BY depth DESC LIMIT 50
        `);
        res.json(rows);
    } catch (e) {
        console.error("CTE Error:", e);
        res.status(500).json({ error: 'Failed to find rings via CTE' });
    }
};

// 2. Point-In-Time Rebuilder
exports.getPointInTimeSnapshot = async (req, res) => {
    try {
        const { account_no, target_time } = req.body;
        const [accRows] = await db.execute('SELECT id, balance FROM accounts WHERE account_no = ?', [account_no]);
        if (accRows.length === 0) return res.status(404).json({ error: 'Account not found' });
        
        let currentBalance = parseFloat(accRows[0].balance);
        const accountId = accRows[0].id;
        
        const [logs] = await db.execute(
            `SELECT action, old_value, new_value 
             FROM audit_logs 
             WHERE entity_type = 'ACCOUNT' AND entity_id = ? AND timestamp > ?
             ORDER BY timestamp DESC`,
            [accountId, new Date(target_time)]
        );
        
        logs.forEach(log => {
            if (log.action === 'UPDATE') {
                const oldVal = JSON.parse(log.old_value);
                const newVal = JSON.parse(log.new_value);
                if (newVal.balance !== undefined && oldVal.balance !== undefined) {
                    const diff = parseFloat(newVal.balance) - parseFloat(oldVal.balance);
                    currentBalance -= diff;
                }
            }
        });
        res.json({ account_no, reconstructed_balance: currentBalance, at_time: target_time });
    } catch (e) {
        console.error("Temporal Build Error:", e);
        res.status(500).json({ error: 'Temporal Rebuild failed' });
    }
}

// 3. System Connection Monitor
exports.getSystemMonitor = async (req, res) => {
    try {
        const [processlist] = await db.execute('SHOW PROCESSLIST');
        res.json({ threads: processlist, active_transactions: [] });
    } catch (e) {
        res.status(500).json({ error: 'Monitor Error' });
    }
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// GET /api/admin/users — List all users with account info
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT u.id, u.email, u.role, u.created_at as user_created,
                   a.id as account_id, a.account_no, a.balance, a.status, a.created_at as account_created
            FROM users u
            LEFT JOIN accounts a ON a.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Users List Error:', error);
        res.status(500).json({ error: 'Server error retrieving users' });
    }
};

// DELETE /api/admin/user/:id — Delete a user and cascade
exports.deleteUser = async (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('SET @current_user_id = ?', [req.user.id]);

        // Get account ID
        const [accounts] = await connection.execute('SELECT id FROM accounts WHERE user_id = ?', [userId]);
        
        if (accounts.length > 0) {
            const accountId = accounts[0].id;
            // Delete related transactions
            await connection.execute('DELETE FROM transactions WHERE sender_id = ? OR receiver_id = ?', [accountId, accountId]);
            // Delete scheduled transfers
            await connection.execute('DELETE FROM scheduled_transfers WHERE sender_id = ?', [accountId]).catch(() => {});
            // Delete account
            await connection.execute('DELETE FROM accounts WHERE user_id = ?', [userId]);
        }

        // Delete user
        await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        await connection.commit();
        res.json({ message: `User ${userId} and all related data deleted successfully` });
    } catch (error) {
        await connection.rollback();
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    } finally {
        connection.release();
    }
};

// Use global.IS_GLOBAL_LOCKDOWN for cross-module state