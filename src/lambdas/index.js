const axios = require('axios');

const getProduct = async (event) => {
  console.log('getProduct function called');
  const productId = event.pathParameters.id;
  try {
    console.log(`Fetching product with ID: ${productId}`);
    const response = await axios.get(`https://fakestoreapi.com/products/${productId}`);
    console.log('Product fetched successfully');
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch product', details: error.message }),
    };
  }
};

const listProducts = async (event) => {
  console.log('listProducts function called');
  try {
    console.log('Fetching all products');
    const response = await axios.get('https://fakestoreapi.com/products');
    console.log('Products fetched successfully');
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch products', details: error.message }),
    };
  }
};

exports.handler = async (event) => {
  console.log('Lambda function invoked with event:', JSON.stringify(event, null, 2));
  
  try {
    if (event.resource === '/products/{id}' && event.httpMethod === 'GET') {
      return await getProduct(event);
    } else if (event.resource === '/products' && event.httpMethod === 'GET') {
      return await listProducts(event);
    } else {
      console.log('Invalid endpoint called');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid endpoint' }),
      };
    }
  } catch (error) {
    console.error('Unexpected error in Lambda handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error occurred', details: error.message }),
    };
  }
};
