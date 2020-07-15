var express = require("express");
var router = express.Router();
const DButils = require("../modules/DButils");

router.get("/favorites", function (req, res) {
    res.send(req.originalUrl);
  });
  
router.get("/personalRecipes", function (req, res) {
    res.send(req.originalUrl);
    });