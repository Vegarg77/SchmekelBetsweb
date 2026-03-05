const { Pool } = require('pg')

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL.includes('localhost')
          ? false
          : process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME     || 'schmekelbets',
        user:     process.env.DB_USER     || 'schmekelbets',
        password: process.env.DB_PASSWORD || '',
      }
)

pool.on('error', (err) => {
  console.error('Unexpected database error', err)
})

module.exports = pool
