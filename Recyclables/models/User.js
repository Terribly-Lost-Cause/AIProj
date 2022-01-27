const { INTEGER, BOOLEAN } = require('sequelize');
const Sequelize = require('sequelize');
const db = require('../config/DBConfig');
/* Creates a user(s) table in MySQL Database.
Note that Sequelize automatically pleuralizes the entity name as the table name
*/
const User = db.define('user', {
    userId: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING
    },
    type: {
        type: Sequelize.STRING
    },
    salt: {
        type: Sequelize.STRING
    },
    hash: {
        type: Sequelize.STRING
    },
    mobileNum: {
        type: Sequelize.CHAR(10)
    },
    status: {
        type: BOOLEAN
    },
    failedCounter: {
        type: INTEGER
    }
});
module.exports = User;