import {
  defaultProducts,
  defaultBanners,
  defaultCoupons,
  defaultActiveOffer,
  defaultReviews,
  defaultOrders,
  defaultCustomers,
  defaultSettings
} from "./defaultData.js";

class InMemoryStore {
  constructor() {
    this.products = JSON.parse(JSON.stringify(defaultProducts));
    this.banners = JSON.parse(JSON.stringify(defaultBanners));
    this.coupons = JSON.parse(JSON.stringify(defaultCoupons));
    this.activeOffer = JSON.parse(JSON.stringify(defaultActiveOffer));
    this.offers = [
      {
        id: "OFF-1",
        title: "Flat 20% OFF",
        label: "Special Offer",
        description: "On All Rudraksha",
        buttonText: "Shop Now",
        link: "/shop",
        image: "https://i.ibb.co/xKN0T46x/file-00000000b33082088625dc1f759658a4.png",
        type: "Percentage",
        discountValue: 20,
        couponCode: "AURA20",
        shownOn: "Home Banner",
        status: "Active",
        order: 1
      },
      {
        id: "OFF-2",
        title: "Lab Tested & Certified",
        label: "100% Authentic",
        description: "Quality you can trust.",
        buttonText: "Shop Now",
        link: "/shop",
        image: "https://i.ibb.co/ymXRsrZk/file-0000000030c48208b839cd9a8978bb05.png",
        type: "Feature",
        discountValue: 0,
        couponCode: "",
        shownOn: "Home Banner",
        status: "Active",
        theme: "light",
        order: 2
      },
      {
        id: "OFF-3",
        title: "On Orders Above ₹1499",
        label: "Free Shipping",
        description: "Fast & Reliable delivery.",
        buttonText: "Shop Now",
        link: "/shop",
        image: "https://i.ibb.co/BVtGczcQ/file-00000000ee808211869df734ac614fe5.png",
        type: "Shipping",
        discountValue: 0,
        couponCode: "",
        shownOn: "Home Banner",
        status: "Active",
        theme: "light",
        order: 3
      }
    ];
    this.reviews = JSON.parse(JSON.stringify(defaultReviews));
    this.orders = JSON.parse(JSON.stringify(defaultOrders));
    this.customers = JSON.parse(JSON.stringify(defaultCustomers));
    this.settings = JSON.parse(JSON.stringify(defaultSettings));
    this.promotions = [];
    this.tickets = [];
    this.addresses = [];
    this.wishlist = [];
  }
}

export const inMemoryStore = new InMemoryStore();
