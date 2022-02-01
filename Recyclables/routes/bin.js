const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');

// Get bins routes get
router.get('/binManagement', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
    
    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    else if (checkValidatorSession == "true"){

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner"){
            res.redirect('/dashboard/main')
        }
        else if (checkValidatorUser == "supervisor"){
            Bin.findAll({}).then(bin => { //find all users
                if (bin != undefined) { //pagination
                    var binlist = bin;

                    for (var i = 0; i < binlist.length; i++) {
                        if (binlist[i].status == 0) {
                            binlist[i].status = "Inactive"
                            // set the action for the binManagement
                            binlist[i].remarks = 0
                        } else if (binlist[i].status == 1) {
                            binlist[i].status = "Active"
                            // set the action for the binManagement
                            binlist[i].remarks = 1
                        } else if (binlist[i].status == 2) {
                            binlist[i].status = "Danger"
                            // set the action for the binManagement
                            binlist[i].remarks = 1
                        } else if (binlist[i].status == 3) {
                            binlist[i].status = "Alert"
                            // set the action for the binManagement
                            binlist[i].remarks = 1
                        }
                    }

                    res.render('bin/binManagement', { //render page
                        "bin": binlist,
                        type: "supervisor"
                    })
                }
            }) // renders views/bin/binManagement.handlebars (webpage to key in new user info)
        }
    }
});



// Add bin routes for get and post
router.post('/addBin', (req, res) => {
    let regError = []; // Initialise error array
    let bin_id = uuid.uuid();
    let camera_ipaddress = "https://192.168.1.95:8080//video";
    let location_description = req.body.location;
    let floor_level = req.body.level;
    let status = 1;
    let overall_plastic = 0;
    let overall_metal = 0;
    let current_plastic = 0;
    let current_metal = 0;
    let threshold = 50
    let remarks = req.body.remarks


    Bin.findOne({
            where: {
                location_description: location_description,
                floor_level: floor_level
            }
        })
        .then(user => {
            if (user)
                regError.push("A bin has already been placed there. Please use another location.") // user has been used, error


            if (regError.length > 0) { // see if there is error, exclude first one
                res.render('bin/addBins', {
                    layout: 'main.handlebars',
                    regError: regError,
                    type: "supervisor"
                });
            } else {
                // To insert a record into the User table
                Bin.create({
                        bin_id,
                        camera_ipaddress,
                        location_description,
                        floor_level,
                        status,
                        overall_plastic,
                        overall_metal,
                        current_plastic,
                        current_metal,
                        threshold,
                        remarks
                    }).then(bin => {
                        res.redirect('/bin/binManagement'); // Goes back to main user management page
                    })
                    .catch(err => console.log(err))
            }
        })
});


// Add user get and post
router.get('/addBin', async function(req, res) {
    const title = 'Add Bin';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            res.render('bin/addBins', {
                    type: "supervisor",
                    title: title
                }) // renders views/user/adduser.handlebars (webpage to key in new user info)
        }
    }
});


// Update bin levels
router.get('/updatelevel/:id', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        Bin.findOne({ where: { bin_id: req.params.id } })
            .then(bin => {
                if (bin) {

                    Bin.update({
                            current_plastic: 0, // Update new status and the button value
                            current_metal: 0
                        }, {
                            where: {
                                bin_id: req.params.id // FInd the user who is being changed
                            }
                        })
                        .then(() => { // alert success update
                            res.send(`
                        <script>alert("Bin has been successfully updated to cleared")
                        setTimeout(window.location = "/dashboard/main", 1000)</script>
                    `);
                        })
                } else {
                    res.send(`
                        <script>alert("Fatal Error Occured")
                        setTimeout(window.location = "/dashboard/main", 1000)</script>
                    `);
                }

            })
    }
})

module.exports = router