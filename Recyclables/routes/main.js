const express = require('express');
const router = express.Router();
const moment = require('moment');
const userRoute = require('./user');


router.use('/user', userRoute)

// Logout User
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;