const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');

// Function to get the host IP
const getHostIP = () => {
  return new Promise((resolve, reject) => {
    exec('hostname -I | awk \'{print $1}\'', (error, stdout, stderr) => {
      if (error) {
        reject(`Error getting host IP: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Error getting host IP: ${stderr}`);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Configure AWS SDK to use LocalStack
AWS.config.update({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test'
});

// Create service clients
const lambda = new AWS.Lambda();
const apigateway = new AWS.APIGateway();

// Function to zip Lambda function
function zipLambdaFunction() {

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream('lambda.zip');
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log('Lambda function zipped successfully');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.file('src/lambdas/index.js', { name: 'index.js' });
    archive.directory('node_modules', 'node_modules');
    archive.finalize();
  });
}

// Function to create or update Lambda function
async function deployLambda() {
  const functionName = 'productFunction';
  const handler = 'index.handler';
  const role = 'arn:aws:iam::000000000000:role/lambda-role';
  const hostIP = await getHostIP();

  try {
    await zipLambdaFunction();
    const zipFile = fs.readFileSync(path.join(__dirname, 'lambda.zip'));

    const lambdaParams = {
      FunctionName: functionName,
      Handler: handler,
      Role: role,
      Code: { ZipFile: zipFile },
      Runtime: 'nodejs14.x',
      Timeout: 900,
      Environment: {
        Variables: {
          accessKeyId: 'test',
          awsregion: 'us-east-1',
          secretAccessKey: 'test',
          NODE_OPTIONS: '--inspect-brk=0.0.0.0:9229',
          HOST_IP: hostIP,
          IS_LOCAL: "true"
        }
      }
    };

    try {
      await lambda.createFunction(lambdaParams).promise();
      console.log(`Lambda function ${functionName} created`);
    } catch (error) {
      if (error.code === 'ResourceConflictException') {
        await lambda.updateFunctionCode({
          FunctionName: functionName,
          ZipFile: zipFile
        }).promise();
        
        await lambda.updateFunctionConfiguration({
          FunctionName: functionName,
          Timeout: lambdaParams.Timeout,
          Environment: lambdaParams.Environment
        }).promise();
        
        console.log(`Lambda function ${functionName} updated`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error deploying Lambda function:`, error);
  }
}

// Function to create or update API Gateway
async function deployApiGateway() {
  const apiName = 'LocalStackDemoAPI';
  const hostIP = await getHostIP();

  try {
    const apis = await apigateway.getRestApis().promise();
    let api = apis.items.find(item => item.name === apiName);

    if (!api) {
      api = await apigateway.createRestApi({ name: apiName }).promise();
      console.log(`API Gateway ${apiName} created`);
    }

    const apiGatewayConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));

    // Update the localProduct integration URI with the host IP
    // if (apiGatewayConfig.paths['/localProduct']) {
    //   apiGatewayConfig.paths['/localProduct'].get['x-amazon-apigateway-integration'].uri = `http://${hostIP}:3002/localProduct`;
    // }

    await apigateway.putRestApi({
      restApiId: api.id,
      mode: 'overwrite',
      body: JSON.stringify(apiGatewayConfig)
    }).promise();
    console.log(`API Gateway ${apiName} updated`);

    await apigateway.createDeployment({
      restApiId: api.id,
      stageName: 'prod',
      variables: {
        hostIP: hostIP
      }
    }).promise();
    console.log(`API Gateway ${apiName} deployed to stage 'prod'`);

    console.log(`API Gateway URL: http://${api.id}.execute-api.localhost.localstack.cloud:4566/prod`);
  } catch (error) {
    console.error('Error deploying API Gateway:', error);
  }
}

// Main function to run the deployment
async function deploy() {
  try {
    await deployLambda();
    await deployApiGateway();
    console.log('Deployment completed successfully');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deploy();