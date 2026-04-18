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
                DATE_FORMAT(created_at, '%b %d') AS time, 
                SUM(amount) AS volume,
                COUNT(id) AS tx_count
            FROM transactions 
            WHERE created_at >= NOW() - INTERVAL 30 DAY 
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), DATE_FORMAT(created_at, '%b %d')
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

        // Emit WebSocket broadcast to immediately lock out active clients
        const io = req.app.get('io');
        if (io) {
            io.emit("DEFCON_ACTIVATED", { locked: global.IS_GLOBAL_LOCKDOWN });
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
// PHASE 3 EXPANSION (SPATIAL & FOREX)
// ============================================================================

exports.getPhase3Stats = async (req, res) => {
    try {
        const [spatial] = await db.execute('SELECT COUNT(*) as interceptions FROM spatial_fraud_logs');
        const [forex] = await db.execute("SELECT balance FROM accounts WHERE account_no = 'CENTRAL_MINT_FX'");
        
        res.json({
            spatial_interceptions: spatial[0] ? spatial[0].interceptions : 0,
            forex_profit: forex.length > 0 ? forex[0].balance : 0
        });
    } catch (e) {
        res.json({ spatial_interceptions: 0, forex_profit: 0 });
    }
};

exports.getSpatialLogs = async (req, res) => {
    try {
        const [logs] = await db.execute(`
            SELECT 
                s.id, 
                u.email, 
                s.calculated_speed_kmh, 
                ST_AsText(s.previous_location) as prev_loc, 
                ST_AsText(s.attempted_location) as current_loc, 
                s.created_at
            FROM spatial_fraud_logs s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
            LIMIT 50
        `);
        res.json(logs);
    } catch (e) {
        console.error('Spatial Logs Error:', e);
        res.status(500).json({ error: 'Failed to fetch spatial logs' });
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

// ============================================================================
// USER DETAIL & PASSWORD MANAGEMENT
// ============================================================================

// GET /api/admin/user/:id — Full user detail with transaction stats
exports.getUserDetail = async (req, res) => {
    const userId = req.params.id;
    try {
        // Get user info
        const [users] = await db.execute(
            'SELECT id, email, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        // Get account info
        const [accounts] = await db.execute(
            'SELECT id, account_no, balance, status, created_at FROM accounts WHERE user_id = ?',
            [userId]
        );

        const account = accounts.length > 0 ? accounts[0] : null;

        // Get transaction statistics if account exists
        let txStats = { total_transactions: 0, total_sent: 0, total_received: 0, sent_count: 0, received_count: 0 };
        let recentTransactions = [];
        let lastActive = null;

        if (account) {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(CASE WHEN sender_id = ? THEN amount ELSE 0 END), 0) as total_sent,
                    COALESCE(SUM(CASE WHEN receiver_id = ? THEN amount ELSE 0 END), 0) as total_received,
                    COALESCE(SUM(CASE WHEN sender_id = ? THEN 1 ELSE 0 END), 0) as sent_count,
                    COALESCE(SUM(CASE WHEN receiver_id = ? THEN 1 ELSE 0 END), 0) as received_count
                FROM transactions 
                WHERE sender_id = ? OR receiver_id = ?
            `, [account.id, account.id, account.id, account.id, account.id, account.id]);
            txStats = stats[0];

            // Get recent transactions
            const [recent] = await db.execute(`
                SELECT t.id, t.amount, t.type, t.created_at,
                       s.account_no as sender_account,
                       r.account_no as receiver_account
                FROM transactions t
                LEFT JOIN accounts s ON t.sender_id = s.id
                LEFT JOIN accounts r ON t.receiver_id = r.id
                WHERE t.sender_id = ? OR t.receiver_id = ?
                ORDER BY t.created_at DESC
                LIMIT 20
            `, [account.id, account.id]);
            recentTransactions = recent;

            // Get last active
            const [lastTx] = await db.execute(`
                SELECT created_at FROM transactions 
                WHERE sender_id = ? OR receiver_id = ?
                ORDER BY created_at DESC LIMIT 1
            `, [account.id, account.id]);
            lastActive = lastTx.length > 0 ? lastTx[0].created_at : null;
        }

        // Get audit log entries related to this user's account
        let auditEntries = [];
        if (account) {
            try {
                const [audits] = await db.execute(
                    `SELECT id, action, old_value, new_value, timestamp 
                     FROM audit_logs WHERE entity_id = ? 
                     ORDER BY timestamp DESC LIMIT 15`,
                    [account.id]
                );
                auditEntries = audits;
            } catch (e) {
                // audit_logs schema may vary
            }
        }

        res.json({
            user: users[0],
            account,
            stats: txStats,
            recent_transactions: recentTransactions,
            last_active: lastActive,
            audit_entries: auditEntries
        });
    } catch (error) {
        console.error('User Detail Error:', error);
        res.status(500).json({ error: 'Server error retrieving user details' });
    }
};

// PATCH /api/admin/user/:id/reset-password — Admin resets a user's password
exports.resetUserPassword = async (req, res) => {
    const userId = req.params.id;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // Check user exists
        const [users] = await db.execute('SELECT id, email, role FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        // Hash new password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

        // Audit log
        try {
            await db.execute('SET @current_user_id = ?', [req.user.id]);
            await db.execute(
                `INSERT INTO audit_logs (action, entity_id, old_value, new_value) 
                 VALUES (?, ?, ?, ?)`,
                ['PASSWORD_RESET', userId, 'REDACTED', `Reset by admin for ${users[0].email}`]
            );
        } catch (dbErr) {
            console.log('Audit log failsafe:', dbErr.message);
        }

        res.json({ message: `Password for ${users[0].email} has been reset successfully` });
    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({ error: 'Server error resetting password' });
    }
};

// ============================================================================
// WINDOW FUNCTIONS ANALYTICS
// ============================================================================

// GET /api/admin/window-analytics — RANK, DENSE_RANK, NTILE, LAG window functions
exports.getWindowAnalytics = async (req, res) => {
    try {
        // 1. Wealth Leaderboard — RANK() and DENSE_RANK()
        const [leaderboard] = await db.execute(`
            SELECT 
                a.account_no,
                u.email,
                a.balance,
                a.status,
                RANK() OVER (ORDER BY a.balance DESC) as wealth_rank,
                DENSE_RANK() OVER (ORDER BY a.balance DESC) as dense_rnk,
                NTILE(4) OVER (ORDER BY a.balance DESC) as quartile,
                ROUND(a.balance / SUM(a.balance) OVER () * 100, 2) as pct_of_total
            FROM accounts a
            JOIN users u ON a.user_id = u.id
            WHERE a.status = 'ACTIVE'
            ORDER BY a.balance DESC
            LIMIT 20
        `);

        // 2. Balance Change Trends — LAG() and LEAD()
        const [balanceTrends] = await db.execute(`
            SELECT 
                a.account_no,
                t.created_at,
                t.amount,
                t.type,
                CASE 
                    WHEN t.sender_id = a.id THEN -t.amount 
                    ELSE t.amount 
                END as net_amount,
                LAG(t.amount, 1) OVER (PARTITION BY a.id ORDER BY t.created_at) as prev_tx_amount,
                LEAD(t.amount, 1) OVER (PARTITION BY a.id ORDER BY t.created_at) as next_tx_amount,
                ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY t.created_at DESC) as tx_recency
            FROM transactions t
            JOIN accounts a ON (t.sender_id = a.id OR t.receiver_id = a.id)
            WHERE t.created_at >= NOW() - INTERVAL 7 DAY
            ORDER BY t.created_at DESC
            LIMIT 50
        `);

        // 3. Quartile Summary — aggregate NTILE results
        const [quartileSummary] = await db.execute(`
            SELECT 
                quartile,
                COUNT(*) as account_count,
                ROUND(MIN(balance), 2) as min_balance,
                ROUND(MAX(balance), 2) as max_balance,
                ROUND(AVG(balance), 2) as avg_balance,
                ROUND(SUM(balance), 2) as total_balance
            FROM (
                SELECT 
                    a.balance,
                    NTILE(4) OVER (ORDER BY a.balance DESC) as quartile
                FROM accounts a
                WHERE a.status = 'ACTIVE'
            ) ranked
            GROUP BY quartile
            ORDER BY quartile
        `);

        // 4. Running totals — cumulative SUM window
        const [runningTotals] = await db.execute(`
            SELECT 
                DATE(t.created_at) as tx_date,
                COUNT(*) as daily_count,
                SUM(t.amount) as daily_volume,
                SUM(COUNT(*)) OVER (ORDER BY DATE(t.created_at)) as cumulative_count,
                SUM(SUM(t.amount)) OVER (ORDER BY DATE(t.created_at)) as cumulative_volume
            FROM transactions t
            WHERE t.created_at >= NOW() - INTERVAL 30 DAY
            GROUP BY DATE(t.created_at)
            ORDER BY tx_date
        `);

        res.json({
            leaderboard,
            balance_trends: balanceTrends,
            quartile_summary: quartileSummary,
            running_totals: runningTotals,
            window_functions_used: [
                'RANK()', 'DENSE_RANK()', 'NTILE(4)', 
                'LAG()', 'LEAD()', 'ROW_NUMBER()',
                'SUM() OVER', 'Cumulative SUM() OVER'
            ]
        });
    } catch (error) {
        console.error('Window Analytics Error:', error);
        res.status(500).json({ error: 'Server error running window function analytics' });
    }
};


// ============================================================================
// DATABASE BACKUP / EXPORT
// ============================================================================

// GET /api/admin/backup — Generate SQL dump of the entire database
exports.getDatabaseBackup = async (req, res) => {
    try {
        let sql = '';
        sql += '-- ============================================================================\n';
        sql += '-- FortressLedger Database Backup\n';
        sql += `-- Generated: ${new Date().toISOString()}\n`;
        sql += '-- Engine: MySQL 8+ / InnoDB\n';
        sql += '-- ============================================================================\n\n';
        sql += 'SET FOREIGN_KEY_CHECKS = 0;\n';
        sql += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n';

        // Get all tables
        const [tables] = await db.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
            [process.env.DB_NAME || 'fortress_ledger']
        );

        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            
            // Get CREATE TABLE statement
            const [createResult] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
            sql += `-- Table: ${tableName}\n`;
            sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sql += createResult[0]['Create Table'] + ';\n\n';

            // Get row data
            const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);
            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const colList = columns.map(c => `\`${c}\``).join(', ');
                
                sql += `-- Data for ${tableName} (${rows.length} rows)\n`;
                
                // Batch inserts for performance
                const batchSize = 100;
                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize);
                    const values = batch.map(row => {
                        const vals = columns.map(col => {
                            const val = row[col];
                            if (val === null) return 'NULL';
                            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            if (typeof val === 'number') return val;
                            return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                        });
                        return `(${vals.join(', ')})`;
                    }).join(',\n  ');
                    
                    sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n  ${values};\n`;
                }
                sql += '\n';
            }
        }

        // Get views
        const [views] = await db.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        if (views.length > 0) {
            sql += '-- ============================================================================\n';
            sql += '-- VIEWS\n';
            sql += '-- ============================================================================\n\n';
            for (const view of views) {
                try {
                    const [viewDef] = await db.execute(`SHOW CREATE VIEW \`${view.TABLE_NAME}\``);
                    sql += `DROP VIEW IF EXISTS \`${view.TABLE_NAME}\`;\n`;
                    sql += viewDef[0]['Create View'] + ';\n\n';
                } catch (e) {
                    sql += `-- Could not export view: ${view.TABLE_NAME}\n\n`;
                }
            }
        }

        // Get triggers
        const [triggers] = await db.execute(`SHOW TRIGGERS`);
        if (triggers.length > 0) {
            sql += '-- ============================================================================\n';
            sql += '-- TRIGGERS\n';
            sql += '-- ============================================================================\n\n';
            sql += 'DELIMITER //\n';
            for (const trigger of triggers) {
                sql += `\nDROP TRIGGER IF EXISTS \`${trigger.Trigger}\`;\n`;
                sql += `CREATE TRIGGER \`${trigger.Trigger}\` ${trigger.Timing} ${trigger.Event} ON \`${trigger.Table}\`\nFOR EACH ROW\n${trigger.Statement} //\n`;
            }
            sql += '\nDELIMITER ;\n\n';
        }

        // Get stored procedures
        const [procedures] = await db.execute(
            `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        if (procedures.length > 0) {
            sql += '-- ============================================================================\n';
            sql += '-- STORED PROCEDURES\n';
            sql += '-- ============================================================================\n\n';
            for (const proc of procedures) {
                try {
                    const [procDef] = await db.execute(`SHOW CREATE PROCEDURE \`${proc.ROUTINE_NAME}\``);
                    sql += `DROP PROCEDURE IF EXISTS \`${proc.ROUTINE_NAME}\`;\n`;
                    sql += 'DELIMITER //\n';
                    sql += procDef[0]['Create Procedure'] + ' //\n';
                    sql += 'DELIMITER ;\n\n';
                } catch (e) {
                    sql += `-- Could not export procedure: ${proc.ROUTINE_NAME}\n`;
                }
            }
        }

        // Get events
        const [events] = await db.execute(
            `SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = ?`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        if (events.length > 0) {
            sql += '-- ============================================================================\n';
            sql += '-- EVENTS\n';
            sql += '-- ============================================================================\n\n';
            for (const evt of events) {
                try {
                    const [evtDef] = await db.execute(`SHOW CREATE EVENT \`${evt.EVENT_NAME}\``);
                    sql += `DROP EVENT IF EXISTS \`${evt.EVENT_NAME}\`;\n`;
                    sql += 'DELIMITER //\n';
                    sql += evtDef[0]['Create Event'] + ' //\n';
                    sql += 'DELIMITER ;\n\n';
                } catch (e) {
                    sql += `-- Could not export event: ${evt.EVENT_NAME}\n`;
                }
            }
        }

        sql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';
        sql += `-- Backup complete: ${tables.length} tables, ${views.length} views, ${triggers.length} triggers, ${procedures.length} procedures, ${events.length} events\n`;

        // Send as downloadable SQL file
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="fortress_ledger_backup_${new Date().toISOString().slice(0,10)}.sql"`);
        res.send(sql);
    } catch (error) {
        console.error('Backup Error:', error);
        res.status(500).json({ error: 'Server error generating database backup' });
    }
};

// GET /api/admin/backup/info — Returns DB metadata without downloading
exports.getBackupInfo = async (req, res) => {
    try {
        const [tables] = await db.execute(
            `SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        const [views] = await db.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        const [triggers] = await db.execute('SHOW TRIGGERS');
        const [procedures] = await db.execute(
            `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        const [events] = await db.execute(
            `SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = ?`,
            [process.env.DB_NAME || 'fortress_ledger']
        );
        const [functions] = await db.execute(
            `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'`,
            [process.env.DB_NAME || 'fortress_ledger']
        );

        const totalSize = tables.reduce((acc, t) => acc + Number(t.DATA_LENGTH || 0) + Number(t.INDEX_LENGTH || 0), 0);
        const totalRows = tables.reduce((acc, t) => acc + Number(t.TABLE_ROWS || 0), 0);

        res.json({
            database: process.env.DB_NAME || 'fortress_ledger',
            tables: tables.map(t => ({
                name: t.TABLE_NAME,
                rows: t.TABLE_ROWS,
                data_size: t.DATA_LENGTH,
                index_size: t.INDEX_LENGTH,
                created: t.CREATE_TIME
            })),
            summary: {
                table_count: tables.length,
                view_count: views.length,
                trigger_count: triggers.length,
                procedure_count: procedures.length,
                function_count: functions.length,
                event_count: events.length,
                total_rows: totalRows,
                total_size_bytes: totalSize,
                total_size_mb: (totalSize / 1024 / 1024).toFixed(2)
            },
            views: views.map(v => v.TABLE_NAME),
            triggers: triggers.map(t => t.Trigger),
            procedures: procedures.map(p => p.ROUTINE_NAME),
            events: events.map(e => e.EVENT_NAME),
            functions: functions.map(f => f.ROUTINE_NAME)
        });
    } catch (error) {
        console.error('Backup Info Error:', error);
        res.status(500).json({ error: 'Server error fetching backup info' });
    }
};

