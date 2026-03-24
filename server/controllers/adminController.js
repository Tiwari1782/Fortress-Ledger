const db = require('../config/db');

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
        // Toggle the status between ACTIVE and FROZEN
        const [account] = await db.execute('SELECT status FROM accounts WHERE id = ?', [accountId]);
        
        if (account.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const newStatus = account[0].status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';

        await db.execute('UPDATE accounts SET status = ? WHERE id = ?', [newStatus, accountId]);
        
        res.json({ message: `Account status updated to ${newStatus}` });
    } catch (error) {
        res.status(500).json({ error: 'Server error updating account status' });
    }
};

exports.getAuditTrail = async (req, res) => {
    try {
        const [logs] = await db.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving audit trail' });
    }
};