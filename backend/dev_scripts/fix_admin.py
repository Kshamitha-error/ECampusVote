import sqlite3
h = '$2b$12$H57d70UQxOtGgrXcVLuvdeWOqopnpI02tQeA/hl/Q32SgCgYxXVgW'
conn = sqlite3.connect('voting.db')

# Check actual table name
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', tables)

# Find admin table
for (t,) in tables:
    if 'admin' in t.lower():
        print(f'Found: {t}')
        conn.execute(f'UPDATE {t} SET password_hash = ? WHERE email = ?', (h, 'admin@college.edu'))
        conn.commit()
        print('Updated!')
        print(conn.execute(f'SELECT email, password_hash FROM {t}').fetchall())

conn.close()