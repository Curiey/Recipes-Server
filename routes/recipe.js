var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const Utils = require("../Utils");
const searchUtils = require("../searchUtils");
const axios = require("axios");


// - - - - - - - - - - - - - - http requests - - - - - - - - - - - - - - - 
router.get("/:id/information", async function (req, res, next) {
  let recipeID = req.params.id;
  if(req.query.spoonacular == 0) {
    let recipe = await Utils.getRecipeByID(req.id, recipeID);
    if(req.id) {
      await Utils.addToWatch(req.id, recipeID, 0)
      .catch((error) => next(error));
    }
    res.status(200).send({ ...recipe });
  } else if(req.query.spoonacular == 1) {
    let recipe = await Utils.getSpooncularRecipeByIDAndUpdateHistory(req.id, recipeID)
    .catch((error) => next(error));
    res.status(200).send({ ...recipe });
  } else {
    next(new Error("bad spoonacular value")); 
  }
})

//Search
router.get("/search/query/:searchQuery/amount/:num", (req, res) => {
  let { searchQuery, num } = req.params;
  //set search params
  search_params = {};
  search_params.query = searchQuery;
  search_params.number = num;
  search_params.instructionsRequired = true;
  search_params.apiKey = process.env.spooncular_apiKey;
  //check if queries params exist
  searchUtils.extractQueriesParams(req.query, search_params);

  searchUtils
    .searchForRecipes(search_params)
    .then((recipesResults) => Utils.addUserDetails(req.id, recipesResults))
    .then((info_array) => res.send(info_array))
    .catch((error) => {
      res.sendStatus(500);
    });
});


// Catch all error and send to client
router.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});
  

module.exports = router;