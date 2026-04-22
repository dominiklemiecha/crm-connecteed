export interface EnvironmentConfig {
  logging: boolean;
  syncDatabase: boolean;
  corsOrigin: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    logging: true,
    syncDatabase: true,
    corsOrigin: 'http://localhost:5173',
  },
  staging: {
    logging: true,
    syncDatabase: false,
    corsOrigin: 'https://staging.connecteed.it',
  },
  production: {
    logging: false,
    syncDatabase: false,
    corsOrigin: 'https://app.connecteed.it',
  },
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.APP_ENV || 'development';
  return environments[env] || environments.development;
}
