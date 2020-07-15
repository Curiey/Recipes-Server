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
}


router.get("/:id/information",async function (req, res) {
  let recipeID = req.params.id;
  let recipe = await getRecipeInfo(recipeID);
  let recipe_data = recipe.map((recipe) => recipe.data);
    // res.send(req.originalUrl);
    res.send();
  });







  router.get("/search", function (req, res) {
    res.send(req.originalUrl);
  });
  
  module.exports = router;