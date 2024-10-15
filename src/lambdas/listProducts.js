const axios = require('axios');

exports.handler = async (event) => {
  try {
    const response = await axios.get('https://fakestoreapi.com/products');
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch products' }),
    };
  }
};
