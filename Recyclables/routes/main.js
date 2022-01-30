const express = require('express');
const router = express.Router();
const moment = require('moment');
const userRoute = require('./user');
const dashboardRoute = require('./dashboard');


router.use('/user', userRoute)
router.use('/dashboard', dashboardRoute)

// Logout User
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;