var express = require("express");
var router = express.Router();
const DButils = require("../DButils");

router.use((req, res, next) => {
    if(req.id != undefined) next();
    else throw { status: 401, message: "unauthorized" };
})

router.get("/viewFavorites", function (req, res) {
    let x = req.username;
    res.send(req.originalUrl);
  });
  
  router.get("/viewMyRecipes", function (req, res) {
    res.send(req.originalUrl);
  });

  router.post("/createRecipe", async function (req, res) {
    let {title, readyInMinutes, aggregateLikes, vegan, vegetarian, instructions, serving, image } = req.body;
    if(title == undefined || readyInMinutes == undefined || aggregateLikes == undefined || vegan == undefined || vegetarian == undefined || instructions == undefined || serving == undefined || image == undefined ) throw { status: 400, message: "one of the argument is not specified." };

    try {
        await DButils.execQuery(
          `INSERT INTO Recipes VALUES ('${req.id}', '${title}', '${readyInMinutes}', '${aggregateLikes}', '${vegan}', '${vegetarian}', '${instructions}', '${serving}', '${image}')`
        ).catch((error) => next(error));
        res.status(200).send({ message: "recipe created", sucess: true });
      } catch (error) {
        next(error);
      }
  });

  module.exports = router;