/**
 * Component loader utility for loading HTML partials
 */

export async function loadComponent(selector, filePath = null) {
  const element = document.querySelector(selector);
  if (!element) return;
  
  const sourceFile = filePath || element.getAttribute('data-source');
  if (!sourceFile) return;
  
  try {
    const baseUrl = window.location.origin + '/api/preview-6896c1eb0da21718c4373b9f/';
    const response = await fetch(baseUrl + sourceFile);
    if (response.ok) {
      const html = await response.text();
      element.innerHTML = html;
      
      // Initialize any event listeners for the loaded component
      initializeComponentEvents(element);
    }
  } catch (error) {
    console.error('Error loading component:', error);
  }
}

function initializeComponentEvents(container) {
  // Mobile menu toggle
  const mobileMenuBtn = container.querySelector('#mobile-menu-btn');
  const mobileNav = container.querySelector('#mobile-nav');
  
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
      const icon = mobileMenuBtn.querySelector('i');
      const isOpen = !mobileNav.classList.contains('hidden');
      
      if (isOpen) {
        icon.setAttribute('data-lucide', 'x');
      } else {
        icon.setAttribute('data-lucide', 'menu');
      }
      
      // Re-initialize lucide icons
      lucide.createIcons();
    });
  }
}