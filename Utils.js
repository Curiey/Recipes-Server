const DButils = require("./DButils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";


//------------- SPOONCULAR FUNCTIONS --------------------
async function getRecipeInfo(id) {
  return axios.get(`${process.env.api_domain}/${id}/information`, {
    params: {
      apiKey: process.env.spooncular_apiKey
    }
  })
}

function getIngredient(ingredient) {
let { id, name, unit, amount } = ingredient;
return { id, name, unit, amount, };
}
  
function getInstruction(instruction) {
    let { number, step, ingredients } = instruction;
    ingredients = ingredients.map((ingredient) => getIngredient(ingredient));
    return { number, step, ingredients };
}

function extractDataFromRecipe(recipeDataSpooncular) {
  let { id, servings, image, title, readyInMinutes, vegan, glutenFree, vegetarian, aggregateLikes } = recipeDataSpooncular;
  let { extendedIngredients } = recipeDataSpooncular;
  let ingredients = extendedIngredients.map((ingredient) => getIngredient(ingredient));
  let { analyzedInstructions } = recipeDataSpooncular;

  let instructions; //handle recipes with analyzedInstructions length zero
  if(analyzedInstructions.length == 0) {
    instructions = [];
  } else {
    instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
  }
  let spoonacular = 1;
  return { id, servings, image, title, readyInMinutes, vegan, vegetarian, glutenFree, aggregateLikes, instructions, ingredients, spoonacular };
    //instructions, ingredients, serving, id, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes
}

async function checkIfIsBeenWatched(userID, recipeID, spoonacular) {
  if(userID == undefined || recipeID == undefined || spoonacular == undefined) {
    throw new Error("bad argument");
  }
  if(spoonacular == 0) {
    let answer = await DButils.execQuery("SELECT * FROM Watched WHERE userID='" + userID + "' and recipeID='" + recipeID + "'")
                              .catch((error) => console.log("user already watch this recipe, cannot add another record."));;
    if(answer.length == 0) {
      return false;
    }
    else {
      return true;
    }
  } else if(spoonacular == 1) {
    let answer = await DButils.execQuery("SELECT * FROM WatchedSpoonacular WHERE userID='" + userID + "' and recipeID='" + recipeID + "'")
                        .catch((error) => console.log("user already watch this recipe, cannot add another record."));
    if(answer.length == 0) {
      return false;
    }
    else {
      return true;
    }
  } else {
    next(new Error("not valid spoonacular argument"));
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
  let { recipe1_ID, recipe2_ID } = userHistory[0];
  if(recipeID == recipe2_ID) {
    DButils.execQuery(
      `UPDATE Histories 
      SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}'   
      WHERE userID='${userID}'`);
  } else if(recipeID != recipe1_ID){
  DButils.execQuery(
    `UPDATE Histories 
    SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}', recipe3_ID = '${recipe2_ID}'  
    WHERE userID='${userID}'`);
  }
}

async function addToWatch(userID, recipeID, spoonacular) {
  if(spoonacular == undefined || userID == undefined || recipeID == undefined) {
      next(new Error("user id or recipe id is undefined"))
  }
  if(spoonacular == 0) {
  await DButils.execQuery(`INSERT INTO Watched(userID, recipeID) VALUES ('${userID}', '${recipeID}')`)
  .catch((error) => console.log("user already watch this recipe, cannot add another record."));
  } else if(spoonacular == 1) {
    await DButils.execQuery(`INSERT INTO WatchedSpoonacular(userID, recipeID) VALUES ('${userID}', '${recipeID}')`)
    .catch((error) => console.log("user already watch this recipe, cannot add another record."));
  }
}

async function transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRecipes, id) {
    let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
    if(id)    // check if the request came from a guest or user.
    {   // our data from azure: isFavorite, isBeenWatched
        recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id, 1);
        recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
        updateHistory(id, recipe_data_spooncular.id);
        addToWatch(id, recipe_data_spooncular.id, 1);
    }
    return recipe_data_spooncular;
}

async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if(id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
      recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id, 1);
      recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
}

//------------- END OF SPOONCULAR FUNCTIONS --------------------

//-------------OUR RECIPES FUNCTIONS --------------------

function transformBinaryToBoolean(binary) {
  if(binary == 0) {
    return "false";
  } else if(binary == 1) {
    return "true";
  } else {
    new Error("not valid binary argument (not 0 or 1)");
  }
}

async function getOurRecipeInfo(recipeID)
{
  let result = await DButils.execQuery("SELECT * FROM Recipes WHERE id='" + recipeID + "'");
  let recipe = result[0];
  let recipeIngridients =  await DButils.execQuery("SELECT * FROM recipeIngredients, Ingredients WHERE [recipeIngredients].[recipeID]='" + recipeID + "' AND [recipeIngredients].[ingredientID]=[Ingredients].[id]" );

  recipe.vegan = transformBinaryToBoolean(recipe.vegan);
  recipe.vegetarian = transformBinaryToBoolean(recipe.vegetarian); 
  recipe.glutenFree = transformBinaryToBoolean(recipe.glutenFree);
  
  return {...recipe,  ingridients:  {...recipeIngridients } };
}

async function getSpooncularRecipeByID(userID, recipeID) {
  if(recipeID == undefined)
  {
    return;
  }
  let spoonacularRecipe = await getRecipeInfo(recipeID);
  let recipe = await transformSpoonacularRecipe(spoonacularRecipe.data, userID);
  return recipe;
};

async function getSpooncularRecipeByIDAndUpdateHistory(userID, recipeID) {
  let spoonacularRandomRacipe = await getRecipeInfo(recipeID);
  let recipe = await transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRacipe.data, userID);
  return recipe;
};

async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if(id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
      recipe_data_spooncular.isBeenWatched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id ,1);
      recipe_data_spooncular.isFavorite = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
};

async function getRecipeByID(userID, recipeID) {
  if(recipeID == undefined) {
    throw new Error("recipe id is undefined.");
  }
  let ourRecipe = await getOurRecipeInfo(recipeID);
  if(userID)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    ourRecipe.isBeenWatched = await checkIfIsBeenWatched(userID, recipeID, 0)
  }
  return { ...ourRecipe};
}

async function test(userID, recipe) {
  recipe.isBeenWatched = await checkIfIsBeenWatched(userID, recipe.id, 1);
  recipe.isFavorite = await checkIfIsFavorite(userID, recipe.id, 1);
  return recipe;
}

async function addUserDetails(userID, recipesResult) {
  if(userID == undefined) {
    return recipesResult;
  }
  let mmm = await Promise.all(recipesResult.map((recipe) => test(userID, recipe)));
  return mmm;
};

//------------- END OF OUR RECIPES FUNCTIONS --------------------
module.exports = {
  getSpooncularRecipeByID: getSpooncularRecipeByID,
  getSpooncularRecipeByIDAndUpdateHistory: getSpooncularRecipeByIDAndUpdateHistory,
  transformSpoonacularRecipe: transformSpoonacularRecipe,
  getRecipeByID: getRecipeByID,
  addToWatch: getRecipeByID,
  addUserDetails: addUserDetails
};