var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var DB = require("./DBUtils.js");

const app = express()
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files


// Field
let cookies_session_username_dict = {};
let cookie_session_timestamp_dict = {};

function checkIfUsernameExists(username) {

    let queryResult = DButilsAzure.execQuery("SELECT * FROM Users WHERE username = '" + username + "'");
    queryResult.then(function(result) {
        if(result.length > 0) {
            return true;
        }
    })
};

function verifyPassword(username, password) {

    let queryResult = DButilsAzure.execQuery("SELECT * FROM Users WHERE username = '" + username + "'");
    queryResult.then(function(result) {
        if(result.length > 0) {
            if(result[0].password == password) {
                return true;
            }
        }
    })
};

// GET requests handler
app.get('/', (req, res) => {
	res.status(200).send("Hello World");
});

// POST requests handler
app.post('/login', (req, res) => {
    //field verification
    if (!req.body.username) {
        res.status(400).send("missing username field");
    }
    if (!req.body.password) {
        res.status(400).send("missing password field");
    }

    //check validation
    // TODO:check with the DB if the username exists
    if(!checkIfUsernameExists(username)) {
        res.status(400).send("pase lo que pase, mean, wrong username or password.");
    }
    // TODO: check if the password match the given password at the request
    if(verifyPassword(username, req.password)) {
        res.status(400).send("pase lo que pase, mean, wrong username or password.");
    }

    //create session-cookies
    let seassion = addUserToServer(req.body.username)

    //set cookie
    document.cookie = seassion;

	res.status(200).send(seassion);
});

function addUserToServer(username) {
    
    let session = createSession(username);

    cookies_session_username_dict[session] = username;
    cookie_session_timestamp_dict[session] = new Date();

    return session;
};

function createSession(username) {
    
    let date = new Date();

    return username + "; " + date.getDate + "; " + date.getTime;
};

DB.execQuery("CREATE TABLE Users" +
              "(userID INT IDENTITY PRIMARY KEY NOT NULL, " +
              "username NVARCHAR(20) UNIQUE NOT NULL, " +
              "firstName NVARCHAR(10) NOL NULL, " +
              "lastName NVARCHAR(16) NOT NULL, " +
              "country NVARCHAR(20) NOT NULL, " +
              "password NVARCHAR(256) NOT NULL, " +
              "email NVARCHAR(30) NOT NULL, " +
              "imageList NVARCHAR(256) NOT NULL)")

// Start listening
const port = process.env.PORT || 3000; //environment variable
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});