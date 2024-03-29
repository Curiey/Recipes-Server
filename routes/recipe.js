/**
 * this class is responsible for handeling all the recipes logic.
 * the class handles the recipes requests from the spoonacular API
 * and from the DB.
 */
var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const Utils = require("../Utils");
const searchUtils = require("../searchUtils");
const axios = require("axios");


// - - - - - - - - - - - - - - http requests - - - - - - - - - - - - - - - 
/**
 * handler for http request pulling recipe from the spoonacular API or
 * from the DB a recipe.
 */
router.get("/:id/information", async function (req, res, next) {
  let recipeID = req.params.id;
  let recipe;
  if (req.query.spoonacular == 0) {
    recipe = await Utils.getRecipeByID(req.id, recipeID)
    .catch((error) => next(new Error("couldnt get user recipe")));
  } else if (req.query.spoonacular == 1) {
    recipe = await Utils.getSpooncularRecipeByIDAndUpdateHistory(req.id, recipeID)
      .catch((error) => next(error));
  } else {
    next(new Error("bad spoonacular value"));
  }
  if (req.id) {
    await Utils.addToWatch(req.id, recipeID, req.query.spoonacular)
      .catch((error) => console.log("user already watch this recipe, cannot add another record."));
  }
  res.status(200).send({ ...recipe });
})

/**
 * handler for http request pulling recipes from the spoonacular API
 * by a guven search query that given by the user/guest.
 */
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
    .then((info_array) => res.status(200).send(info_array))
    .catch((error) => {
      res.status(500).send(error);
    });
});


/**
 * default error handler.
 */
router.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});


module.exports = router;