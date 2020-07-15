/**
 * this class is responsible for handeling all the logged in (profile) logic.
 */

var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const Utils = require("../Utils");


/**
 * middleware.
 * this middleware checks if all the http request that routed to profile class are
 * made by a registered user.
 */
router.use((req, res, next) => {
  if (req.id != undefined) next();
  else throw { status: 401, message: "unauthorized" };
})

/**
 * handler for http request pulling the favorite recipes of a user
 */
router.get("/viewFavorites", async function (req, res, next) {
  if (!req.id) {
    next(new Error("not autorize user."));
  }
  let recipes = {
    "recipeList": []
  };
  // favorites recipes taken from spooncular
  let favoritesIDsSpooncular = await DButils.execQuery("SELECT recipeID FROM FavoritesSpoonacular WHERE userID='" + req.id + "'");
  let favoritsRecipesSpooncular = favoritesIDsSpooncular.map((recipeID) => Utils.getSpooncularRecipeByID(req.id, recipeID.recipeID));
  await Promise.all(favoritsRecipesSpooncular)
    .then((result) => {
      result.forEach((recipe) => recipes.recipeList.push(recipe));
    })
    .catch((error) => res.send({ status: 401, message: error.message }));
  res.status(200).send(recipes);
});


/**
 * handler for http request pulling the recipes that
 * uploaded by the user.
 */
router.get("/viewMyRecipes", async function (req, res) {
  if (!req.id) {
    next(new Error("not autorize user."));
  }
  let recipes = {
    "recipeList": []
  };
  // favorites recipes taken from spooncular
  let userRecpiesIds = await DButils.execQuery("SELECT id FROM Recipes WHERE userID='" + req.id + "'");
  let userRecpies = userRecpiesIds.map((recipuserRecpiesIdseID) => Utils.getRecipeByID(req.id, recipuserRecpiesIdseID.id));

  await Promise.all(userRecpies)
    .then((result) => {
      result.forEach((recipe) => recipes.recipeList.push(recipe));
    })
    .catch((error) => res.send({ status: 401, message: error.message }));

  res.status(200).send(recipes);
});


/**
 * this function tranfrom a boolean value to binary value.
 * true to 1. false to 0.
 * @param boolean - a given boolean value.
 */
function transformBooleanToBinary(boolean) {
  if (boolean == true) {
    return 1;
  } else if (boolean == false) {
    return 0;
  } else {
    new Error("not valid boolean argument (not 0 or 1)");
  }
}

/**
 * this asynchronous function pulls from the DB an Ingredient by
 * the Ingredient name.
 * @param indregiantName - a given ingredient name.
 */
async function getIngredientByName(indregiantName) {
  let result = await DButils.execQuery(`SELECT id FROM Ingredients WHERE  name='${indregiantName}'`)
  if (result.length > 0) {
    return result[0].id;
  }
  return undefined;
}

/**
 * this asynchronous function adds to the DB a new Ingredient.
 * @param indregiantName - a given Ingredient name.
 */
async function createNewIngredient(indregiantName) {
  if (indregiantName == undefined) new Error("cannot insert ingredient without name.");
  let ingredientID = await DButils.execQuery(`INSERT INTO Ingredients(name) VALUES ('${indregiantName}') SELECT SCOPE_IDENTITY()`)
  if (ingredientID != undefined) {
    console.log(ingredientID);
    let { id } = ingredientID[0];
    return id;
  }
  else {
    throw Error("failed at createNewIngredient.");
  }
  // .then((ingredientID) => {
  //   console.log(ingredientID);
  //   return ingredientID[0];
  // })
  // .catch((error) => next(error));
}

/**
 * this asynchronous function adds to a given recipe by a recipe ID a
 * single ingredient in the DB.
 */