exports.getPendingLoans = async (req, res) => {
    try {
        const [loans] = await db.execute(`
            SELECT l.id, l.amount, l.reason, l.created_at, u.email
            FROM loans l 
            JOIN users u ON l.user_id = u.id 
            WHERE l.status = 'PENDING'
            ORDER BY l.created_at ASC
        `);
        res.json(loans);
    } catch (error) {
        console.error('Pending Loans Error:', error);
        res.status(500).json({ error: 'Server error retrieving pending loans' });
    }
};

exports.actionLoanRequest = async (req, res) => {
    try {
        const { id, action } = req.params;
        
        if (action === 'approve') {
            const [rows] = await db.execute('CALL sp_approve_loan(?)', [id]);
            const result = rows[0][0].result;
            
            if (result === 'SUCCESS') {
                return res.json({ message: 'Loan heavily approved and funds disbursed.' });
            } else {
                return res.status(400).json({ error: 'Loan is not in a valid pending state.' });
            }
        } else if (action === 'reject') {
            await db.execute("UPDATE loans SET status = 'DENIED', reason = CONCAT(reason, ' [ADMIN VETO]') WHERE id = ?", [id]);
            return res.json({ message: 'Loan request vetoed successfully.' });
        } else {
            return res.status(400).json({ error: 'Invalid action.' });
        }
    } catch (error) {
        console.error('Action Loan Error:', error);
        res.status(500).json({ error: error.message || 'Server error processing loan action' });
    }
};

