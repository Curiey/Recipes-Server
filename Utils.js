/**
 * this class contains a function that are used in multiply different classes
 * to avoid duplicate code.
 */

const DButils = require("./DButils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";


//------------- SPOONCULAR FUNCTIONS --------------------

/**
 * this asynchronous function pulls from the spoonacular API a recipe
 * by a given recipe ID.
 * @param  id = the given recipe ID.
 */
async function getRecipeInfo(id) {
  let recipe = await axios.get(`${api_domain}/${id}/information`, {
    params: {
      apiKey: process.env.spooncular_apiKey
    }
  })
  return { ...recipe, spoonacular: 1 }
}

/**
 * this function extract the ingredients from the a JSON object that
 * retrieved from the spoonacular API.
 * @param ingredient - a guven JSON object that contains the ingredient values.
 */
function getIngredient(ingredient) {
  let { id, name, unit, amount } = ingredient;
  return { id, name, unit, amount, };
}

/**
 * this function extract all the ingredients instruction from a JSON object
 * that retrueved from the spoonacular API.
 * @param  instruction - a given JSON object that contains the instruction values.
 */
function getInstruction(instruction) {
  let { number, step, ingredients } = instruction;
  ingredients = ingredients.map((ingredient) => getIngredient(ingredient));
  return { number, step, ingredients };
}


/**
 * this function is responsible for extractong all the neccessary data
 * from the retrieved recipe from the spoonacular API.
 * @param recipeDataSpooncular - the given recipe that retrieved from the spoonacular API.
 */
function extractDataFromRecipe(recipeDataSpooncular) {
  let { id, servings, image, title, readyInMinutes, vegan, glutenFree, vegetarian, aggregateLikes } = recipeDataSpooncular;
  let { extendedIngredients } = recipeDataSpooncular;
  let ingredients = extendedIngredients.map((ingredient) => getIngredient(ingredient));
  let { analyzedInstructions } = recipeDataSpooncular;

  let instructions; //handle recipes with analyzedInstructions length zero
  if (analyzedInstructions.length == 0) {
    instructions = [];
  } else {
    instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
  }
  let spoonacular = 1;
  return { id, servings, image, title, readyInMinutes, vegan, vegetarian, glutenFree, aggregateLikes, instructions, ingredients, spoonacular };
  //instructions, ingredients, serving, id, image, title, readyInMinutes, vegan, vegetarian, aggregateLikes
}


/**
 * this asynchronous function checks if a given user by userID already viewed
 * a given recipe by recipeID from the spoonacular ID recipes and for recipes that uploaded by the users.
 * @param userID - a given user ID.
 * @param recipeID - a given recipe ID.
 * @param spoonacular - an indiciacation if the the given recipe by recipeID in a spoonacular recipe or a recipe that 
 *                      uploaded by the users. 1 - if it a spooncular recipe. 0 - if it recipe uploaded by the user.
 */
async function checkIfIsBeenWatched(userID, recipeID, spoonacular) {
  if (userID == undefined || recipeID == undefined || spoonacular == undefined) {
    throw new Error("bad argument");
  }
  if (spoonacular == 0) {
    let answer = await DButils.execQuery("SELECT * FROM Watched WHERE userID='" + userID + "' and recipeID='" + recipeID + "'")
      .catch((error) => console.log("user already watch this recipe, cannot add another record."));;
    if (answer.length == 0) {
      return false;
    }
    else {
      return true;
    }
  } else if (spoonacular == 1) {
    let answer = await DButils.execQuery("SELECT * FROM WatchedSpoonacular WHERE userID='" + userID + "' and recipeID='" + recipeID + "'")
      .catch((error) => console.log("user already watch this recipe, cannot add another record."));
    if (answer.length == 0) {
      return false;
    }
    else {
      return true;
    }
  } else {
    next(new Error("not valid spoonacular argument"));
  }
}

/**
 * this asynchronous function checks if a given user by userID is marked as favorite
 * recipe by a recipeID from the spoonacular API.
 * @param userID - a given user ID.
 * @param recipeID - a given recipe ID.
 */
async function checkIfIsFavorite(userID, recipeID) {
  let answer = await DButils.execQuery("SELECT * FROM FavoritesSpoonacular WHERE userID='" + userID + "' and recipeID='" + recipeID + "'");
  if (answer.length == 0) {
    return false;
  }
  else {
    return true;
  }
}

/**
 * this asynchronous function is responsible for updating in the DB
 * the last 3 recipes that the user viewed.
 * @param userID - a given user ID.
 * @param recipeID - a given recipe ID.
 */
async function updateHistory(userID, recipeID) {
  let userHistory = await DButils.execQuery(`SELECT recipe1_ID, recipe2_ID, recipe3_ID FROM Histories WHERE userID='${userID}'`);
  let { recipe1_ID, recipe2_ID } = userHistory[0];
  if (recipeID == recipe2_ID) {
    DButils.execQuery(
      `UPDATE Histories 
      SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}'   
      WHERE userID='${userID}'`);
  } else if (recipeID != recipe1_ID) {
    DButils.execQuery(
      `UPDATE Histories 
    SET recipe1_ID = '${recipeID}',  recipe2_ID = '${recipe1_ID}', recipe3_ID = '${recipe2_ID}'  
    WHERE userID='${userID}'`);
  }
}

/**
 * this asynchronous function is responsible for adding the recipe from the
 * spooncaular API or a recipe that added by a certain user to the DB to know which recipes the user watched.
 * @param {*} userID - a given user ID.
 * @param {*} recipeID - a given recipe ID.
 * @param spoonacular - an indiciacation if the the given recipe by recipeID in a spoonacular recipe or a recipe that 
 *                     uploaded by the users. 1 - if it a spooncular recipe. 0 - if it recipe uploaded by the user.
 */
async function addToWatch(userID, recipeID, spoonacular) {
  if (spoonacular == undefined || userID == undefined || recipeID == undefined) {
    next(new Error("user id or recipe id is undefined"))
  }
  if (spoonacular == 0) {
    await DButils.execQuery(`INSERT INTO Watched(userID, recipeID) VALUES ('${userID}', '${recipeID}')`)
      .catch((error) => console.log("user already watch this recipe, cannot add another record."));
  } else if (spoonacular == 1) {
    await DButils.execQuery(`INSERT INTO WatchedSpoonacular(userID, recipeID) VALUES ('${userID}', '${recipeID}')`)
      .catch((error) => console.log("user already watch this recipe, cannot add another record."));
  }
  // let { spoonacular, recipeID } = req.body;
  // if( spoonacular == undefined || recipeID == undefined || res.id ) throw { status: 400, message: "one of the argument is not specified." };

  // spoonacular = Utils.transformBinaryToBoolean(spoonacular);
  // if(spoonacular == "false") {  //Our recipe
  //   await DButils.execQuery(`INSERT INTO Watched VALUES ('${req.id}', '${recipeID}')`)
  //   .catch((error) => next(error));
  // } else if(spoonacular == "true") { // sponcular recipe
  //   await DButils.execQuery(`INSERT INTO WatchedSpoonacular VALUES ('${req.id}', '${recipeID}')`)
  //   .catch((error) => next(error))
  // }
  // res.status(201).send({ message: "recipe added seccessfuly", sucess: true });
}


/**
 * this asynchronous function is responisle for recieving a recipe from the spoonacular API
 * and tranfrom the recipe data in it to a values that suitable to our values and also for updating the
 * the neccesary table if the action commited by a user.
 * @param spoonacularRandomRecipes - a given recipe from the spoonacular API.
 * @param id - a given user ID.
 */
async function transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if (id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    recipe_data_spooncular.watched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id, 1);
    recipe_data_spooncular.liked = await checkIfIsFavorite(id, recipe_data_spooncular.id);
    updateHistory(id, recipe_data_spooncular.id);
    addToWatch(id, recipe_data_spooncular.id, 1);
  }
  return recipe_data_spooncular;
}


