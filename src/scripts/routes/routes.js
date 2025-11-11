import HomePresenter from '../presenters/home-presenter';
import AddStoryPresenter from '../presenters/add-story-presenter';
import RegisterPage from '../pages/register/register-page';
import LoginPage from '../pages/login/login-page';

const routes = {
  '/': new HomePresenter(),
  '/register': new RegisterPage(),
  '/login': new LoginPage(),
  '/add-story': new AddStoryPresenter(),
};

export default routes;