const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
var passwordValidator = require('password-validator');

// Intialise the password validator we will be using
var schema = new passwordValidator();
schema
    .is().min(8) // Minimum length 8
    .has().uppercase() // Must have uppercase letters
    .has().lowercase() // Must have lowercase letters
    .has().digits() // Must have digits
    .has().symbols() // Must have special characters

// User login get and post
router.get('/login', async function(req, res) {
    const title = 'Login';
    // This is to check for session valid or not
    var checkValidator = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    // If session valid then can do to dashboard
    // Otherwise go to login page
    if (checkValidator == "false"){
        res.render('user/login', { // renders views/user/login.handlebars
            layout: 'loginlayout.handlebars'
        })
    }
    else{
        res.redirect('/dashboard/main')
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
                    if (user.status == 1) { // If status is active then we can log in the user, go to the main dashboard

                        // THen we will create a new cookie with expiration date to store in browser
                        // We also store inside the database.
                        // Will be used to validation session afterwards
                        let userId = user.userId;
                        req.session.userId = userId;
                        let session_id = uuid.uuid()
                        res.cookie('new_cookie', session_id).toString()

                        var current = new Date();
                        var minutesToAdd = 30;
                        let expires = new Date(current.getTime() + (minutesToAdd * 60000)).toString()
                        let data = user.userId

                        Session.create({
                            session_id,
                            expires,
                            data
                        })

                        // Reset failed counter when success login and direct to dashboard
                        User.update({
                            failedCounter: 0
                        }, {
                            where: { name: name }
                        })

                        res.redirect('/dashboard/main')
                    }
                } else {
                    // This is when password  is incorrect
                    // Increase counter by 1
                    let updatedFailedCounter = user.failedCounter + 1
                    
                    // Once counter hit to 3, proceed to deactivate the user account
                    // Update all of this to database and direct to login page
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
                // No user found will also direct to login page
                res.render('user/login', {
                    layout: 'loginlayout.handlebars',
                    errors: errors,
                    name
                })
            }
        })
});


// Add user get and post
router.get('/addUser', async function(req, res) {
    const title = 'Add User';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
    
    // If session is invalid then direct to login page
    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    // If valid we need to check user type
    else if (checkValidatorSession == "true"){

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)
        // If cleaner direct to dashboard as they cannot add user
        // If supervisor direct to add user page
        if (checkValidatorUser == "cleaner"){
            res.redirect('/dashboard/main')
        }
        else if (checkValidatorUser == "supervisor"){
            res.render('user/addUser', { 
                type: "supervisor",
                title: title 
            }) // renders views/user/adduser.handlebars (webpage to key in new user info)
        }
    }
});


router.post('/addUser', (req, res) => {
    let regError = []; // Initialise error array
    // Get all the fields from the form and generate any predefined variable to store in db
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

    // Pre submission checks for matching password
    if (plainPassword != confirmPassword) {
        regError.push("Passwords do not match")
    }

    // Pre submission checks for password strength from password validator
    if (schema.validate(confirmPassword) == false) {
        regError.push("Password not allow. It must contain at least 1 uppercase, 1 lowercase, 1 digit and 1 special character.") //Check for bad and weak password
    }


    User.findOne({ where: { name: name } })
        .then(user => {
            if (user)
            // If the user has already exist in database, return error
                regError.push(name + " has been registered. Please use another unique username.\n") // user has been used, error


            if (regError.length > 0) { // see if there is error, exclude first one. If have direct back page
                res.render('user/addUser', {
                    layout: 'main.handlebars',
                    regError: regError,
                    type: "supervisor"
                });
            } else {
                // If no error, proceed to insert a record into the User table
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

// User management get
router.get('/userManagement', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
    
    // Perform same validation check for session and user again
    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    else if (checkValidatorSession == "true"){

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner"){
            res.redirect('/dashboard/main')
        }
        else if (checkValidatorUser == "supervisor"){
            User.findAll({}).then(user => { //find all users
                if (user != undefined) { //pagination
                    const userlist = user;
                    res.render('user/userManagement', { //render page
                        "user": userlist,
                        type: "supervisor"
                    })
                }
            }) // renders views/user/userManagement.handlebars
        }
    }
});

// The route to update the user status
router.get('/updatestatus/:id', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
    
    // Perform same validation check for session and user again
    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    else if (checkValidatorSession == "true"){

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner"){
            res.redirect('/dashboard/main')
        }
        else if (checkValidatorUser == "supervisor"){
                User.findOne({ where: { userId: req.params.id } })
                .then(user => {
                    if (user){
                        var stat = user.status; // Initialise the user status from db
                        if (stat == 1) {
                            var newstat = 0; // If button click make status deactive
                        } else {
                            var newstat = 1; // If button click make status active
                        }
                        
                        if (stat == 0) {
                            var stat = 1 // If button click make status active, opposite from status
                        } else {
                            var stat = 0 // If button click make status deactive, opposite from status
                        }
            
                        User.update({
                            status: newstat, // Update new status and the button value
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
                    }
                    else{ // Alrt user not found
                        res.send(`
                                <script>alert("UserId not found")
                                setTimeout(window.location = "/user/userManagement", 1000)</script>
                            `);
                    }
                    
                })
        }
    }
})

// logout
router.get('/logout', async function(req, res) {
    // Destroy the session based on the userId
    
    let logoutCookie = req.cookies.new_cookie // get that specific cookies
    await Session.findOne({ where: { session_id: logoutCookie } })
    .then(function(session) {
        session.destroy()
        res.clearCookie("recycling_session");
        res.clearCookie("new_cookie");
        req.session.destroy()
    })
    res.send(`
        <script>alert("You have successfully logged out")
        setTimeout(window.location = "/user/login", 1000)</script>
    `);
    
})
module.exports = router