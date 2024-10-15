const axios = require('axios');

exports.handler = async (event) => {
  const productId = event.pathParameters.id;
  try {
    const response = await axios.get(`https://fakestoreapi.com/products/${productId}`);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch product' }),
    };
  }
};
