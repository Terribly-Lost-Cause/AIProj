const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');
const net = require('net');


router.post('/addBin', (req, res) => {
    let regError = []; // Initialise error array
    let bin_id = uuid.uuid();
    let camera_ipaddress = req.body.camera
    if (net.isIPv4(camera_ipaddress) != 0) {
        camera_ipaddress = "https://" + camera_ipaddress + ":8080//video";
    } else {
        regError.push("Invalid IP Address")
    }

    let location_description = req.body.location;
    let floor_level = req.body.level;
    let status = 1;
    let overall_plastic = 0;
    let overall_metal = 0;
    let current_plastic = 0;
    let current_metal = 0;
    let threshold = 50
    let remarks = req.body.remarks

    // Pre submission checks for password


    Bin.findOne({
            where: {
                location_description: location_description,
                floor_level: floor_level
            }
        })
        .then(bin => {
            if (bin)
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
                        res.redirect('/dashboard/main'); // Goes back to main user management page
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