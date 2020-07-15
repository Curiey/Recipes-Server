var express = require("express");
var router = express.Router();
const DButils = require("../DButils");


router.get("/viewFavorites", function (req, res) {
    res.send(req.originalUrl);
  });
  
  router.get("/viewMyRecipes", function (req, res) {
    res.send(req.originalUrl);
  });

  router.post("/createRecipe", function (req, res) {
    res.send(req.originalUrl);
  });

  module.exports = router;