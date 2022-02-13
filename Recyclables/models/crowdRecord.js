const Sequelize = require('sequelize');
const db = require('../config/DBConfig');
const crowd = db.define('crowd', {
    hour: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    min: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    sec: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    day: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    month: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    year: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    binId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    count: {
        type: Sequelize.INTEGER
    }
});
module.exports = crowd;