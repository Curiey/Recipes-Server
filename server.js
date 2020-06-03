// import
var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var DButils = require("./DBUtils");
const bcrypt = require("bcrypt");

// initial express for handling GET & POST request
const app = express()
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files

// Field
let cookies_session_username_dict = {}; //key: session, value:username
let cookie_session_timestamp_dict = {}; //key: session, value:timestamp

// ---------------- Private function ----------------

// Check if given username existing in Database
function checkIfUsernameExists(username) {
    DButils.execQuery("SELECT * FROM Users WHERE username = '" + username + "'")
    .then((result) => result.length > 0)
    .catch((error) => console.log(error.message));
};

// Check if given password match to the given password in Database
function verifyPassword(username, password) {
    DButils.execQuery("SELECT password FROM Users WHERE username = '" + username + "'")
    .then((result) => result.length > 0 )
    .then((result) => result.password == password)
    .catch((error) => console.log(error.message));
};

// Create session for a given username
function createSession(username) {
    let date = new Date();
    return username + "; " + date.getDate + "; " + date.getTime;
};

// add user to seession structs
function addUserToServer(username) {
    
    let session = createSession(username);

    cookies_session_username_dict[session] = username;
    cookie_session_timestamp_dict[session] = new Date();

    return session;
};

// ---------------- Request Handlers ----------------

// GET requests handler
app.get('/', (req, res) => {
	res.status(200).send("Hello World");
});

// POST requests handler - LOGIN
// app.post('/login', (req, res) => {
//     let username = req.body.username;
//     let password =req.body.password;

//     //field verification
//     if (!username) res.status(400).send("missing username field");
//     if (!password) res.status(400).send("missing password field");

//     //check validation
//     if(!checkIfUsernameExists(username)) res.status(400).send("pase lo que pase, mean, wrong username or password.");
//     if(verifyPassword(username, password)) res.status(400).send("pase lo que pase, mean, wrong username or password.");

//     //create session-cookies
//     let seassion = addUserToServer(req.body.username)

//   // Set cookie
//   res.cookie("cookieName", "cookieValue", cookies_options); // options is optional

//   // return cookie
//   res.status(200).send("login succeeded");
// });


app.post("/Login", async (req, res, next) => {
    try {
      // check that username exists
      const users = await DButils.execQuery("SELECT username FROM Users");
      if (!users.find((x) => x.username === req.body.username))
        throw { status: 401, message: "Username or Password incorrect" };
  
      // check that the password is correct
      const user = (
        await DButils.execQuery(
          `SELECT * FROM Users WHERE username = '${req.body.username}'`
        )
      )[0];
  
      if (!bcrypt.compareSync(req.body.password, user.password)) {
        throw { status: 401, message: "Username or Password incorrect" };
      }
  
      // Set cookie
      req.session.user_id = user.user_id;
      // req.session.save();
      // res.cookie(session_options.cookieName, user.user_id, cookies_options);
  
      // return cookie
      res.status(200).send({ message: "login succeeded", success: true });
    } catch (error) {
      next(error);
    }
  });


  //register
  app.post("/Register", async (req, res, next) => {
    try {
      // parameters exists
      if (!req.body.username || !req.body.firstName || !req.body.lastName || !req.body.country || !req.body.password || !req.body.email || !req.body.imageLink) {
        throw { status: 400, message: "Not all reqired argument was given." };
      }
      // valid parameters

      // username exists
      const users = await DButils.execQuery("SELECT username FROM users");
  
      if (users.find((x) => x.username === req.body.username))
        throw { status: 409, message: "Username taken" };
  
      // add the new username
      let hash_password = bcrypt.hashSync(
        req.body.password,
        parseInt(process.env.bcrypt_saltRounds)
      );
      await DButils.execQuery(
        `INSERT INTO Users VALUES ('${req.body.username}', '${req.body.firstName}', '${req.body.lastName}', '${req.body.country}', '${hash_password}', '${req.body.email}', '${req.body.imageLink}')`
      );
      res.status(201).send({ message: "user created", success: true });
    } catch (error) {
      next(error);
    }
  });



// Catch all error and send to client
app.use((err, req, res, next) => {
    console.log(err.message);
  
    res.status(500).json({
      message: err.message
    });
  });

// Start listening
const port = process.env.PORT || 3000; //environment variable
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

//#region promise Version
// const query = `SELECT * FROM dbo.users`; // const query = `INSERT INTO dbo.users (username,password) VALUES  ('a','a')`;
// DButils.execQuery(query)
//   .then((res) => isConatin(res))
//   .catch((error) => console.log(error.message));