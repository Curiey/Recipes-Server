const DButils = require("./DButils");
const axios = require("axios");


function extractQueriesParams(query_params, search_params) {
  let params_list = ["diet", "cuisine", "intolerance"];
  params_list.forEach((param) => {
    if (query_params[param]) {
      search_params[param] = query_params[param];
    }
  });
  //console.log(search_params);
}

async function searchForRecipes(search_params) {
let search_response = await axios.get(
    //https://api.spoonacular.com/recipes/search?query=cheese&number=2&apiKey=8888fa9d5e894d3f8f6ead539bc3b747
    `https://api.spoonacular.com/recipes/search`,
    {
    params: search_params,
    }
);
const recipes_id_list = extractSearchResultsIds(search_response);
let info_array = await getRecipesInfo(recipes_id_list);
return info_array;
}
  
async function getRecipesInfo(recipes_id_list) {
  let promises = [];
  recipes_id_list.map((id) =>
    promises.push(
      //`https://api.spoonacular.com/recipes/716429/information`,
      axios.get(`https://api.spoonacular.com/recipes/${id}/information`, {
        params: {
          apiKey: apiKey,
        },
      })
    )
  );
  let info_response1 = await Promise.all(promises);
  relevantRecipesData = extractRelvantRecipeData(info_response1);
  return relevantRecipesData;
}
  
function extractRelvantRecipeData(recipes_info) {
  return recipes_info.map((recipes_info) => {
    const {
      id,
      title,
      readyInMinutes,
      aggregateLikes,
      vegetarian,
      vegan,
      glutenFree,
      image,
    } = recipes_info.data;
    return {
      [id]: {
        title: title,
        readyInMinutes: readyInMinutes,
        aggregateLikes: aggregateLikes,
        vegetarian: vegetarian,
        vegan: vegan,
        glutenFree: glutenFree,
        image: image,
      },
    };
  });
}
  
async function promiseAll(func, params_list) {
  let promises = [];
  params_list.map((param) => promises.push(func(param)));
  let info_response = await Promise.all(promises);
  return info_response;
}
  
function extractSearchResultsIds(search_response) {
  let recipes = search_response.data.results;
  recipes_id_list = [];
  recipes.map((element) => {
    recipes_id_list.push(element.id);
  });
  return recipes_id_list;
}
  
  //exports.searchForRecipes = searchForRecipes;
  //exports.extractQueriesParams = extractQueriesParams;
  
  //res.send(recipes.data);
  
module.export = {
  extractQueriesParams: extractQueriesParams
}