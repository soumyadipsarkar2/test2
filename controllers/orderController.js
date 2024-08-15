// controllers/orderController.js
const Order = require('../models/order');
const FoodItem = require('../models/foodItem');
const Restaurant = require('../models/restaurant');
const mbxClient = require('@mapbox/mapbox-sdk');
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const { calculateOfferAmount } = require('./offerController');
const mapboxClient = mbxClient({ accessToken: 'pk.eyJ1Ijoic291bXlhZGlwc2Fya2FyIiwiYSI6ImNseWN6OHNzazAwcHkybXF5NWd2b3N0MTUifQ.Utd-JffEznqet-j2GKNX7g' });
const directionsClient = mbxDirections(mapboxClient);
const { v4: uuidv4 } = require('uuid');
const CachedData = require('../models/cachedData');

/**
 * Calculates distance between two sets of coordinates using Mapbox Directions API.
 * @param {Array} start - [longitude, latitude] for the start location.
 * @param {Array} end - [longitude, latitude] for the end location.
 * @returns {Promise<number>} - Distance in kilometers.
 */
const calculateDistance = async (start, end) => {
  try {
    const response = await directionsClient.getDirections({
      profile: 'driving',
      waypoints: [
        { coordinates: start },
        { coordinates: end }
      ],
      geometries: 'geojson'
    }).send();

    // Extract distance and duration
    const distanceInMeters = response.body.routes[0].distance;
    const durationInSeconds = response.body.routes[0].duration;

    // Convert distance to kilometers
    const distanceInKm = distanceInMeters / 1000;

    // Convert duration to minutes
    const durationInMinutes = (durationInSeconds / 60).toFixed(0);

    return {
      distanceInKm,
      durationInMinutes
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw new Error('Distance calculation failed');
  }
};

const calculateDeliveryCharges = (distance) => {
  // Define your delivery charge logic here
  return distance * 10; // Example: 10 currency units per km
};

const calculateGST = (totalCost) => {
  return totalCost * 0.18; // 18% GST
};

const createOrder2 = async (orderDetails, paymentDetails, cachedOrderId) => {
  const { items, restaurantId, deliveryPartnerTipped, offerIds, address, userId, deliveryInstructions, terms,placedOn } = orderDetails;
  const { paymentStatus, status, paymentId, timestamp } = paymentDetails;

  // Fetch charges from cache or calculate if not present
  const cacheKey = `charges#${userId}#${restaurantId}`;
  let cachedChargesData = await CachedData.findOne({ key: cacheKey });
  if(cachedChargesData){cachedChargesData=cachedChargesData.value;}
  let charges;
  
  if (cachedChargesData) {
    charges = JSON.parse(cachedChargesData);
  } else {
    charges = await calculateCharges2({ items, restaurantId, deliveryPartnerTipped, offerIds, address, userId });
  }

  const newOrder = {
    items,
    status,
    restaurantId,
    userId,
    deliveryPartnerTipped,
    paymentStatus,
    paymentId,
    deliveryFees: charges.deliveryFees,
    gstCharges: charges.gstCharges,
    total: charges.total,
    totalDiscounted: charges.totalDiscounted,
    totalSavings: charges.discount,
    placedOn,
    address,
    terms,
    extraCharges: charges.extraCharges,
    offerIds,
    statusTime: {
      placed: placedOn,
      success: paymentStatus === 'success' ? timestamp : null,
      failed: paymentStatus === 'failed' ? timestamp : null,
      processing: paymentStatus === 'processing' ? timestamp : null,
    },
    deliveryInstructions,
    deliveryPartnerId: "vsdvsvsvd",
    cachedOrderId // Store the cached order ID
  };

  // Save the order and return it
  const savedOrder = await Order.create(newOrder);
  return savedOrder;
};

const createOrder = async (req, res) => {
  try {
    const { items, restaurantId, deliveryPartnerTipped, offerIds, address, userId, deliveryInstructions, terms } = req.body;

    const orderId = uuidv4(); // Generate a unique order ID
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp for the order placement

    const orderData = {
      items,
      restaurantId,
      deliveryPartnerTipped,
      offerIds,
      address,
      userId,
      deliveryInstructions,
      terms,
      placedOn: timestamp // Add the placement time
    };

    const cacheKey = `orderData#${orderId}`;
    await CachedData.create({ key: cacheKey, value: JSON.stringify(orderData) });

    res.status(201).json({ message: 'Order data cached successfully', orderId });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Read (Get) all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json({ message: 'Orders retrieved successfully', data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Read (Get) an order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found', data: null });
    res.status(200).json({ message: 'Order retrieved successfully', data: order });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const getPastOrdersByUserId = async (req, res) => {
  const userId = req.query.userId;
  try {
    console.log("vsdvs sdvsdv sdv dsv sdv dsv dsv sdv",req.query.userId);
    sort = {'completionTime': -1};
    const orders = await Order.find({ userId,status:{ $in: ["delivered","cancelled"] }}).sort(sort);
    res.status(200).json({ message: 'Orders retrieved successfully', data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const getOrdersByUserId = async (req, res) => {
  const userId = req.query.userId;
  try {
    sort = {'placedOn': -1};
    const orders = await Order.find({userId}).sort(sort);
    res.status(200).json({ message: 'Booking retrieved successfully', data: orders });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Update an order by ID
const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found', data: null });
    res.status(200).json({ message: 'Order updated successfully', data: updatedOrder });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  console.log('svvsvsv',orderId,status);
  // Validate input
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const timestamp = Math.floor(Date.now()/1000);
  try {
    // Build the update object dynamically
    const update = {
        status,
        [`statusTime.${status}`]: timestamp,
    };

    // Find the order by ID and update the status and statusTime
    const result = await Order.findOneAndUpdate(
        { _id: orderId },
        { $set: update },
        { new: true, useFindAndModify: false }
    );

    if (!result) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ message: 'Status changed successfully', data: { statusTime: result.statusTime } });
  } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an order by ID
const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found', data: null });
    res.status(200).json({ message: 'Order deleted successfully', data: deletedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

const parseCoordinate = (value, digits) => {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
};

const calculateCharges2 = async ({ items, restaurantId, deliveryPartnerTipped, offerIds, address, userId }) => {
  const foodTotal = items.reduce((sum, item) => sum + item.price, 0);
  const gstCharges = (foodTotal * 0.18).toFixed(2);

  // Fetch restaurant location
  const restaurant = await Restaurant.findById(restaurantId);
  const roundedRestaurantLat = parseCoordinate(restaurant.location.coordinates[1],2);
  const roundedRestaurantLong = parseCoordinate(restaurant.location.coordinates[0],2);
  const roundedUserLat = parseCoordinate(address.latitude,2);
  const roundedUserLong = parseCoordinate(address.longitude,2);
  const cacheKey = `restaurant#${roundedRestaurantLat},${roundedRestaurantLong}#user#${roundedUserLat},${roundedUserLong}`;

  let cachedData = await CachedData.findOne({ key: cacheKey });
  if(cachedData){cachedData=cachedData.value;}
  let distanceData;

  if (cachedData) {
    distanceData = JSON.parse(cachedData);
  } else {
    const restaurantLocation = restaurant.location.coordinates; // [longitude, latitude]
    const userLocation = [address.longitude, address.latitude]; // [longitude, latitude]
    distanceData = await calculateDistance(restaurantLocation, userLocation);
    await CachedData.create({ key: cacheKey, value: JSON.stringify(distanceData) }); // Cache for 24 hours
  }

  const deliveryFees = calculateDeliveryCharges(distanceData.distanceInKm);
  const offerAmount = await calculateOfferAmount(offerIds);
  const total = foodTotal + parseFloat(gstCharges) + deliveryFees + deliveryPartnerTipped;
  const totalDiscounted = total - offerAmount;

  const charges = {
    total: parseFloat(total.toFixed(2)),
    totalDiscounted: parseFloat(totalDiscounted.toFixed(2)),
    deliveryFees: parseFloat(deliveryFees.toFixed(2)),
    gstCharges: parseFloat(gstCharges),
    extraCharges: 0,
    discount: parseFloat(offerAmount.toFixed(2)),
    distanceInKm: distanceData.distanceInKm,
    time: parseFloat(distanceData.durationInMinutes)
  };

  // Cache the charges result
  const chargesCacheKey = `charges#${userId}#${restaurantId}`;
  await CachedData.deleteOne({ key: chargesCacheKey });
  await CachedData.create({ key: chargesCacheKey, value: JSON.stringify(charges) }); // Cache for 24 hours

  return charges;
};

const calculateCharges = async (req, res) => {
  try {
    const charges = await calculateCharges2(req.body);
    res.status(200).json({ message: 'Charges calculated successfully', data: charges });
  } catch (error) {
    res.status(400).json({ message: error.message, data: null });
  }
};

// Function to cancel an order
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const timestamp = Math.floor(Date.now() / 1000);

    // Find and update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'cancelled',
        'statusTime.cancelled': timestamp,
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found', data: null });
    }

    // Optionally, add any additional logic here (e.g., notify the user, refund payments, etc.)

    res.status(200).json({ message: 'Order cancelled successfully', data: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message, data: null });
  }
};

// Helper function to calculate the price of addOns
const calculateAddOnsPrice = (addOns, foodItem) => {
  let addOnsPrice = 0;
  if (addOns && addOns.length > 0) {
    addOns.forEach(addOn => {
      const addOnGroup = foodItem.addOns.find(group => group.Name === addOn.groupName);
      if (addOnGroup) {
        addOnGroup.items.forEach(item => {
          if (item.name === addOn.name) {
            addOnsPrice += item.price;
          }
        });
      }
    });
  }
  return addOnsPrice;
};

const addToCart = async (req, res) => {
  const { userId, item, restaurantId } = req.body;

  if (!userId || !restaurantId || !item || typeof item !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const cartKey = `cart#${userId}`;
    
    // Fetch existing cart data from Redis
    let cachedCart = await CachedData.findOne({ key: cartKey });
    if (cachedCart) cachedCart = cachedCart.value;
    let cartData = cachedCart ? JSON.parse(cachedCart) : {};

    // Initialize cart data for the restaurant if not already present
    if (!cartData[restaurantId]) {
      cartData[restaurantId] = [];
    }

    // Find the food item by its ID
    const foodItem = await FoodItem.findById(item.foodItemId);
    if (!foodItem) {
      return res.status(404).json({ message: `Food item with ID ${item.foodItemId} not found` });
    }

    // Calculate the price of all add-ons
    const addOnsPrice = (item.addOns || []).reduce((total, addOn) => total + (addOn.price || 0), 0);
    const itemPrice = (foodItem.discountedCost || foodItem.actualCost || 0) + addOnsPrice;

    // Helper function to compare add-ons by category
    const addOnsMatch = (existingAddOns, newAddOns) => {
      if (existingAddOns.length !== newAddOns.length) return false;
      const existingGrouped = groupAddOnsByCategory(existingAddOns);
      const newGrouped = groupAddOnsByCategory(newAddOns);
      return JSON.stringify(existingGrouped) === JSON.stringify(newGrouped);
    };

    const groupAddOnsByCategory = (addOns) => {
      return addOns.reduce((acc, addOn) => {
        if (!acc[addOn.groupName]) acc[addOn.groupName] = [];
        acc[addOn.groupName].push(addOn.name);
        return acc;
      }, {});
    };

    // Check if the item with the same add-ons (grouped by category) already exists in the cart
    let existingItemIndex = cartData[restaurantId].findIndex(cartItem => 
      cartItem.foodItemId.toString() === item.foodItemId.toString() &&
      addOnsMatch(cartItem.addOns, item.addOns || [])
    );

    if (existingItemIndex > -1) {
      // If item exists, increase its quantity
      cartData[restaurantId][existingItemIndex].quantity += 1;
      cartData[restaurantId][existingItemIndex].price += itemPrice;
    } else {
      // Add the new item to the cart
      cartData[restaurantId].push({
        foodItemId: item.foodItemId,
        addOns: item.addOns || [],
        quantity: 1, // Add the item with quantity 1
        price: itemPrice
      });
    }

    // Update the cart in Redis without overriding the existing cart data
    await CachedData.updateOne(
      { key: cartKey },
      { value: JSON.stringify(cartData) },
      { upsert: true }
    );

    res.status(200).json({ message: 'Cart updated successfully', data: cartData });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const removeFromCart = async (req, res) => {
  const { userId, item, restaurantId } = req.body;

  if (!userId || !restaurantId || !item || typeof item !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const cartKey = `cart#${userId}`;

    // Fetch existing cart data from Redis
    let cachedCart = await CachedData.findOne({ key: cartKey });
    if (cachedCart) cachedCart = cachedCart.value;
    let cartData = cachedCart ? JSON.parse(cachedCart) : {};

    if (!cartData[restaurantId]) {
      return res.status(404).json({ message: `No items found in the cart for restaurant ID ${restaurantId}` });
    }

    // Helper function to compare add-ons by category
    const addOnsMatch = (existingAddOns, newAddOns) => {
      if (existingAddOns.length !== newAddOns.length) return false;
      const existingGrouped = groupAddOnsByCategory(existingAddOns);
      const newGrouped = groupAddOnsByCategory(newAddOns);
      return JSON.stringify(existingGrouped) === JSON.stringify(newGrouped);
    };

    const groupAddOnsByCategory = (addOns) => {
      return addOns.reduce((acc, addOn) => {
        if (!acc[addOn.groupName]) acc[addOn.groupName] = [];
        acc[addOn.groupName].push(addOn.name);
        return acc;
      }, {});
    };

    // Find the item in the cart
    let existingItemIndex = cartData[restaurantId].findIndex(cartItem => 
      cartItem.foodItemId.toString() === item.foodItemId.toString() &&
      addOnsMatch(cartItem.addOns, item.addOns || [])
    );

    if (existingItemIndex > -1) {
      // Remove one quantity of the item
      if (cartData[restaurantId][existingItemIndex].quantity > 1) {
        cartData[restaurantId][existingItemIndex].quantity -= 1;
        cartData[restaurantId][existingItemIndex].price -= cartData[restaurantId][existingItemIndex].price / cartData[restaurantId][existingItemIndex].quantity;
      } else {
        // Remove the item if quantity is 1
        cartData[restaurantId].splice(existingItemIndex, 1);
      }
    } else {
      return res.status(404).json({ message: 'Item not found in the cart' });
    }

    // If no items left for the restaurant, delete the restaurant data
    if (cartData[restaurantId].length === 0) {
      delete cartData[restaurantId];
    }

    // If no restaurant data is left, delete the entire cart
    if (Object.keys(cartData).length === 0) {
      await CachedData.deleteOne({ key: cartKey });
    } else {
      // Update the cart in Redis
      await CachedData.updateOne(
        { key: cartKey },
        { value: JSON.stringify(cartData) },
        { upsert: true }
      );
    }

    res.status(200).json({ message: 'Item removed successfully', data: cartData });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get Cart Items API
const getCartItems = async (req, res) => {
  const { userId, restaurantId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const cartKey = `cart#${userId}`;
    let cartItems = await CachedData.findOne({ key: cartKey });
    if(cartItems){cartItems=cartItems.value;}

    if (cartItems) {
      let parsedCartItems;
      try {
        parsedCartItems = JSON.parse(cartItems);
      } catch (error) {
        return res.status(500).json({ message: 'Error parsing cart data', error: error.message });
      }

      // Ensure parsedCartItems is an object
      if (!parsedCartItems || typeof parsedCartItems !== 'object') {
        return res.status(200).json({ message: 'Cart is empty', data: {} });
      }

      if (restaurantId) {
        // Ensure the restaurantId exists in parsedCartItems
        if (parsedCartItems[restaurantId]) {
          const filteredItems = parsedCartItems[restaurantId];
          if (filteredItems.length === 0) {
            return res.status(200).json({ message: 'Cart is empty for this restaurant', data: { [restaurantId]: [] } });
          }
          return res.status(200).json({ message: 'Cart retrieved successfully', data: { [restaurantId]: filteredItems } });
        } else {
          return res.status(404).json({ message: `No items found for restaurant ID ${restaurantId}`, data: {} });
        }
      } else {
        // Return all restaurant items
        const allItems = parsedCartItems;
        if (!Object.keys(allItems).length) {
          return res.status(200).json({ message: 'Cart is empty', data: {} });
        }
        return res.status(200).json({ message: 'Cart retrieved successfully', data: allItems });
      }
    } else {
      return res.status(404).json({ message: 'Cart not found', data: {} });
    }
  } catch (error) {
    console.error('Error retrieving cart items:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getPastOrdersByUserId,
  getOrdersByUserId,
  updateOrderStatus,
  calculateCharges,
  cancelOrder,
  addToCart,
  getCartItems,
  createOrder2,
  removeFromCart
};