const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
var passwordValidator = require('password-validator');
var schema = new passwordValidator();
schema
    .is().min(8) // Minimum length 8
    .has().uppercase() // Must have uppercase letters
    .has().lowercase() // Must have lowercase letters
    .has().digits() // Must have digits
    .has().symbols() // Must have special characters
router.get('/addUser', (req, res) => {
    const title = 'Add User';
    res.render('user/addUser', { title: title }) // renders views/user/adduser.handlebars (webpage to key in new user info)
});


router.post('/addUser', (req, res) => {
    let regError = []; // Initialise error array
    let userId = uuid.uuid();
    let name = req.body.name;
    let type = req.body.type;
    let plainPassword = req.body.password;
    let confirmPassword = req.body.password2;
    let salt = bcrypt.genSaltSync(saltRounds);
    let hash = bcrypt.hashSync(plainPassword, salt);
    let mobileNum = req.body.mobileNum;
    let status = 1;
    let failedCounter = 0

    // Pre submission checks for password
    if (plainPassword != confirmPassword) {
        regError.push("Passwords do not match")
    }

    if (schema.validate(confirmPassword) == false) {
        regError.push("Password not allow. It must contain at least 1 uppercase, 1 lowercase, 1 digit and 1 special character.") //Check for bad and weak password
    }


    User.findOne({ where: { name: name } })
        .then(user => {
            if (user)
                regError.push(name + " has been registered. Please use another unique username.\n") // user has been used, error


            if (regError.length > 0) { // see if there is error, exclude first one
                res.render('user/addUser', {
                    layout: 'main.handlebars',
                    regError: regError,

                });
            } else {
                // To insert a record into the User table
                User.create({
                        userId,
                        name,
                        type,
                        salt,
                        hash,
                        mobileNum,
                        status,
                        failedCounter
                    }).then(user => {
                        res.redirect('/user/userManagement'); // Goes back to main user management page
                    })
                    .catch(err => console.log(err))
            }
        })
});

router.get('/userManagement', (req, res) => {
    User.findAll({}).then(user => { //find all users
            if (user != undefined) { //pagination
                const userlist = user;
                console.log(userlist)
                res.render('user/userManagement', { //render page
                    //layout: 'staffpage.handlebars',

                    //"invoice": invoicelist,
                    "user": userlist,
                })
            }
        }) // renders views/user/userManagement.handlebars (webpage to key in new user info)
});

router.post('/userManagement', (req, res) => {
    let userId = uuid.uuid();
    let name = req.body.name;
    let type = req.body.type;
    let plainPassword = req.body.password;
    let salt = bcrypt.genSaltSync(saltRounds);
    let hash = bcrypt.hashSync(plainPassword, salt);
    let mobileNum = req.body.mobileNum;
    let status = 1;
    let failedCounter = 0
    const userInfo = User.findAll({ where: { "userId": userId } })

    User.findAll({}).then(user => { //find all invoices
            if (user != undefined) { //pagination
                const userId = req.params.id; //get num of pages
                const userlist = [];
                console.log("user")

                res.render('user/userManagement', { //render page
                    //layout: 'staffpage.handlebars',

                    //"invoice": invoicelist,
                    "user": userlist,
                    userId

                })
            }
        }

        //res.render('user/userManagement') // renders views/user/userManagement.handlebars (webpage to key in new user info)
    )
});


router.get('/login', (req, res) => {
    const title = 'Login';

    if (req.session.userId == undefined) {
        res.render('user/login', { // renders views/user/login.handlebars
            layout: 'loginlayout.handlebars'
        })
    } else {

        User.findOne({ where: { userID: req.session.userId } }) // Find the user in db based on the email retrieved
            .then(user => {
                if (user) {
                    let type = user.type
                    res.render('user/userManagement', {
                        layout: 'main.handlebars',
                        type
                    })
                }
            })
    }


});


router.post('/login', (req, res) => {
    let name = req.body.username; // Retrieve email from the field
    let password = req.body.password; // Retrieve password from the field
    let errors = ["Failure to login, contact Administrator for assistance"]; // Initialise error message to pop if any
    User.findOne({ where: { name: name } }) // Find the user in db based on the email retrieved
        .then(user => {
            if (user) { // If exist can proceed
                if (bcrypt.compareSync(password, user.hash)) { // If matching password can proceed

                    let type = user.type
                    if (user.status == 1) { // If status is active then we can log in the user, go to the main dashboard
                        if (type == "supervisor") {
                            let userId = user.userId;
                            req.session.userId = userId;
                            session_id = req.session.userId

                            Session.create({
                                session_id
                            })
                            console.log("user.status", user.status)
                            res.render('user/userManagement', {
                                layout: 'main.handlebars',
                                type
                            })
                        } else {
                            res.render('user/userManagement')
                        }
                    } else {

                        res.render('user/login', {
                            layout: 'loginlayout.handlebars',
                            errors: errors,
                            name
                        })
                    }
                } else {
                    let updatedFailedCounter = user.failedCounter + 1
                    console.log(updatedFailedCounter)
                    let updatedStatus = 1
                    if (updatedFailedCounter >= 3) {
                        updatedStatus = 0
                    }

                    updatedStatus
                    User.update({
                        failedCounter: updatedFailedCounter,
                        status: updatedStatus
                    }, {
                        where: { name: name }
                    })
                    res.render('user/login', {
                        layout: 'loginlayout.handlebars',
                        errors: errors,
                        name
                    })
                }
            } else {
                res.render('user/login', {
                    layout: 'loginlayout.handlebars',
                    errors: errors,
                    name
                })
            }
        })
});

router.post('/Dashboard', (req, res) => {
    const title = 'Staff Dashboard';
    let usrId = req.params.userId
    User.findOne({ where: { userId: usrId } })
        .then(user => {
            res.render('user/dashboard', {
                layout: 'main.handlebars',
                type
            })
        })
    res.render('user/dashboard', { title: title }) // renders views/user/userManagement.handlebars (webpage to key in new user info)
});

router.get('/Dashboard', (req, res) => {
    const title = 'Staff Dashboard';
    res.render('user/dashboard', { title: title }) // renders views/user/userManagement.handlebars (webpage to key in new user info)
});

router.get('/updatestatus/:id', (req, res) => {
    User.findOne({ where: { userId: req.params.id } })
        .then(user => {
            var stat = user.status; // Initialise the user status from db
            if (stat == 1) {
                var newstat = 0; // If button click make status deactive
            } else {
                var newstat = 1; // If button click make status active
            }
            var stt = user.action; // Initialise the button value from the db
            if (stat == 0) {
                var stat = 1 // If button click make status active, opposite from status
            } else {
                var stat = 0 // If button click make status deactive, opposite from status
            }
            try {
                User.update({
                        status: newstat, // Update new status and the button value
                        //action: stt
                    }, {
                        where: {
                            userID: req.params.id // FInd the user who is being changed
                        }
                    })
                    .then(() => { // alert success update
                        res.send(`
                    <script>alert("Changes made successfully saved")
                    setTimeout(window.location = "/user/userManagement", 1000)</script>
                `);
                    })
            } catch (error) {
                console.log(error);
                res.status(500).end();
            }
        })
})


module.exports = router