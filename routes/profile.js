var express = require("express");
var router = express.Router();
const DButils = require("../DButils");
const Utils = require("../Utils");


router.use((req, res, next) => {
    if(req.id != undefined) next();
    else throw { status: 401, message: "unauthorized" };
})

router.get("/viewFavorites", async function (req, res, next) {
  if(!req.id) {
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
  
router.get("/viewMyRecipes", async function (req, res) {
  if(!req.id) {
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

function transformBooleanToBinary(boolean) {
  if(boolean == "true") {
    return 1;
  } else if(boolean == "false") {
    return 0;
  } else {
    new Error("not valid boolean argument (not 0 or 1)");
  }
}

async function getIngredientByName(indregiantName) {
  let result =  await DButils.execQuery(`SELECT id FROM Ingredients WHERE  name='${indregiantName}'`)
  if(result.length > 0) {
    return result[0];
  }
  return undefined;
}

async function createNewIngredient(indregiantName) {
  if(indregiantName == undefined) new Error("cannot insert ingredient without name.");
  await DButils.execQuery(`INSERT INTO Ingredients(name) VALUES ('${indregiantName}') SELECT SCOPE_IDENTITY()`)
  .then((ingredientID) => {return ingredientID})
  .catch((error) => next(error));
}

async function addIngredientToRecipe(recipeID, ingredient) {
  let ingredientID = await getIngredientByName(ingredient.name);
  if(ingredientID == undefined) {
    ingredientID = await createNewIngredient(ingredient.name)
    .catch((error) => console.log("could not create new indregiant"));
  }
  let { amount, unit } = ingredient;
  await DButils.execQuery(`INSERT INTO RecipeIngredients(recipeID, ingredientID, amount, unit) VALUES ('${recipeID}', '${ingredientID}', '${amount}', '${unit}') SELECT SCOPE_IDENTITY() AS id`)
  .then((recipeID) => addIngredients(recipeID, ingredients))
  .catch((error) => next(error));
}

function addIngredients(recipe, ingredients) {
  if(recipe == undefined) new Error("got bad argument. recipeID cannot be found.")
  let { id } = recipe[0];
  ingredients.map((ingredient) => addIngredientToRecipe(id, ingredient));
}

router.post("/createRecipe", async function (req, res, next) {
  let {title, readyInMinutes, vegan, vegetarian, glutenFree, instructions, ingredients, serving, image } = req.body;
  if(title == undefined || readyInMinutes == undefined || vegan == undefined || vegetarian == undefined || glutenFree == undefined || instructions == undefined || serving == undefined || image == undefined || ingredients == undefined ) throw { status: 400, message: "one of the argument is not specified." };
  
  // vegan - transform binary to boolean
  vegan = transformBooleanToBinary(vegan);
  vegetarian = transformBooleanToBinary(vegetarian);
  glutenFree = transformBooleanToBinary(glutenFree);

  try {
      await DButils.execQuery(`INSERT INTO Recipes(userID, title, readyInMinutes, aggregateLikes, vegan, vegetarian, glutenFree, instructions, serving, image) VALUES ('${req.id}', '${title}', '${readyInMinutes}', '0', '${vegan}', '${vegetarian}', '${glutenFree}', '${instructions}', '${serving}', '${image}') SELECT SCOPE_IDENTITY() AS id`)
      .then((recipeID) => addIngredients(recipeID, ingredients))
      .catch((error) => next(error));
      res.status(200).send({ message: "recipe created", sucess: true });
    } catch (error) {
      next(error);
    }
});

router.post("/addToFavorites", async function (req, res) {
  let { recipeID } = req.body;
  if( recipeID == undefined || req.id == undefined ) throw { status: 400, message: "one of the argument is not specified." };
  await DButils.execQuery(`INSERT INTO FavoritesSpoonacular VALUES ('${req.id}', '${recipeID}')`)
  .then((result) => res.status(201).send({ message: "recipe added seccessfuly", sucess: true }))
  .catch((error) => {throw {  status: 409, message: "recipe already marked as favorite by the user"}});
});

router.post("/addToWatched", async function (req, res) {
  let { spoonacular, recipeID } = req.body;
  if( spoonacular == undefined || recipeID == undefined || res.id ) throw { status: 400, message: "one of the argument is not specified." };

  if(spoonacular == 0) {  //Our recipe
    await DButils.execQuery(`INSERT INTO Watched VALUES ('${req.id}', '${recipeID}')`)
    .catch((error) => next(error));
  } else if(spoonacular == 1) { // sponcular recipe
    await DButils.execQuery(`INSERT INTO WatchedSpoonacular VALUES ('${req.id}', '${recipeID}')`)
    .catch((error) => next(error))
  }
  res.status(201).send({ message: "recipe added seccessfuly", sucess: true });
});


// Catch all error and send to client
router.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});


module.exports = router;