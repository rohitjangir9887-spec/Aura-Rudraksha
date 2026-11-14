// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../context/ToastContext';
import { CartProvider } from '../../hooks/useCart';
import { App } from '../../App';

const SAMPLE_PRODUCT = {
  id: 'prod-7-mukhi',
  _id: '670000000000000000000007',
  slug: 'buy-original-7-mukhi-rudraksha-nepali-online-lab-certified',
  name: '7 Mukhi Nepali Rudraksha',
  price: 2100,
  mrp: 3500,
  mukhi: 7,
  category: 'Rudraksha',
  origin: 'Nepal',
  stock: 15,
  status: 'Active',
  showOnHome: true,
  isPopular: true,
  img: 'https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png',
  images: ['https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png'],
  description: 'Original Lab Certified 7 Mukhi Nepali Rudraksha bead.',
  variants: ['Nepali Original'],
  sizes: [{ size: '18mm', price: 2100, mrp: 3500, isDefault: true }]
};

describe('App Routes Render Smoke Test (ErrorBoundary Reproduction)', () => {
  let container;
  let root;
  let capturedWarnings = [];
  let capturedErrors = [];
  let origWarn;
  let origError;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    localStorage.clear();
    sessionStorage.clear();

    origWarn = console.warn;
    origError = console.error;
    capturedWarnings = [];
    capturedErrors = [];
    console.warn = (...args) => {
      capturedWarnings.push(args.map(a => String(a?.stack || a?.message || a)).join(' '));
    };
    console.error = (...args) => {
      capturedErrors.push(args.map(a => String(a?.stack || a?.message || a)).join(' '));
    };

    if (!window.matchMedia) {
      window.matchMedia = () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      });
    }
    if (!window.IntersectionObserver) {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
    if (!window.ResizeObserver) {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
    window.scrollTo = () => {};

    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      let body = { success: true, data: [] };
      if (u.includes('/api/categories')) {
        body = { success: true, data: [{ id: 'rudraksha', name: 'Rudraksha', desc: 'Authentic beads', link: '/shop?category=Rudraksha' }] };
      } else if (u.includes('/api/settings')) {
        body = { success: true, data: { freeShippingThreshold: 0 } };
      } else if (u.includes('/api/products/')) {
        body = { success: true, data: SAMPLE_PRODUCT };
      } else if (u.includes('/api/products')) {
        body = { success: true, data: [SAMPLE_PRODUCT] };
      } else if (u.includes('/api/home-data')) {
        body = { success: true, products: [SAMPLE_PRODUCT], banners: [], offers: [], settings: { freeShippingThreshold: 0 }, reviews: [], coupons: [] };
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    console.warn = origWarn;
    console.error = origError;
    vi.restoreAllMocks();
  });

  const routesToTest = [
    '/',
    '/shop',
    '/wishlist',
    '/product/buy-original-7-mukhi-rudraksha-nepali-online-lab-certified',
    '/cart',
    '/checkout',
    '/payment-result?status=success&mode=cod&orderId=ORD_TEST_1',
    '/payment/result?status=failed&orderId=ORD_TEST_2',
    '/login',
    '/signup',
    '/forgot-password',
    '/account',
    '/account/profile',
    '/account/orders',
    '/account/orders/ORD_TEST_1',
    '/shipping-policy',
    '/return-policy',
    '/privacy-policy',
    '/terms',
    '/about',
    '/track-order',
    '/categories',
    '/wholesale',
    '/contact',
    '/aura-ai',
    '/mobile-design',
    '/rudraksha',
    '/rudraksha/7-mukhi',
    '/rudraksha-calculator',
    '/how-to-wear-rudraksha',
    '/verify-certificate',
    '/japa',
    '/compare',
    '/pran-pratishtha',
    '/vedic-tools',
    '/admin/login',
    '/some-unknown-route-404'
  ];

  for (const route of routesToTest) {
    it(`renders ${route} cleanly without ErrorBoundary`, async () => {
      capturedWarnings = [];
      capturedErrors = [];
      await act(async () => {
        root = createRoot(container);
        root.render(
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </ToastProvider>
          </MemoryRouter>
        );
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });

      const html = container.innerHTML;
      const boundaryHit = html.includes('We encountered a temporary display issue with this view');
      const caughtBoundaryLogs = capturedWarnings.filter(w => w.includes('Aura Rudraksha handled UI exception'));
      if (boundaryHit || caughtBoundaryLogs.length > 0) {
        throw new Error(`ErrorBoundary triggered on ${route}!\nWarnings: ${caughtBoundaryLogs.join('\n')}\nErrors: ${capturedErrors.join('\n')}`);
      }
      expect(boundaryHit).toBe(false);
    });
  }

  it('renders /checkout with populated cart & buy-now intent cleanly without ErrorBoundary', async () => {
    localStorage.setItem('aura_cart', JSON.stringify([{ id: SAMPLE_PRODUCT.id, qty: 1, price: SAMPLE_PRODUCT.price, name: SAMPLE_PRODUCT.name }]));
    sessionStorage.setItem('aura_buy_now_intent', JSON.stringify([{ id: SAMPLE_PRODUCT.id, productId: SAMPLE_PRODUCT.id, qty: 1, price: SAMPLE_PRODUCT.price, name: SAMPLE_PRODUCT.name, img: SAMPLE_PRODUCT.img }]));
    await act(async () => {
      root = createRoot(container);
      root.render(
        <MemoryRouter initialEntries={['/checkout']}>
          <ToastProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    const html = container.innerHTML;
    expect(html.includes('We encountered a temporary display issue with this view')).toBe(false);
  });

  it('renders /payment-result with confirmed order cached cleanly without ErrorBoundary', async () => {
    sessionStorage.setItem('aura_last_confirmed_order', JSON.stringify({
      id: 'ORD_CONFIRMED_99',
      orderNumber: 'ORD_CONFIRMED_99',
      status: 'Confirmed',
      paymentStatus: 'Paid',
      paymentMethod: 'COD',
      total: 2100,
      subtotal: 2100,
      customer: { name: 'Devotee Test', email: 'test@example.com', phone: '9876543210' },
      items: [{ id: SAMPLE_PRODUCT.id, name: SAMPLE_PRODUCT.name, price: 2100, qty: 1, img: SAMPLE_PRODUCT.img }]
    }));
    await act(async () => {
      root = createRoot(container);
      root.render(
        <MemoryRouter initialEntries={['/payment-result?status=success&mode=cod&orderId=ORD_CONFIRMED_99']}>
          <ToastProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    const html = container.innerHTML;
    expect(html.includes('We encountered a temporary display issue with this view')).toBe(false);
    expect(html.includes('ORD_CONFIRMED_99')).toBe(true);
  });
});
