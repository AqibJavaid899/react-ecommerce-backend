"use strict";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    // Extracting all the data from the Strapi Request Body
    const { products, userName, email } = ctx.request.body;

    try {
      // Constructing the LineItems object that the Stripe require to display the Item, Price, and Total Price on Checkout page
      const lineItems = await Promise.all(
        products.map(async (product) => {
          // Retrieving Item Information from the Item  Model
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      // Creating a Stripe Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });

      // Creating the Order instance in the Strapi Order Model
      await strapi.service("api::order.order").create({
        data: {
          userName,
          products,
          stripeSessionId: session.id,
        },
      });

      // Returning the Session Id to the Frontend as part of the POST Order API Response
      return {
        id: session.id,
      };
    } catch (error) {
      ctx.response.status = 500;
      return {
        error: { message: error.message },
      };
    }
  },
}));
