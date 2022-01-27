// const accountSid = 'AC0badf16a0f8ce58f077eaa9139dbd545';
// const authToken = 'f4ba09ada98ce898bfa39d292f04eaae';
// const client = require('twilio')(accountSid, authToken);





// client.validationRequests
//     .create({ friendlyName: 'My Home Phone Number', phoneNumber: '+14158675310' })
//     .then(validation_request => console.log(validation_request.friendlyName))
//     .catch(err => console.log(err));

// client.messages
//     .create({
//         body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
//         from: '+17373734753',
//         to: '+6598209042'
//     })
//     .then(message => console.log(message.sid));





var TeleSignSDK = require('telesignsdk');

const customerId = "FE5A365B-4626-4647-9621-FA23C8FBE283";
const apiKey = "L711kbH4AUCCrECZLHHIdzqCBXIgAR/+/jDGmKBMMnCnIEDuwAVcnwxPNp4ZzErGzuYs7BOdX7lrocAQYyMKRg==";
const rest_endpoint = "https://rest-api.telesign.com";
const timeout = 10 * 1000; // 10 secs

const client = new TeleSignSDK(customerId,
    apiKey,
    rest_endpoint,
    timeout // optional
    // userAgent
);

const phoneNumber = "6586941164";
const message = "You're scheduled for a dentist appointment at 2:30PM.";
const messageType = "ARN";

console.log("## MessagingClient.message ##");

function messageCallback(error, responseBody) {
    if (error === null) {
        console.log(`Messaging response for messaging phone number: ${phoneNumber}` +
            ` => code: ${responseBody['status']['code']}` +
            `, description: ${responseBody['status']['description']}`);
    } else {
        console.error("Unable to send message. " + error);
    }
}
client.sms.message(messageCallback, phoneNumber, message, messageType);