module.exports = {
    development: {
        username: 'postgres',
        password: 'postgres',
        database: 'postgres',
        host: '127.0.0.1',
        dialect: 'postgres'
    },
    discord: {
        secret: process.env.DISCORD_SECRET || null
    }
}