// Use global.IS_GLOBAL_LOCKDOWN for cross-module state

// ============================================================================
// ENGINE SANDBOX: MVCC ACADEMIC DEMONSTRATION
// ============================================================================
exports.runIsolationSimulation = async (req, res) => {
    const { isolationLevel } = req.body;
    if (!['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'].includes(isolationLevel)) {
        return res.status(400).json({ error: 'Invalid isolation level' });
    }

    const log = [];
    const timestamp = () => new Date().toISOString().split('T')[1].replace('Z','');
    
    // Acquire two completely separate connections to simulate two concurrent users
    const connA = await db.getConnection(); // Writer
    const connB = await db.getConnection(); // Reader

    try {
        log.push({ time: timestamp(), owner: 'SYSTEM', message: 'Initialized Connections A (Writer) and B (Reader).' });
        
        // 1. Setup Phase: Create deterministic state
        await connA.execute('CREATE TEMPORARY TABLE IF NOT EXISTS isolation_test (id INT PRIMARY KEY, balance DECIMAL(10,2))');
        await connA.execute('TRUNCATE TABLE isolation_test');
        await connA.execute('INSERT INTO isolation_test (id, balance) VALUES (1, 1000.00)');
        log.push({ time: timestamp(), owner: 'SYSTEM', message: 'Seeded test table with initial Balance: $1000.00.' });

        // 2. Configure Isolation Levels for both
        await connA.execute(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        await connB.execute(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        log.push({ time: timestamp(), owner: 'SYSTEM', message: `Set isolation level to ${isolationLevel} for both connections.` });

        // Helper to delay execution (simulate network latency or slow queries)
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        // 3. The Race Condition
        log.push({ time: timestamp(), owner: 'SYSTEM', message: '--- INITIATING RACE CONDITION ---' });

        const [writerAction, readerAction] = await Promise.all([
            // CONNECTION A (WRITER)
            (async () => {
                const myLog = [];
                try {
                    await connA.beginTransaction();
                    myLog.push({ time: timestamp(), owner: 'WRITER', message: 'Started Transaction.' });

                    await sleep(300); // Tiny wait to ensure reader is ready to block or read
                    await connA.execute('UPDATE isolation_test SET balance = 9999.00 WHERE id = 1');
                    myLog.push({ time: timestamp(), owner: 'WRITER', message: 'Updated Balance to $9999.00 (Uncommitted).' });

                    await sleep(1500); // Hold the dirty state open so Reader can try to look at it

                    await connA.rollback();
                    myLog.push({ time: timestamp(), owner: 'WRITER', message: 'Transaction Failed! Rolled back to $1000.00.' });
                    
                    return myLog;
                } catch (e) {
                    await connA.rollback();
                    myLog.push({ time: timestamp(), owner: 'WRITER', message: `Fatal Error: ${e.message}`, isError: true });
                    return myLog;
                }
            })(),

            // CONNECTION B (READER)
            (async () => {
                const myLog = [];
                try {
                    await sleep(500); // Give Writer a headstart to do the update
                    
                    await connB.beginTransaction();
                    myLog.push({ time: timestamp(), owner: 'READER', message: 'Started Transaction.' });

                    const [rows] = await connB.execute('SELECT balance FROM isolation_test WHERE id = 1');
                    const readValue = rows[0].balance;
                    
                    // The core MVCC test result
                    if (parseFloat(readValue) === 9999) {
                        myLog.push({ time: timestamp(), owner: 'READER', message: `Read Balance: $${readValue}. DANGER: DIRTY READ DETECTED!`, highlight: 'rose' });
                    } else if (parseFloat(readValue) === 1000) {
                        myLog.push({ time: timestamp(), owner: 'READER', message: `Read Balance: $${readValue}. MVCC successfully returned the clean snapshot.`, highlight: 'emerald' });
                    } else {
                        myLog.push({ time: timestamp(), owner: 'READER', message: `Read Balance: $${readValue}.` });
                    }

                    await connB.commit();
                    return myLog;
                } catch (e) {
                    await connB.rollback();
                    // If it was SERIALIZABLE, the reader might get blocked and time out, or get a deadlock depending on exact timing.
                    myLog.push({ time: timestamp(), owner: 'READER', message: `Blocked/Error: ${e.message}`, isError: true });
                    return myLog;
                }
            })()
        ]);

        // Merge logs chronologically
        const combinedLogs = [...log, ...writerAction, ...readerAction].sort((a, b) => a.time.localeCompare(b.time));

        res.json({ logs: combinedLogs });

    } catch (e) {
        console.error("Simulation Error", e);
        res.status(500).json({ error: 'Simulation engine crashed.' });
    } finally {
        connA.release();
        connB.release();
    }
};