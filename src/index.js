import 'normalize.css';
import './styles/header.scss';
import './styles/main.scss';

import App from './App';

let app = new App();

if (module.hot) {
  module.hot.accept();
}
