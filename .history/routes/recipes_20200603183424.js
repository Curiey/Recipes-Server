var express = require("express");
var router = express.Router();
const DButils = require("../DButils");

router.get("/search", function (req, res) {
    res.send(req.originalUrl);
  });
  
router.get("/{id}/inforamtion", function (req, res) {
    res.send(req.originalUrl);
  });

  module.exports = router;