const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')

/**
 * @class Garden
 */
class Garden extends Observable {
    /**
     * @param {*} name Identifier of the garden
     * @param {*} floor Ground floor
     * @param {*} doors_to Openings to the garden
     * @param {*} grass_areas Grass locations like a grid
     * @param {*} connected_areas Connection between grass areas
     * @param {*} grass_height Height of the grass: 'tall' or 'short'
     * @param {*} ground_slope Slope of the ground for each grass area
     */
    constructor(name, floor, doors_to, grass_areas, connected_areas, grass_height, ground_slope) {
        let init = {
            name: name, floor: floor, doors_to: doors_to, grass_areas: grass_areas, connected_areas: connected_areas, 
            grass_height: grass_height, ground_slope: ground_slope, last_day_received_water: -2
        }
        super(init)
    }

    /**
     * Update the last day the garden has received water.
     */
    giveWater() {
        this.last_day_received_water = Clock.getTime().dd
    }
}

module.exports = Garden