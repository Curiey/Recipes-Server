// import
var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("client-sessions");
const DButils = require("./DButils");
const axios = require("axios");

const api_domain = "https://api.spoonacular.com/recipes";

// initial express for handling GET & POST request
const app = express()
app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(session({
                cookieName: "session", // the cookie key name
                secret: process.env.COOKIE_SECRET, // the encryption key
                duration: 20 * 60 * 1000, // expired after 20 minutes
                activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration,
                //the session will be extended by activeDuration milliseconds
  })
);
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

// routes
const profile = require("./routes/profile");
const recipe = require("./routes/recipe");
const user = require("./routes/user");

//#region global simple
app.use(async (req, res, next) => {
  console.log("app.use");
  if(req.session && req.session.id != undefined) {
    await DButils.execQuery("SELECT id FROM Users").then((user) => {
      if (user.find((x) => x.id === req.session.id)) {
          req.id = req.session.id;
          // req.session.id = req.session.id; // refresh the session value
          // res.locals.id = req.session.id;
      }
  }).catch((error) => {throw {error}} );
  } next();
});
//#endregion

app.use("/profile", profile);
app.use("/recipe", recipe);
app.use("/user", user);

// - - - - - - - - - - - - - - functions - - - - - - - - - - - - - - - 
async function getRandomRecipes() {
  return await axios.get(`${api_domain}/random`, {
    params: {
      apiKey: process.env.spooncular_apiKey,
      number: process.env.numberOfRandom
    }
  })
}

function checkIfThereIsInstractions(recipes) {
  for (let index = 0; index < recipes.length; index++) {
    const { analyzedInstructions } = recipes[index];
    console.log("arrived here " + analyzedInstructions);
    if(!analyzedInstructions) {
      return false;
    }
  }
  return true;
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

async function transformSpoonacularRecipes(spoonacularRandomRecipes, id) {
  return spoonacularRandomRecipes.map((currentSpoonacularRacipe) => transformSpoonacularRecipe(currentSpoonacularRacipe));
  // let instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
}
// - - - - - - - - - - - - - -end of functions - - - - - - - - - - - - - - - 

// Welcome
app.get("/", async function (req, res) {
  let spoonacularRandomRecipes = await getRandomRecipes();
  while(checkIfThereIsInstractions(spoonacularRandomRecipes.data.recipes)) {
    spoonacularRandomRecipes = getRandomRecipes();
  }
  let randomRecipes = transformSpoonacularRecipes(spoonacularRandomRecipes);
  if(req.id) {
    let lastRecipesViewed = getHistory(req.id);
  }
  res.status(200).send({ RandomRecipes: {...randomRecipes}, LastRecipedViewed: {...lastRecipesViewed}});
});

// About
app.post("/about", function (req, res) {
  // TODO: implements
});


// Catch all error and send to client
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).send({ message: err.message, success: false });
});

// Start listening
const port = process.env.PORT || 3000; //environment variable
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

//#region promise Version
// const query = `SELECT * FROM dbo.users`; // const query = `INSERT INTO dbo.users (username,password) VALUES  ('a','a')`;
// DButils.execQuery(query)
//   .then((res) => isConatin(res))
//   .catch((error) => console.log(error.message));