const Sequelize = require("sequelize");
const db = require("../config/DBConfig");

const session = db.define('bin', {
    bin_id: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    camera_ipaddress: {
        type: Sequelize.STRING
    },
    floor_level: {
        type: Sequelize.STRING
    },
    location_description: {
        type: Sequelize.STRING
    },
    status: {
        type: Sequelize.INTEGER
    },
    overall_plastic: {
        type: Sequelize.INTEGER
    },
    overall_metal: {
        type: Sequelize.INTEGER
    },
    current_plastic: {
        type: Sequelize.INTEGER
    },
    current_metal: {
        type: Sequelize.INTEGER
    },
    threshold: {
        type: Sequelize.INTEGER
    },
    remarks: {
        type: Sequelize.STRING
    }
});
module.exports = session;