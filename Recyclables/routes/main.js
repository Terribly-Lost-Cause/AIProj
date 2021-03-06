const express = require('express');
const router = express.Router();
const moment = require('moment');
const userRoute = require('./user');
const dashboardRoute = require('./dashboard');
const binRoute = require('./bin');
const modelRoute = require('./model');

router.use(function(req, res, next) {
    console.log(req.path);
    next();
});

// Initialise all the routes available with the file name
router.use('/user', userRoute)
router.use('/dashboard', dashboardRoute)
router.use('/bin', binRoute)
router.use('/model', modelRoute)

// Logout User
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect("/user/login")
});

// Set a default path to go to user/login
router.get("/", (req, res) => {
    res.redirect("/user/login")
})

module.exports = router;