/**
 * this asynchronous function is responisle for recieving a recipe from the spoonacular API
 * and tranfrom the recipe data in it to a values that suitable to our values.
 * @param spoonacularRandomRecipes - a given recipe from the spoonacular API.
 * @param id - a given user ID.
 */
async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if (id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    recipe_data_spooncular.watched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id, 1);
    recipe_data_spooncular.liked = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
}

//------------- END OF SPOONCULAR FUNCTIONS --------------------

//-------------OUR RECIPES FUNCTIONS --------------------


/**
 * this function tranfrom a binary value to boolean value.
 * 1 to true. 0 to false.
 * @param {*} binary 
 */
function transformBinaryToBoolean(binary) {
  if (binary == 0) {
    return false;
  } else if (binary == 1) {
    return true;
  } else {
    new Error("not valid binary argument (not 0 or 1)");
  }
}

/**
 * this asynchronous function pulls from the DB a recipe uploaded by
 * some user by a given recipe ID.
 * @param recipeID - a given recipe ID.
 */
async function getOurRecipeInfo(recipeID) {
  let result = await DButils.execQuery("SELECT * FROM Recipes WHERE id='" + recipeID + "'");
  let recipe = result[0];
  let recipeIngridients = await DButils.execQuery("SELECT * FROM recipeIngredients, Ingredients WHERE [recipeIngredients].[recipeID]='" + recipeID + "' AND [recipeIngredients].[ingredientID]=[Ingredients].[id]");
  let recipeInstructions = await DButils.execQuery("SELECT * FROM recipeInstructions WHERE recipeID='" + recipeID + "'");
  
  recipe.vegan = transformBinaryToBoolean(recipe.vegan);
  recipe.vegetarian = transformBinaryToBoolean(recipe.vegetarian);
  recipe.glutenFree = transformBinaryToBoolean(recipe.glutenFree);

  return { ...recipe, ingredients: [...recipeIngridients], instructions: [...recipeInstructions], spoonacular: 0 };
}

