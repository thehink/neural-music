require("babel-core/register");
require("babel-polyfill");

import 'normalize.css';
import './styles/header.scss';
import './styles/main.scss';

import App from './App';

let LOADED = false;

/**
 * Bootstrap the application on load.
 *
 * @return {void}
 */
function bootstrap () {
  // We don't want to load our application twice.
  if (LOADED) {
    return;
  }

  LOADED = true;

  if(window.app){
    window.app.dispose();
  }

  window.app = new App();

  console.log('The application has been loaded.');

  // When the application is loaded we remove the event listeners.
  document.removeEventListener('DOMContentLoaded', bootstrap);
  window.removeEventListener('load', bootstrap);
}

// We setup two listeners for better browser support.
document.addEventListener('DOMContentLoaded', bootstrap);
window.addEventListener('load', bootstrap);

if (module.hot) {
  bootstrap();
  module.hot.accept();
}
