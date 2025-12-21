/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App'; // Assuming App.tsx or App.js is in src
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);
