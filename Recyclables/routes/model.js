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
router.get('/main', async function(req, res) {
    const title = 'Overall Dashboard';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {

            const dir_path = path.join(__dirname, '../public/img');
            var list = [];
            //var metallist = [];

            fs.readdir(dir_path, function(err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to find or open the directory: ' + err);
                }
                //Print the array of images at one go
                for (var i = 0; i < files.length; i++) {
                    if (files[i].includes("microbit")) {
                        list.push(files[i])
                    }
                }
            });
            console.log(list)
            res.render('model/modelManagement', { //render page
                type: "supervisor",
                list: list
            })
        }
    }
});

router.post('/changeMaterials', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        var currentname = array[i]
        var currentarray = currentname.split("_")
        if (currentarray[0] == "Plastic") {
            currentarray[0] = "Metal"
        } else if (currentarray[0] == "Metal") {
            currentarray[0] = "Plastic"
        }
        var newname = currentarray.join("_")
        const dir_path = path.join(__dirname, '../public/img/');
        console.log(dir_path)
        fs.rename(dir_path + currentname, dir_path + newname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

router.post('/deleteImage', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        var currentname = array[i]
        const dir_path = path.join(__dirname, '../public/img/');
        console.log(dir_path)
        fs.unlink(dir_path + currentname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

router.get('/confirmModelling', async function(req, res) {
    console.log("yayye")

    //client id
    const CLIENT_ID = '106893340507-fmr4e7ivi9uda07hg43c6fqblkne9tpa.apps.googleusercontent.com';
    //client secret
    const CLIENT_SECRET = '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';
    //redirect URL
    const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
    //refresh token
    const REFRESH_TOKEN = '1//04podkUWYmi68CgYIARAAGAQSNwF-L9IrDCV14BhZ7bIaGirtobAxr34IilwZewnaKiYPKN9kzdfukoA3cplCvJD1AUEBsDl8-s0';
    //intialize auth client
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );
    //setting our auth credentials
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    //initialize google drive
    const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
    });

    const fileId = '1nnRES9H94PtEpJSWojUzMelXi8HsAIed';
    var dest = fs.createWriteStream('AI.zip');
    let progress = 0;
    const metaldb = 'AI/recyclableDataset/metal'
    const plasticdb = 'AI/recyclableDataset/plastic'

    function GetLastMetal() {
        var files = fs.readdirSync(metaldb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
            var name = files[i].replace("metal", "")
            name = name.replace(".jpg", "")
            numarray.push(Number(name))
        }
        numarray = numarray.sort(function(a, b) {
            return a - b;
        });
        return numarray[numarray.length - 1]
    }

    
    function GetLastPlastic() {
        var files = fs.readdirSync(plasticdb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
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

    function deleteEverything(path) {
        fs.unlink(path, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }

    drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }).then(res => {
        res.data
            .on('end', () => {
                console.log('Done downloading file.');
                try {
                    const zip = new AdmZip('AI.zip');
                    const outputDir = 'AI';
                    zip.extractAllTo(outputDir);

                    console.log(`Extracted to "${outputDir}" successfully`);

                    var lastMetalNum = parseInt(GetLastMetal())
                    console.log(">>>>>>>>>>>>>", lastMetalNum)
                    var lastPlasticNum = parseInt(GetLastPlastic())
                    console.log(">>>>>>>>>>>>>", lastPlasticNum)

                        const dir_path = path.join(__dirname, '../public/img/');
                        fs.readdir(dir_path, function(err, files) {
                            //handling error
                            if (err) {
                                return console.log('Unable to find or open the directory: ' + err);
                            }
                            //Print the array of images at one go
                            for (var i = 0; i < files.length; i++) {
                                if (files[i].includes("microbit")) {
                                    if (files[i].includes("Metal")){
                                        lastMetalNum += 1
                                        fs.rename(dir_path + files[i], "AI/recyclableDataset/metal/metal" + lastMetalNum + ".jpg", (error) => {
                                            if (error) {
                                                console.log(error)
                                            }
                                        })
                                    }
                                    else if (files[i].includes("Plastic")){
                                        lastPlasticNum += 1
                                        fs.rename(dir_path + files[i], "AI/recyclableDataset/plastic/plastic" + lastPlasticNum + ".jpg", (error) => {
                                            if (error) {
                                                console.log(error)
                                            }
                                        })
                                    }
                                }
                            }
                        });


                } catch (e) {
                    console.log(`Something went wrong. ${e}`);
                }
            })
            .on('error', err => {
                console.error('Error downloading file.');
            })
            .on('data', d => {
                progress += d.length;
                if (process.stdout.isTTY) {
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Downloaded ${progress} bytes`);
                }
            })
            .pipe(dest);
    });






    const dir_path = path.join(__dirname, '/AI/recyclableDataset');
    console.log(dir_path)
    fs.readdir(dir_path, function(err, files) {
        //handling error
        if (err) {
            return console.log('Unable to find or open the directory: ' + err);
        }
        //Print the array of images at one go
        for (var i = 0; i < files.length; i++) {
            if (files[i].includes("microbit") && files[i].includes("Metal")) {
                fs.rename(dir_path + files[i], dir_path + "/Metal/" + files[i], (error) => {
                    if (error) {
                        console.log(error)
                    }
                })
            } else if (files[i].includes("microbit") && files[i].includes("Plastic")) {
                fs.rename(dir_path + files[i], dir_path + "/Plastic/" + files[i], (error) => {
                    if (error) {
                        console.log(error)
                    }
                })
            }
        }
    });

    res.redirect("/model/main")
})

module.exports = router