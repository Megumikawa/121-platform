// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  // Configuration/Feature-switches:
  isDebug: true, // Controls debugging features
  showDebug: true, // Controls debugging features
  useAnimation: true, // Use animations and delays in the interface
  useServiceWorker: false, // Enable 'offline' support
  envName: '', // To highlight the environment used

  // APIs:
  url_121_service_api: 'https://test-vm.121.global/121-service/api',

  // Third-party tokens:
  ai_ikey: '',
  ai_endpoint: '',
};
