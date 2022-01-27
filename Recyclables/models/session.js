const Sequelize = require("sequelize");
const db = require("../config/DBConfig");


const session = db.define('session', {
    session_id: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    expires: {
        type: Sequelize.STRING
    },
    data: {
        type: Sequelize.STRING
    }
});
module.exports = session;