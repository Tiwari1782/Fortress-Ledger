const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Prakash2005',
        database: process.env.DB_NAME || 'fortress_ledger'
    });

    try {
        const newPassword = 'Prakash1782';
        const email = 'admin@fortress.com';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [hashedPassword, email]
        );

        console.log(`Successfully updated password for ${email}`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await connection.end();
    }
}

resetPassword();
