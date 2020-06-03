// import
var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("client-sessions");
var DButils = require("./DBUtils");
const bcrypt = require("bcrypt");


// initial express for handling GET & POST request
const app = express()
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(session({cookieName: "session", // the cookie key name
                secret: process.env.COOKIE_SECRET, // the encryption key
                duration: 20 * 60 * 1000, // expired after 20 minutes
                activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration,
                //the session will be extended by activeDuration milliseconds
  })
);
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded



// Field
let cookies_session_username_dict = {}; //key: session, value:username
let cookie_session_timestamp_dict = {}; //key: session, value:timestamp

// ---------------- Private function ----------------

// ---------------- Request Handlers ----------------

// GET requests handler
app.get('/', (req, res) => {
	res.status(200).send("Hello World");
});


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
      req.session.user_id = user.userID;
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

//Logout
app.post("/Logout", function (req, res) {
  req.session.reset(); // reset the session info --> send cookie when  req.session == undefined!!
  res.send({ success: true, message: "logout succeeded" });
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