const db = require('../config/db');

// GET /api/banking/profile — User profile with account stats
exports.getProfile = async (req, res) => {
    try {
        // Get user info
        const [users] = await db.execute(
            'SELECT id, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        // Get account info (may not exist for admin users)
        const [accounts] = await db.execute(
            'SELECT id, account_no, balance, status, created_at FROM accounts WHERE user_id = ?',
            [req.user.id]
        );

        // If no account (admin without bank account), return basic profile
        if (accounts.length === 0) {
            return res.json({
                email: users[0].email,
                role: users[0].role,
                member_since: users[0].created_at,
                account_no: null,
                balance: 0,
                status: 'N/A',
                account_created: null,
                stats: {
                    total_transactions: 0,
                    total_sent: 0,
                    total_received: 0,
                    sent_count: 0,
                    received_count: 0
                },
                last_active: null
            });
        }

        const account = accounts[0];

        // Get transaction statistics
        const [txStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN sender_id = ? THEN amount ELSE 0 END), 0) as total_sent,
                COALESCE(SUM(CASE WHEN receiver_id = ? THEN amount ELSE 0 END), 0) as total_received,
                COALESCE(SUM(CASE WHEN sender_id = ? THEN 1 ELSE 0 END), 0) as sent_count,
                COALESCE(SUM(CASE WHEN receiver_id = ? THEN 1 ELSE 0 END), 0) as received_count
            FROM transactions 
            WHERE sender_id = ? OR receiver_id = ?
        `, [account.id, account.id, account.id, account.id, account.id, account.id]);

        // Get last active date
        const [lastTx] = await db.execute(`
            SELECT created_at FROM transactions 
            WHERE sender_id = ? OR receiver_id = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [account.id, account.id]);

        res.json({
            email: users[0].email,
            role: users[0].role,
            member_since: users[0].created_at,
            account_no: account.account_no,
            balance: account.balance,
            status: account.status,
            account_created: account.created_at,
            stats: {
                total_transactions: txStats[0].total_transactions,
                total_sent: txStats[0].total_sent,
                total_received: txStats[0].total_received,
                sent_count: txStats[0].sent_count,
                received_count: txStats[0].received_count
            },
            last_active: lastTx.length > 0 ? lastTx[0].created_at : null
        });
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ error: 'Server error retrieving profile' });
    }
};

// GET /api/banking/history?page=1&limit=20&search=&type=all
// Paginated transaction history with search and filters
exports.getHistoryPaginated = async (req, res) => {
    try {
        const [accounts] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accounts.length === 0) return res.status(404).json({ error: 'Account not found' });
        const accountId = accounts[0].id;

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const type = req.query.type || 'all'; // all, sent, received

        // Build WHERE clause
        let whereClause = '(t.sender_id = ? OR t.receiver_id = ?)';
        const params = [accountId, accountId];

        if (type === 'sent') {
            whereClause = 't.sender_id = ?';
            params.length = 0;
            params.push(accountId);
        } else if (type === 'received') {
            whereClause = 't.receiver_id = ?';
            params.length = 0;
            params.push(accountId);
        }

        if (search) {
            whereClause += ' AND (s.account_no LIKE ? OR r.account_no LIKE ? OR t.id LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Count total matching records
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM transactions t
             LEFT JOIN accounts s ON t.sender_id = s.id
             LEFT JOIN accounts r ON t.receiver_id = r.id
             WHERE ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Fetch paginated results
        const [transactions] = await db.execute(
            `SELECT t.id, t.amount, t.type, t.created_at, 
             s.account_no as sender_account, r.account_no as receiver_account
             FROM transactions t
             LEFT JOIN accounts s ON t.sender_id = s.id
             LEFT JOIN accounts r ON t.receiver_id = r.id
             WHERE ${whereClause}
             ORDER BY t.created_at DESC 
             LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
            params
        );

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('History Paginated Error:', error);
        res.status(500).json({ error: 'Server error retrieving history' });
    }
};

// GET /api/banking/transaction/:id — Single transaction details
exports.getTransactionDetails = async (req, res) => {
    try {
        const [accounts] = await db.execute('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
        if (accounts.length === 0) return res.status(404).json({ error: 'Account not found' });
        const accountId = accounts[0].id;

        const [rows] = await db.execute(
            `SELECT t.id, t.amount, t.type, t.created_at,
             s.account_no as sender_account, s.id as sender_id,
             r.account_no as receiver_account, r.id as receiver_id
             FROM transactions t
             LEFT JOIN accounts s ON t.sender_id = s.id
             LEFT JOIN accounts r ON t.receiver_id = r.id
             WHERE t.id = ? AND (t.sender_id = ? OR t.receiver_id = ?)`,
            [req.params.id, accountId, accountId]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Transaction Detail Error:', error);
        res.status(500).json({ error: 'Server error retrieving transaction' });
    }
};
