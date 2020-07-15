const axios = require("axios");


function extractQueriesParams(query_params, search_params) {
  let params_list = ["diet", "cuisine", "intolerance"];
  params_list.forEach((param) => {
    if (query_params[param]) {
      search_params[param] = query_params[param];
    }
  });
}

function extractRelvantRecipeData(recipes_info) {
  return recipes_info.map((recipes_info) => {
    const {id, title, readyInMinutes, aggregateLikes, vegetarian, vegan, glutenFree, image } = recipes_info.data;
    return {
      id: id,
      title: title,
      readyInMinutes: readyInMinutes,
      aggregateLikes: aggregateLikes,
      vegetarian: vegetarian,
      vegan: vegan,
      glutenFree: glutenFree,
      image: image,
    };
  });
}

function extractSearchResultsIds(search_response) {
  let recipes = search_response.data.results;
  recipes_id_list = [];
  recipes.map((element) => {
    recipes_id_list.push(element.id);
  });
  return recipes_id_list;
}

async function getRecipesInfo(recipes_id_list) {
  let promises = [];
  recipes_id_list.map((id) =>
    promises.push(
      axios.get(`${process.env.api_domain}/${id}/information/?${process.env.apiKey}`)
    )
  );
  let info_response1 = await Promise.all(promises);
  relevantRecipesData = extractRelvantRecipeData(info_response1);
  return relevantRecipesData;
}

async function searchForRecipes(search_params) {
  let search_response = await axios.get(
    `${process.env.api_domain}/search?${process.env.apiKey}`,
    {
      params: search_params
    }
  );
  let recipes_id_list = extractSearchResultsIds(search_response);
  let info_array = await getRecipesInfo(recipes_id_list);
  return info_array;
}


module.export = {
  extractQueriesParams: extractQueriesParams,
  searchForRecipes: searchForRecipes
}