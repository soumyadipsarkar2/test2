const h3 = require('h3-js');
const Restaurant = require('../models/restaurant');
const fs = require('fs');
const geolib = require('geolib'); // For distance calculation

const H3_RESOLUTION = 8;

function saveRestaurantGridToFile(grid, state, range) {
  const filePath = `${state}_${range}.json`;
  fs.writeFileSync(filePath, JSON.stringify(grid, null, 2), 'utf8');
}

function getNearbyBlocks(center, radius) {
  return h3.gridDisk(center, radius);
}

const precalculateNearbyRestaurants = async (req, res) => {
  try {
    const state = req.query.state;
    const restaurants = await Restaurant.find({ 'address.state': state });
    const grids = {
      '0-5': {},
      '5-10': {},
      '10-30': {}
    };

    for (const restaurant of restaurants) {
    const restaurantH3Cell = h3.latLngToCell(restaurant.address.latitude, restaurant.address.longitude, H3_RESOLUTION);

    // 0-5 km range
    const nearbyBlocks5 = getNearbyBlocks(restaurantH3Cell, 5);
    const nearbyBlocks10 = getNearbyBlocks(restaurantH3Cell, 10);
    const nearbyBlocks30 = getNearbyBlocks(restaurantH3Cell, 30);
    
    cnt1=0;
    nearbyBlocks5.forEach(block => {
      const coordinates=h3.cellToLatLng(block);
      const distance = h3.greatCircleDistance(
        [restaurant.address.latitude, restaurant.address.longitude],
        h3.cellToLatLng(block),
        'km'
      );
      if(distance>5)cnt1++;
      if (distance <= 5) {
        grids['0-5'][block] = grids['0-5'][block] || [];
        grids['0-5'][block].push({ id: restaurant._id.toString(), distance,coordinates });
      }
    });
    console.log(cnt1,"cnt1");

    // 5-10 km range
    const nearbyBlocks5_10 = nearbyBlocks10.filter(element => !nearbyBlocks5.includes(element));
    cnt2=0;
    nearbyBlocks5_10.forEach(block => {
      const coordinates=h3.cellToLatLng(block);
      const distance = h3.greatCircleDistance(
        [restaurant.address.latitude, restaurant.address.longitude],
        h3.cellToLatLng(block),
        'km'
      );
      if (distance > 5 && distance <= 10) {
        grids['5-10'][block] = grids['5-10'][block] || [];
        grids['5-10'][block].push({ id: restaurant._id.toString(), distance,coordinates });
      }if(distance<=5) cnt2++;
    });
    console.log(cnt2,"cnt2");

    // 10-30 km range
    const nearbyBlocks10_30 = nearbyBlocks30.filter(element => !nearbyBlocks10.includes(element));
    cnt3=0;
    nearbyBlocks10_30.forEach(block => {
      const coordinates=h3.cellToLatLng(block);
      const distance = h3.greatCircleDistance(
        [restaurant.address.latitude, restaurant.address.longitude],
        h3.cellToLatLng(block),
        'km'
      );
      if(distance<=10)cnt3++;
      if (distance > 10 && distance <= 30) {
        grids['10-30'][block] = grids['10-30'][block] || [];
        grids['10-30'][block].push({ id: restaurant._id.toString(), distance,coordinates });
      }
    });
    console.log(cnt3,"cnt3");
    }

    saveRestaurantGridToFile(grids['0-5'], state, '0-5');
    saveRestaurantGridToFile(grids['5-10'], state, '5-10');
    saveRestaurantGridToFile(grids['10-30'], state, '10-30');
    res.status(200).json({ message: 'Precalculation completed successfully' });
  } catch (error) {
    console.error('Error during precalculation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  precalculateNearbyRestaurants
};