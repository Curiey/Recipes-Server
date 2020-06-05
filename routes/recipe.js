var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";

// - - - - - - - - - - - - - - functions - - - - - - - - - - - - - - - 
async function getRecipeInfo(id) {
  return axios.get(`${api_domain}/${id}/information`, {
    params: {
      apiKey: process.env.spooncular_apiKey
    }
  })
}

function getIngredient(ingredient) {
  let { id, name } = ingredient;
  return { id, name };
}

function getInstruction(instruction) {
  let { number, step, ingredients } = instruction;
  ingredients = ingredients.map((ingredient) => getIngredient(ingredient));
  return { number, step, ingredients };
}

function extractDataFromRecipe(recipeDataSpooncular)
{
  let { id, servings, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes } = recipeDataSpooncular;
  let { extendedIngredients } = recipeDataSpooncular;
  let ingredients = extendedIngredients.map((ingredient) => getIngredient(ingredient));
  let { analyzedInstructions } = recipeDataSpooncular;
  let instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
  return { id, servings, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes, instructions, ingredients };
    //instructions, ingredients, serving, id, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes
}

async function checkIfIsBeenWatched(userID, recipeID) {
  let answer = await DButils.execQuery("SELECT * FROM WatchedSpoonacular WHERE userID='" + userID + "' and recipeID='" + recipeID + "'");
  if(answer.length == 0) {
    return false;
  }
  else {
    return true;
  }
}

async function checkIfIsFavorite(userID, recipeID) {
    let answer = await DButils.execQuery("SELECT * FROM FavoritesSpoonacular WHERE userID='" + userID + "' and recipeID='" + recipeID + "'");
    if(answer.length == 0) {
      return false;
    }
    else {
      return true;
  }
}

async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(recipe.data);
  if(id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id);
    recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
}
// - - - - - - - - - - - - - -end of functions - - - - - - - - - - - - - - - 


// - - - - - - - - - - - - - - http requests - - - - - - - - - - - - - - - 
router.get("/:id/information", async function (req, res) {
  let recipeID = req.params.id;
  let spoonacularRandomRacipe = await getRecipeInfo(recipeID);
  let recipe = transformSpoonacularRecipe(spoonacularRandomRacipe.data);
    res.status(200).send({ ...recipe });
  })

router.get("/search", function (req, res) {
    res.send(req.originalUrl);
  })

  // - - - - - - - - - - - - - - end of http requests - - - - - - - - - - - - - - - 
  
module.exports = router;