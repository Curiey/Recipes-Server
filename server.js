// import
var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("client-sessions");
var DButils = require("./DBUtils");

// initial express for handling GET & POST request
const app = express()
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(session({
                cookieName: "session", // the cookie key name
                secret: process.env.COOKIE_SECRET, // the encryption key
                duration: 20 * 60 * 1000, // expired after 20 minutes
                activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration,
                //the session will be extended by activeDuration milliseconds
  })
);
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

// routes
const profile = require("./routes/profile");
const recipes = require("./routes/recipes");
const users = require("./routes/users");

//#region global simple
app.use(async (req, res, next) => {
  if(req.session && req.session.id != undefined) {
    await DButils.execQuery("SELECT id FROM Users").then((users) => {
      if (users.find((x) => x.id === req.session.id)) {
          req.id = req.session.id;
          // req.session.id = req.session.id; // refresh the session value
          // res.locals.id = req.session.id;
          next();
      }
  }).catch((error) => {throw {error}} );
  } next();
});
//#endregion

app.use("/profile", profile);
app.use("/recipes", recipes);
app.use("/user", users);

// Welcome
app.post("/", function (req, res) {
  // TODO: implements
});

// About
app.post("/about", function (req, res) {
  // TODO: implements
});


// Catch all error and send to client
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
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