var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";

function getRecipeInfo(id) {
  return axios.get(`${api_domain}/${id}/information`, {
    params: {
      apiKey: process.env.spooncular_apiKey
    }
  });
};

function getIngredient(ingredient) {
  let { id, name } = ingredient;
  return { id, name };
};

function getInstruction(instruction) {
  let { number, step, ingredients } = instruction;
  let ingredientsAfterParse = ingredients.map((ingredient) => getIngredient(ingredient));
  return { number, step, ingredientsAfterParse };
};

function getIgredient() {
  return;
};

function extractDataFromRecipe(recipeDataSpooncular)
{
  let { id, servings, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes } = recipeDataSpooncular;
  let { extendedIngredients } = recipeDataSpooncular;
  let ingredients = extendedIngredients.map((ingredient) => getIngredient(ingredient));
  let { analyzedInstructions } = recipeDataSpooncular;
  let instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
  return { id, servings, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes, instructions, ingredients };
    //instructions, ingredients, serving, id, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes
};

router.get("/:id/information", async function (req, res) {
  let recipeID = req.params.id;
  let recipe = await getRecipeInfo(recipeID);
  let recipe_data_spooncular = extractDataFromRecipe(recipe.data).then();

   // check if the request came from a guest or user.
  if(req.id)
  {    // our data from azure: isFavorite, isBeenWatched
    recipe_data_spooncular.isBeenWatched = checkIfIsBeenWatched(req.id, recipeID);
    recipe_data_spooncular.isFavorite = checkIfIsFavorite(req.id, recipeID);
  }
    res.status(200).send({ recipe_data_spooncular });
  });







  router.get("/search", function (req, res) {
    res.send(req.originalUrl);
  });
  
  module.exports = router;