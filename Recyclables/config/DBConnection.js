const mySQLDB = require('./DBConfig');
const user = require('../models/User');
const session = require('../models/session');
const bin = require('../models/bin');
const crowdRecord = require('../models/crowdRecord');

// If drop is true, all existing tables are dropped and recreated
const setUpDB = (drop) => {
    mySQLDB.authenticate()
        .then(() => {
            console.log('Recycling database connected');
        })
        .then(() => {
            mySQLDB.sync({ // Creates table if none exists
                force: drop
            }).then(() => {
                console.log('Create tables if none exists')
            }).catch(err => console.log(err))
        })
        .catch(err => console.log('Error: ' + err));
};
module.exports = { setUpDB };