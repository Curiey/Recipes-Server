var express = require("express");
var router = express.Router();
const DButils = require("../DButils");

// Register
app.post("/register", async (req, res, next) => {
  if(!req.id) throw { status: 401, message: "user already login. please logout first." };

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

// Login
app.post("/login", async (req, res, next) => {
  if(!req.id) throw { status: 401, message: "user already login. please logout first." };

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

// Logout
app.post("/logout", function (req, res) {
  req.session.reset(); // reset the session info --> send cookie when  req.session == undefined!!
  res.send({ success: true, message: "logout succeeded" });
  });

  module.exports = router;