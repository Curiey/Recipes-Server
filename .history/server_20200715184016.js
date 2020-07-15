// import
var express = require('express');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("client-sessions");
const DButils = require("./DButils");
const Utils = require("./Utils");
const axios = require("axios");
const cors = require('cors');

//TODO: Delete later
var fs = require('fs');
// --------------------

// initial express for handling GET & POST request
// app.use(cors());
const app = express()

app.use(logger("dev")); //logger
app.use(express.json()); // parse application/json
app.use(express.static(path.join(__dirname, "public"))); //To serve static files such as images, CSS files, and JavaScript files
app.use(cookieParser()); //Parse the cookies into the req.cookies
app.use(
  session({
    cookieName: "session", // the cookie key name
    secret: process.env.COOKIE_SECRET, // the encryption key
    duration: 20 * 60 * 1000, // expired after 20 minutes
    activeDuration: 0, // if expiresIn < activeDuration,
    //the session will be extended by activeDuration milliseconds
    cookie: {
      httpOnly: false,
    }
  })
);
app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
const corsConfig = {
  origin: true,
  credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

// routes
const profile = require("./routes/profile");
const recipe = require("./routes/recipe");
const user = require("./routes/user");

//#region global simple
app.use(async (req, res, next) => {
  console.log("new user connection");
  if (req.session && req.session.id != undefined) {
    await DButils.execQuery("SELECT id FROM Users").then((user) => {
      if (user.find((x) => x.id === req.session.id)) {
        req.id = req.session.id;
        req.session.id = req.session.id; // refresh the session value
        res.locals.id = req.session.id;
      }
    }).catch((error) => { throw { error } });
  } next();
});
//#endregion

app.use("/profile", profile);
app.use("/recipe", recipe);
app.use("/user", user);

// - - - - - - - - - - - - - - functions - - - - - - - - - - - - - - - 

function writeJSONToDisc(data) {
  fs.writeFile("input2.json", JSON.stringify(data), function (err) {
    if (err) throw err;
    console.log('complete');
  }
  );
}

function readJSONFromDisc() {
  var obj = JSON.parse(fs.readFileSync('input2.json', 'utf8'));
  return obj;
}


async function getRandomRecipes() {
  return await axios.get(`${process.env.api_domain}/random`, {
    params: {
      apiKey: process.env.spooncular_apiKey,
      number: process.env.numberOfRandom
    }
  })
  .catch((error) => next(error));
}

function checkIfThereIsInstractions(recipes) {
  for (let index = 0; index < recipes.length; index++) {
    const { analyzedInstructions } = recipes[index];
    console.log("arrived here " + index);
    if (!analyzedInstructions || analyzedInstructions.length == 0) {
      return false;
    }
  }
  return true;
}

function getInstruction(instruction) {
  let { number, step, ingredients } = instruction;
  ingredients = ingredients.map((ingredient) => getIngredient(ingredient));
  return { number, step, ingredients };
}

async function transformSpoonacularRecipes(spoonacularRandomRecipes, userID) {
  let result = await spoonacularRandomRecipes.map((currentSpoonacularRacipe) => Utils.transformSpoonacularRecipe(currentSpoonacularRacipe, userID));
  return Promise.all(result).then(function (result) {
    recipeList = [];
    for (let index = 0; index < result.length; index++) {
      recipeList.push(result[index]);
    }
    return recipeList;
  })
  // let instructions = analyzedInstructions[0].steps.map((step) => getInstruction(step));
}

async function getHistory(userID) {
  let recipesIDs = await DButils.execQuery("SELECT recipe1_ID, recipe2_ID, recipe3_ID FROM Histories WHERE userID='" + userID + "'");
  let { recipe1_ID, recipe2_ID, recipe3_ID } = recipesIDs[0];
  let allRecipesList = [recipe1_ID, recipe2_ID, recipe3_ID];

  // check which recipes is valid recipeID
  let recipesList = [];
  for (let index = 0; index < allRecipesList.length; index++) {
    if (allRecipesList[index] != -1) {
      recipesList.push(allRecipesList[index]);
    }
  }
  let userRecipesHistories = recipesList.map((currentRecipeID) => Utils.getSpooncularRecipeByID(userID, currentRecipeID));
  return Promise.all(userRecipesHistories)
    .then(function (result) {
      let fullRecipesAsList = [];
      for (let index = 0; index < recipesList.length; index++) {
        fullRecipesAsList.push(result[index]);
      }
      return fullRecipesAsList;
    })
    .catch(new Error("couldnt retrieve all recipes"));
}

// - - - - - - - - - - - - - -end of functions - - - - - - - - - - - - - - - 

// (EXPLORE)Get random recipes
app.get("/getRandomRecipes/explore"), async function (req, res) {
  let spoonacularRandomRecipes = await getRandomRecipes();

  while (!checkIfThereIsInstractions(spoonacularRandomRecipes)) {
    spoonacularRandomRecipes = await getRandomRecipes();
  }
  let randomRecipes = await transformSpoonacularRecipes(spoonacularRandomRecipes, req.id);
  let respond = { RandomRecipes: { ...randomRecipes } };

  res.status(200).send(respond);
}
app.get("/viewOurFamilyRecipes", async function (req, res, next) {
  let ourFamilyRecipesIds = [1, 2, 3, 4, 5];
  let ourFamilyRecipes = await Promise.all(ourFamilyRecipesIds.map((recipeID) => Utils.getRecipeByID(req.id, recipeID)));
  res.status(200).send([ ...ourFamilyRecipes ]);
});

// Welcome
app.get("/", async function (req, res, next) {

  //TODO: return it later ! ! !
  let spoonacularRandomRecipes = await getRandomRecipes();
  //  writeJSONToDisc(spoonacularRandomRecipes.data.recipes);
  //TODO: delete later ! ! !
  // let spoonacularRandomRecipes = readJSONFromDisc()

  while (!checkIfThereIsInstractions(spoonacularRandomRecipes)) { //TODO: after removing the read/write from disc change back to spoonacularRandomRecipes.data.recipes
    spoonacularRandomRecipes = await getRandomRecipes();
    // writeJSONToDisc(spoonacularRandomRecipes.data.recipes);
  }

  let randomRecipes = await transformSpoonacularRecipes(spoonacularRandomRecipes.data.recipes, req.id) //TODO: after removing the read/write from disc change back to spoonacularRandomRecipes.data.recipes
    .catch((error) => next(error));
  let randomRecpesList = []
  randomRecipes.map((arg) => randomRecpesList.push(arg));
  let respond = { RandomRecipes: randomRecpesList };
  if (req.id) {
    let lastRecipesViewed = await getHistory(req.id)
      .catch((error) => next(error));
    let lastRecipesViewedList = [];
    lastRecipesViewed.map((arg) => lastRecipesViewedList.push(arg));
    respond.LastRecipedViewed = lastRecipesViewedList;
  } else {
    respond.LastRecipedViewed = [];
  }
  res.status(200).send(respond);
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