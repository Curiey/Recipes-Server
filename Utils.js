const DButils = require("./DButils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";


//------------- SPOONCULAR FUNCTIONS --------------------
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

function extractDataFromRecipe(recipeDataSpooncular) {
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

async function updateHistory(userID, recipeID) {
  let userHistory = await DButils.execQuery(`SELECT recipe1_ID, recipe2_ID, recipe3_ID FROM Histories WHERE userID='${userID}'`);
  let { recipe1_ID, recipe2_ID, recipe3_ID} = userHistory[0];
  if(recipeID == recipe1_ID) {
    console.log("continue");

  } else if(recipeID == recipe2_ID) {
    DButils.execQuery(
      `UPDATE Histories 
      SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}'   
      WHERE userID='${userID}'`);

  } else {
  DButils.execQuery(
    `UPDATE Histories 
    SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}', recipe3_ID = '${recipe2_ID}'  
    WHERE userID='${userID}'`);
  }
}

async function transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRecipes, id) {
    let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
    if(id)    // check if the request came from a guest or user.
    {   // our data from azure: isFavorite, isBeenWatched
        recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id);
        recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
        updateHistory(id, recipe_data_spooncular.id);
    }
    return recipe_data_spooncular;
}

async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if(id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
      recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id);
      recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
}

//------------- END OF SPOONCULAR FUNCTIONS --------------------

//-------------OUR RECIPES FUNCTIONS --------------------
async function getOurRecipeInfo(recipeID)
{
  let recipe = await DButils.execQuery("SELECT * FROM Recipes WHERE id='" + recipeID + "'");
  let recipeIngridients =  await DButils.execQuery("SELECT * FROM recipeIngredients, Ingredients WHERE [recipeIngredients].[recipeID]='" + recipeID + "' AND [recipeIngredients].[ingredientID]=[Ingredients].[id]" );
  console.log(recipeID);
  console.log({  ...recipe[0] ,  ingridients: {...recipeIngridients} });
  return {...recipe[0],  ingridients:  {...recipeIngridients } };
}



//------------- END OF OUR RECIPES FUNCTIONS --------------------
module.exports = {
  getSpooncularRecipeByID: async function getSpooncularRecipeByID(userID, recipeID) {
                  if(recipeID == undefined)
                  {
                    return;
                  }
                  let spoonacularRecipe = await getRecipeInfo(recipeID);
                  let recipe = await transformSpoonacularRecipe(spoonacularRecipe.data, userID);
                  return recipe;
  },
  getSpooncularRecipeByIDAndUpdateHistory: async function getSpooncularRecipeByIDAndUpdateHistory(userID, recipeID) {
                  let spoonacularRandomRacipe = await getRecipeInfo(recipeID);
                  let recipe = await transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRacipe.data, userID);
                  return recipe;
  },
  transformSpoonacularRecipe: async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
    let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
    if(id)    // check if the request came from a guest or user.
    {   // our data from azure: isFavorite, isBeenWatched
        recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id);
        recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
    }
    return recipe_data_spooncular;
  },
  getRecipeByID: async function getRecipeByID(userID, recipeID) {
    if(recipeID == undefined)
    {
      return;
    }

    let ourRecipe = await getOurRecipeInfo(recipeID);
    return { ...ourRecipe};
  }
};