async function addIngredientToRecipe(recipeID, ingredient) {
  let ingredientID = await getIngredientByName(ingredient.name);
  if (ingredientID == undefined) {
    ingredientID = await createNewIngredient(ingredient.name)
      .catch((error) => console.log("could not create new indregiant"));
  }
  let { amount, unit } = ingredient;
  await DButils.execQuery(`INSERT INTO RecipeIngredients(recipeID, ingredientID, amount, unit) VALUES ('${recipeID}', '${ingredientID}', '${amount}', '${unit}') SELECT SCOPE_IDENTITY() AS id`)
    .catch((error) => next(error));
}

/**
 * this function gets a recipe and a list of ingredients and adds
 * all the ingredients to to the recipe.
 * @param recipe - a given recipe.
 * @param ingredients - a given list of ingredients.
 */
function addIngredients(recipe, ingredients) {
  if (recipe == undefined) new Error("got bad argument. recipeID cannot be found.")
  let { id } = recipe[0];
  ingredients.map((ingredient) => addIngredientToRecipe(id, ingredient));
  return id;
}

/**
 * this asynchronous function adds to a given recipe by a recipe ID a
 * single instruction in the DB.
 */
async function addinstructionToRecipe(recipeID, instruction) {
  let { number, step } = instruction;
  await DButils.execQuery(`INSERT INTO RecipeIngredients(recipeID, instructionID, context) VALUES ('${recipeID}', '${number}', '${step}')`)
    .catch((error) => next(error));
}

/**
 * this function gets a recipe and a list of instructions and adds
 * all the instructions to to the recipe.
 * @param recipeID - a given recipe id.
 * @param instructions - a given list of instructions.
 */
function addinstructions(recipeID, instructions) {
  if (recipeID == undefined || instructions == undefined) new Error("got bad argument. recipeID or instructions cannot be found.")
  instructions.map((instruction) => addinstructionToRecipe(recipeID, instruction));
}


/**
 * handler for http request for uploading a new recipe by
 * a registered user.
 */
router.post("/createRecipe", async function (req, res, next) {
  let { title, readyInMinutes, vegan, vegetarian, glutenFree, instructions, ingredients, serving, image } = req.body;
  if (title == undefined || readyInMinutes == undefined || vegan == undefined || vegetarian == undefined || glutenFree == undefined || instructions == undefined || serving == undefined || image == undefined || ingredients == undefined) throw { status: 400, message: "one of the argument is not specified." };

  // vegan - transform binary to boolean
  vegan = transformBooleanToBinary(vegan);
  vegetarian = transformBooleanToBinary(vegetarian);
  glutenFree = transformBooleanToBinary(glutenFree);

  try {
    await DButils.execQuery(`INSERT INTO Recipes(userID, title, readyInMinutes, aggregateLikes, vegan, vegetarian, glutenFree, serving, image) VALUES ('${req.id}', '${title}', '${readyInMinutes}', '0', '${vegan}', '${vegetarian}', '${glutenFree}', '${serving}', '${image}') SELECT SCOPE_IDENTITY() AS id`)
    .then((recipeID) => addIngredients(recipeID, ingredients))
    .then((recipeID) => addinstructions(recipeID, instructions))
      .catch((error) => next(error));
    console.log("recipe done");
    res.status(200).send({ message: "recipe created", sucess: true });
  } catch (error) {
    next(error);
  }
});


/**
 * handler for http request for adding a new favorite recipe
 * to a registered user.
 */
router.post("/addToFavorites", async function (req, res) {
  let { recipeID } = req.body;
  if (recipeID == undefined || req.id == undefined) throw { status: 400, message: "one of the argument is not specified." };
  await DButils.execQuery(`INSERT INTO FavoritesSpoonacular VALUES ('${req.id}', '${recipeID}')`)
    .then((result) => res.status(201).send({ message: "recipe added seccessfuly", sucess: true }))
    .catch((error) => { throw { status: 409, message: "recipe already marked as favorite by the user" } });
});



/**
 * default error handler.
 */
router.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});


module.exports = router;