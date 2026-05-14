import React from 'react';

export default function DemoCredentialsSection() {
    return (
        <div className="dash-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Demo Credentials</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Use these logins to test the two distinct portals.
                Auth state is mocked for this prototype but securely routed.
            </p>

            <table className="data-table" style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>Portal Role</th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>Email / Phone</th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>Password</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span className="badge badge-primary">Mother Patient</span>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}><code>mother@demo.com</code></td>
                        <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}><code>password</code></td>
                    </tr>
                    <tr>
                        <td style={{ padding: '12px' }}>
                            <span className="badge badge-success">Health Worker</span>
                        </td>
                        <td style={{ padding: '12px' }}><code>worker@demo.com</code></td>
                        <td style={{ padding: '12px' }}><code>password</code></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
