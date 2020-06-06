var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const Utils = require("../Utils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";


// - - - - - - - - - - - - - - http requests - - - - - - - - - - - - - - - 
router.get("/:id/information", async function (req, res) {
  let recipeID = req.params.id;
  let recipe = await Utils.getSpooncularRecipeByIDAndUpdateHistory(req.id, recipeID);
    res.status(200).send({ ...recipe });
  })

router.get("/search", function (req, res) {
    res.send(req.originalUrl);
  })

  // - - - - - - - - - - - - - - end of http requests - - - - - - - - - - - - - - - 
  
module.exports = router;