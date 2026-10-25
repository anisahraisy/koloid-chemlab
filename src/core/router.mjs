/**
 * @file router.mjs
 * Lightweight Hash Router with lifecycle hooks (mount/unmount) for modules.
 */

export class Router {
  constructor(routes, containerId = 'main-content') {
    this.routes = routes;
    this.container = document.getElementById(containerId);
    this.currentView = null;
    this.currentRoute = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    this.handleRoute();
  }

  navigate(hash) {
    if (window.location.hash === hash) {
      this.handleRoute();
    } else {
      window.location.hash = hash;
    }
  }

  handleRoute() {
    let hash = window.location.hash || '#/matrix';
    if (!this.routes[hash]) {
      hash = '#/matrix';
    }

    if (this.currentRoute === hash && this.currentView) {
      return;
    }

    // Unmount existing view
    if (this.currentView && typeof this.currentView.unmount === 'function') {
      try {
        this.currentView.unmount();
      } catch (err) {
        console.error('Error unmounting view:', err);
      }
    }

    this.currentRoute = hash;

    // Update navigation active states
    this.updateNavLinks(hash);

    // Empty container
    if (this.container) {
      this.container.innerHTML = '';
      this.container.scrollTop = 0;
    }

    // Mount new view
    const viewFactory = this.routes[hash];
    if (viewFactory) {
      try {
        this.currentView = viewFactory();
        if (this.currentView && typeof this.currentView.mount === 'function') {
          this.currentView.mount(this.container);
        }
      } catch (err) {
        console.error('Error mounting view for ' + hash + ':', err);
      }
    }
  }

  updateNavLinks(activeHash) {
    // Both rail and bottom bar
    const links = document.querySelectorAll('[data-route]');
    for (const link of links) {
      const route = link.getAttribute('data-route');
      if (route === activeHash) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    }
  }
}
