import { Amplify } from 'aws-amplify';
import amplifyConfig from './amplifyconfiguration.json';

let configured = false;

export const configureAmplify = (): void => {
  if (configured) {
    return;
  }
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: amplifyConfig.aws_user_pools_id,
        userPoolClientId: amplifyConfig.aws_user_pools_web_client_id,
        identityPoolId: amplifyConfig.aws_cognito_identity_pool_id,
      },
    },
  });
  configured = true;
};
