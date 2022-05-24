const Observable =  require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

class Garden extends Observable {
    constructor (name, floor, doors_to, grass_areas, connected_areas, grass_height, ground_slope) {
        let init = {name: name, floor: floor, doors_to: doors_to, grass_areas: grass_areas, 
            connected_areas: connected_areas, grass_height: grass_height, ground_slope: ground_slope} // TODO: remove ground_slope?
        super(init)
    }
}

module.exports = Garden