/**
 * this asynchronous function pulls from the spoonacular API a recipe
 * by a given recipe ID by a user or by a guest.
 * @param userID - a given user ID.
 * @param recipeID - a given recipe ID.
 */
async function getSpooncularRecipeByID(userID, recipeID) {
  if (recipeID == undefined) {
    return;
  }
  let spoonacularRecipe = await getRecipeInfo(recipeID);
  let recipe = await transformSpoonacularRecipe(spoonacularRecipe.data, userID);
  return recipe;
};

/**
 * this asynchronous function is responisle for recieving a recipe from the spoonacular API
 * and tranfrom the recipe data in it to a values that suitable to our values and also for updating the
 * the neccesary table if the action commited by a user.
 * @param spoonacularRandomRecipes - a given recipe from the spoonacular API.
 * @param id - a given user ID.
 */
async function getSpooncularRecipeByIDAndUpdateHistory(userID, recipeID) {
  let spoonacularRandomRacipe = await getRecipeInfo(recipeID);
  let recipe = await transformSpoonacularRecipeAndUpdateHistory(spoonacularRandomRacipe.data, userID);
  return recipe;
};

/**
 * this asynchronous function is responisle for recieving a recipe from the spoonacular API
 * and tranfrom the recipe data in it to a values that suitable to our values.
 * @param spoonacularRandomRecipes - a given recipe from the spoonacular API.
 * @param id - a given user ID.
 */
async function transformSpoonacularRecipe(spoonacularRandomRecipes, id) {
  let recipe_data_spooncular = extractDataFromRecipe(spoonacularRandomRecipes);
  if (id)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    recipe_data_spooncular.watched = await checkIfIsBeenWatched(id, recipe_data_spooncular.id, 1);
    recipe_data_spooncular.liked = await checkIfIsFavorite(id, recipe_data_spooncular.id);
  }
  return recipe_data_spooncular;
};

/**
 *  this asynchronous function pulls from the DB a recipe by a given
 * recipe ID.
 * if thr action commited by a user the function will check also if the
 * user already watched by the user.
 * @param userID - a given user ID.
 * @param recipeID - a given recipe ID.
 */
async function getRecipeByID(userID, recipeID) {
  if (recipeID == undefined) {
    throw new Error("recipe id is undefined.");
  }
  let ourRecipe = await getOurRecipeInfo(recipeID);
  if (userID)    // check if the request came from a guest or user.
  {   // our data from azure: isFavorite, isBeenWatched
    await checkIfUserWatchedAndFavorited(userID, ourRecipe)
  }
  return { ...ourRecipe };
}

/**
 * this asynchronous function pulls from the DB if the already watched and marked
 * the recipe as favorites or not.
 * @param userID - a given user ID.
 * @param recipe - a given recipe.
 */
async function checkIfUserWatchedAndFavorited(userID, recipe) {
  recipe.watched = await checkIfIsBeenWatched(userID, recipe.id, recipe.spoonacular);
  recipe.liked = await checkIfIsFavorite(userID, recipe.id, recipe.spoonacular);
  return recipe;
}

/**
 * this asynchronous retrive from the DB an inidication
 * if a given user by userID already watched ont of the given recipes
 * and if he narked them is favorite or not.
 * @param userID - a given user ID.
 * @param recipesResult - a given recipes. 
 */
async function addUserDetails(userID, recipesResult) {
  if (userID == undefined) {
    return recipesResult;
  }
  let isWatchedAndFavorited = await Promise.all(recipesResult.map((recipe) => checkIfUserWatchedAndFavorited(userID, recipe)));
  return isWatchedAndFavorited;
};

//------------- END OF OUR RECIPES FUNCTIONS --------------------
module.exports = {
  getSpooncularRecipeByID: getSpooncularRecipeByID,
  getSpooncularRecipeByIDAndUpdateHistory: getSpooncularRecipeByIDAndUpdateHistory,
  transformSpoonacularRecipe: transformSpoonacularRecipe,
  getRecipeByID: getRecipeByID,
  addToWatch: addToWatch,
  addUserDetails: addUserDetails
};