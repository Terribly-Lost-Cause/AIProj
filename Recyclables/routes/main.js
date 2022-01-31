const express = require('express');
const router = express.Router();
const moment = require('moment');
const userRoute = require('./user');
const dashboardRoute = require('./dashboard');
const binRoute = require('./bin');

router.use('/user', userRoute)
router.use('/dashboard', dashboardRoute)
router.use('/bin', binRoute)

// Logout User
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect("/user/login")
});

router.get("/", (req, res)=>{
    res.redirect("/user/login")
})

module.exports = router;