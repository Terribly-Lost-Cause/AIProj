const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');
const path = require('path');
const fs = require('fs');
const { request } = require('https');
const zlib = require('zlib');
const { google } = require('googleapis');
const AdmZip = require("adm-zip");

// the route for the main page to show model management
router.get('/main', async function(req, res) {
    const title = 'All Images';

    // Ensure session is valid
    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    // If not valid means user not log in and direct to login page
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {
        // If session is valid check if session is connected to that user and get user type
        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        // If user is cleaner, he cant access this page so direct to dashboard
        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            // If user is supervisor then can access this page
            // Get the path to the local project folder of /public/img
            const dir_path = path.join(__dirname, '../public/img');
            var list = [];

            // Get all the files under the path
            fs.readdir(dir_path, function(err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to find or open the directory: ' + err);
                }
                //Print the array of images that has microbit in the name at one go
                for (var i = 0; i < files.length; i++) {
                    if (files[i].includes("microbit")) {
                        list.push(files[i])
                    }
                }
            });

            // render the model management page
            res.render('model/modelManagement', { 
                type: "supervisor",
                list: list
            })
        }
    }
});

// The route that will help change the meterial type of the image
router.post('/changeMaterials', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        // FIrst get the file name in the array to change
        // Then since the name consist of type, microbit and id, split them up
        // Plastic swap to metal and vice versa
        // Join the result back together
        var currentname = array[i]
        var currentarray = currentname.split("_")
        if (currentarray[0] == "Plastic") {
            currentarray[0] = "Metal"
        } else if (currentarray[0] == "Metal") {
            currentarray[0] = "Plastic"
        }
        var newname = currentarray.join("_")
        const dir_path = path.join(__dirname, '../public/img/');

        // Rename the old file with the new file, log any error
        fs.rename(dir_path + currentname, dir_path + newname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

// The route that will help to delete the image
router.post('/deleteImage', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        // First get the file name in the array
        // Join together the public/img folder to get the full image path in the project folder
        var currentname = array[i]
        const dir_path = path.join(__dirname, '../public/img/');

        // Use unlink to delete the image from the folder. Log any error
        fs.unlink(dir_path + currentname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

// This the route when supervisor click submit to confirm all mages are corect and ready for retraining
router.get('/confirmModelling', async function(req, res) {
    //Get all google authentation key and other related information
    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );

    //setting our auth credentials
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    //initialize google drive
    const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
    });

    // Initialize any required variables such as drive file id
    const fileId = '1nnRES9H94PtEpJSWojUzMelXi8HsAIed';
    var dest = fs.createWriteStream('AI.zip');
    let progress = 0;
    const metaldb = 'AI/recyclableDataset/metal'
    const plasticdb = 'AI/recyclableDataset/plastic'

    // FUnction to get the last number metal from the downloaded dataset from drive
    function GetLastMetal() {
        var files = fs.readdirSync(metaldb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
            // Following steps is to get the number only from file name, sort and get the highest number at last entry
            var name = files[i].replace("metal", "")
            name = name.replace(".jpg", "")
            numarray.push(Number(name))
        }
        numarray = numarray.sort(function(a, b) {
            return a - b;
        });
        return numarray[numarray.length - 1]
    }

    // FUnction to get the last number plastic from the downloaded dataset from drive
    function GetLastPlastic() {
        var files = fs.readdirSync(plasticdb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
            // Following steps is to get the number only from file name, sort and get the highest number at last entry
            var name = files[i].replace("plastic", "")
            name = name.replace(".jpg", "")
            name = name.replace(".jpeg", "")
            numarray.push(Number(name))
        }
        numarray = numarray.sort(function(a, b) {
            return a - b;
        });
        return numarray[numarray.length - 1]
    }

    // This is to start downloading the dataset from drive
    await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }).then(ress => {
        ress.data
            .on('end', () => {
                //When finish log its success
                setTimeout(() => { console.log("Done downloading file.!"); }, 2000);
                try {
                    // Unzip the downloaded dataset to the folder named AI
                    const zip = new AdmZip('AI.zip');
                    const outputDir = 'AI';
                    zip.extractAllTo(outputDir);

                    console.log(`Extracted to "${outputDir}" successfully`);

                    // Here is to get the last number for both metal and plastic for naming purpose later
                    var lastMetalNum = parseInt(GetLastMetal())
                    console.log(">>>>>>>>>>>>>", lastMetalNum)
                    var lastPlasticNum = parseInt(GetLastPlastic())
                    console.log(">>>>>>>>>>>>>", lastPlasticNum)

                    // INitialize the folder path with all the images and read the files
                    const dir_path = path.join(__dirname, '../public/img/');
                    var files = fs.readdirSync(dir_path);
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].includes("microbit")) {
                            if (files[i].includes("Metal")) {
                                // If the image is classified metal and has microbit
                                // Rename the file and move from the public/img folder to the extracted dataset with the correct number
                                lastMetalNum += 1
                                fs.renameSync(dir_path + files[i], "AI/recyclableDataset/metal/metal" + lastMetalNum + ".jpg", (error) => {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(files[i])
                                    }
                                })

                            } else if (files[i].includes("Plastic")) {
                                // If the image is classified plastic and has microbit
                                // Rename the file and move from the public/img folder to the extracted dataset with the correct number
                                lastPlasticNum += 1
                                fs.renameSync(dir_path + files[i], "AI/recyclableDataset/plastic/plastic" + lastPlasticNum + ".jpg", (error) => {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(files[i])
                                    }
                                })

                            }
                        }
                    }
                    console.log("zip")

                    // Initialize AdmZip
                    // Create a folder same name and same format as the one in drive and create the zip file.
                    const file = new AdmZip();
                    file.addLocalFolder('AI/recyclableDataset', 'recyclableDataset');
                    fs.writeFileSync('recyclableDataset.zip', file.toBuffer());

                    // delete the extracted AI folder
                    fs.rmSync("AI", { recursive: true, force: true })
                    // delete the AI zip folder
                    fs.rmSync("AI.zip", { recursive: true, force: true })


                    // Initialize all the information for the new dataset
                    var fileMetadata = {
                        'name': 'recyclableDataset.zip'
                    };
                    var media = {
                        mimeType: 'application/zip',
                        body: fs.createReadStream('recyclableDataset.zip')
                    };

                    // Steps to update the file from local to drive
                    drive.files.update({
                        fileId: fileId,
                        resource: fileMetadata,
                        media: media
                    }, (err, file) => {
                        if (err) {
                            // Handle error
                            console.error(err);
                        } else {
                            // WHen there is no error means uplodaed success.
                            // Delete that folder from local project
                            fs.rmSync("recyclableDataset.zip", { recursive: true, force: true })

                        }
                    });
                    // Redirect to model management page
                    res.redirect("/model/main")
                } catch (e) {
                    console.log(`Something went wrong. ${e}`);
                    res.redirect("/model/main")
                }
            })
            .on('error', err => {
                console.error('Error downloading file.');
                res.redirect("/model/main")
            })
            .pipe(dest);
    });
})

module.exports = router