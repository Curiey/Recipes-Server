/**
 * this class is responsible for handeling all the user logic.
 * the class handles the register, login and logout actions.
 */
var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const bcrypt = require("bcrypt");

/**
 * handler for http request for registering a new user and
 * add him to the DB.
 */
router.post("/register", async (req, res, next) => {
  if (req.id != undefined) throw { status: 401, message: "User already logged in." };

  try {
    // parameters exists
    if (!req.body.username || !req.body.firstName || !req.body.lastName || !req.body.country || !req.body.password || !req.body.email || !req.body.image) {
      throw { status: 400, message: "Not all reqired argument was given." };
    }
    // valid parameters

    // username exists
    const users = await DButils.execQuery("SELECT username FROM Users");

    if (users.find((x) => x.username === req.body.username))
      throw { status: 409, message: "username taken" };

    // add the new username
    let hash_password = bcrypt.hashSync(
      req.body.password,
      parseInt(process.env.bcrypt_saltRounds)
    );
    await DButils.execQuery(
      `INSERT INTO Users VALUES ('${req.body.username}', '${req.body.firstName}', '${req.body.lastName}', '${req.body.country}', '${hash_password}', '${req.body.email}', '${req.body.image}')`
    );

    const userID = await DButils.execQuery(`SELECT id FROM Users WHERE username = '${req.body.username}'`);

    await DButils.execQuery(`INSERT INTO Histories(userID) VALUES ('${userID[0].id}')`);
    // res.redirect('/'); //change path to welcome where login is at
    res.status(201).send({ message: "user created", success: true });
  } catch (error) {
    next(error);
  }
})

/**
 * handler for http request for loging in a user and
 * assign him a new session.
 */
router.post("/login", async (req, res, next) => {
  try {
    if (req.id != undefined) throw { status: 401, message: "user already logged in. please logout first." };

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
      throw { status: 401, message: "Username or Password incorrect." };
    }

    // Set cookie
    req.session.id = user.id;
    // req.session.save();
    // res.cookie(session_options.cookieName, user.id, cookies_options);

    // return cookie
    res.status(200).send({ message: "login succeeded", success: true });
  } catch (error) {
    next(error);
  }
})

/**
 * handler for http request for loging out a user and
 * remove his session.
 */
router.get("/logout", function (req, res) {
  if (req.id != undefined) {
    req.session.reset(); // reset the session info --> send cookie when  req.session == undefined!!
    res.send({ success: true, message: "logout succeeded" });
  } else {
    req.session.reset();
    res.send({ status: 200, message: "user wasnt logged in" });
  };
})


/**
 * default error handler.
 */
router.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});


module.exports = router;